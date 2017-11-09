#!/usr/bin/env node

// Basic modules.
const path = require('path');
const fs = require('fs');

// Database.
const database = require('./lib/database.js');

// Utils.
const moment = require('moment');
const bytes = require('bytes');
const disk = require('./lib/disk.js');
const archive = require('./lib/archive.js');

// Web server.
const express = require('express');
const bodyParser = require('body-parser');
const multer  = require('multer');

// Express midlewares.
const staticPublic = express.static(path.join(__dirname, 'public'));
const uploadMidleware =
    multer({
        dest: 'uploads/',
        limits: {
            fieldNameSize: 100
        }
    })
    .fields([
        { name: 'file', maxCount: 1 },
        { name: 'files', maxCount: 32}
    ]);

// Setup.
const SITE_ADDRESS = 'https://file.scotow.com';
const PORT = process.env.PORT || 5003;

const app = express();
app.set('trust proxy', true);
app.set('x-powered-by', false);
app.set('json spaces', '\t');
app.set('views', path.join(__dirname, 'templates'));
app.set('view engine', 'pug');

app.use(express.static(path.join(__dirname, 'public')));

app.get(/^\/((?:[a-zA-Z0-9]{6}|[a-z]+(?:-[a-z]+){2})(?:\+(?:[a-zA-Z0-9]{6}|[a-z]+(?:-[a-z]+){2}))*)$/, (req, res) => {
    Promise.all(req.params[0].split('+').map(alias => database.getFile(alias).then(checkFileExists)))
    .then(files => {
        switch(files.length) {
            case 0:
                res.status(404).json(buildError('An error has occured while fetching your file(s).'));
                break;
            case 1:
                if(booleanParamater(req.query.zip) || booleanParamater(req.query.archive)) {
                    sendArchive(res, files);
                } else {
                    const file = files[0];
                    if(file.type && (booleanParamater(req.query.display) || booleanParamater(req.query.d))) {
                        res.sendFile(file.path, { headers: { 'Content-Type': file.type, 'Content-Disposition': `inline; filename="helloworld.png"` } });
                    } else {
                        res.download(file.path, file.name);
                    }
                }
                break;
            default:
                sendArchive(res, files);
                break;
        }
    })
    .catch(error => res.status(404).json(buildError(error.message)));
});

app.get(/^\/(?:a|archives?)\/([a-zA-Z0-9]{6}|[a-z]+(?:-[a-z]+){2})$/, (req, res) => {
    database.getArchiveFiles(req.params[0])
    .then(files => Promise.all(files.map(file => checkFileExists(file).catch(() => null))))
    .then(files => {
        const existingFiles = files.filter(Boolean);
        if(existingFiles.length) {
            sendArchive(res, existingFiles);
        } else {
            res.status(404).json(buildError('All files of this archive have expired.'));
        }
    })
    .catch(error => res.status(404).json(buildError(error.message)));
});

function sendArchive(res, files) {
    archive.createZip(files)
    .then(archivePath => {
        res.download(archivePath, 'files.zip', error => {
            error && console.error('Error while uploading archive.', error, archivePath);
            fs.unlink(archivePath, error => error && console.error('Error while unlinking archive file.', error, archivePath));
        });
    })
    .catch(error => {
        console.error(error);
        res.status(404).json(buildError(error.message));
    });
}

app.post('/', bodyParser.urlencoded({ extended: false }), (req, res) => {
    // console.log('Downloading.');
    uploadMidleware(req, res, (error) => {
        if(error) {
            // console.log('Download error.');
            sendData(req, res, buildError('Invalid files submission.'), 400);
            return;
        }

        if(req.files) {
            handleFiles(req, res);
            // console.log('Downloaded.');
        } else if(req.body.drop) {
            if(booleanParamater(req.body.pretty)) {
                res.render('link', JSON.parse(req.body.drop));
            } else {
                res.type('json').send(req.body.drop);
            }
        } else {
            sendData(req, res, buildError('Invalid request.'), 404);
        }
    });
});

async function handleFiles(req, res) {
    if(!req.ip) {
        sendData(req, res, buildError('Invalid IP address.'), 400);
        return;
    }
    const filesForm = req.files;
    if(filesForm.files && filesForm.file) {
        sendData(req, res, buildError('Invalid files form.'), 400);
        return;
    }

    let files, singleFile;
    if(filesForm.file) {
        files = filesForm.file;
        singleFile = true;
    } else if(filesForm.files) {
        files = filesForm.files;
    } else {
        sendData(req, res, buildError('Invalid files form.'), 400);
        return;
    }

    if(await disk.freespace() < bytes('1GB')) {
        sendData(req, res, buildError('Server disk is full.'), 503);
        return;
    }

    const usage = await database.getUsage(req.ip);
    const quota = { count: 127, size: bytes('1GB') };
    const filesToHandle = [];
    const unhandledFiles = [];
    files.forEach((file, index) => {
        if(usage.count + index + 1 < quota.count && usage.size + file.size < quota.size) {
            filesToHandle.push(file);
            usage.count += 1; usage.size += file.size;
        } else {
            const fileError = buildError('You have exceeded your daily quota.');
            fileError.name = file.name;
            unhandledFiles.push(fileError);
        }
    });

    files = (await Promise.all(filesToHandle.map(file => handleFile(file, req.ip)))).concat(unhandledFiles);
    const data = {files: files};
    const validFiles = files.filter(file => file.status === 'success');
    if(validFiles.length > 1) {
        data.archive = await handleArchive(validFiles, req.ip);
    }
    validFiles.forEach(file => delete file.id);
    if(booleanParamater(req.body.pretty)) {
        res.render('links', data);
    } else {
        sendData(req, res, singleFile ? data.files[0] : data);
    }
}

async function handleFile(file, ip) {
    try {
        const [shortAlias, longAlias] = await Promise.all([database.generateAlias('files', 'short'), database.generateAlias('files', 'long')]);
        const id = await database.insertFile(ip, file.originalname, file.size, file.mimetype, shortAlias, longAlias);
        await moveToUpload(file.path, id);
        const expire = moment().add(1, 'days');
        return {
            status: 'success',
            id: id,
            info: {
                name: file.originalname,
                size: {
                    bytes: file.size,
                    readable: bytes(file.size)
                }
            },
            expire: {
                timestamp: expire.unix(),
                date: expire.toISOString(),
                remaining: expire.unix() - moment().unix()
            },
            alias: {
                short: shortAlias,
                long: longAlias
            },
            link: {
                short: `${SITE_ADDRESS}/${shortAlias}`,
                long: `${SITE_ADDRESS}/${longAlias}`
            }
        };
    } catch(error) {
        return buildError(error.message);
    }
}

async function handleArchive(files, ip) {
    try {
        const size = files.reduce((acc, cur) => acc + cur.info.size.bytes, 0);
        const [shortAlias, longAlias] = await Promise.all([database.generateAlias('archives', 'short'), database.generateAlias('archives', 'long')]);
        const id = await database.insertArchive(ip, size, shortAlias, longAlias);
        await Promise.all(files.map(file => database.addFileToArchive(id, file.id)));
        return {
            status: 'success',
            info: {
                size: {
                    bytes: size,
                    readable: bytes(size)
                }
            },
            alias: {
                short: shortAlias,
                long: longAlias
            },
            link: {
                short: `${SITE_ADDRESS}/a/${shortAlias}`,
                long: `${SITE_ADDRESS}/a/${longAlias}`
            }
        }
    } catch(error) {
        return buildError(error.message);
    }
}

function sendData(req, res, data, statusCode) {
    if(statusCode) res.status(statusCode);
    if(booleanParamater(req.query.short || req.body.short) ||
       booleanParamater(req.query.tiny || req.body.tiny) ||
       booleanParamater(req.query.s || req.body.s)) {
        res.send((data.files ? [...data.files, data.archive] : [data]).map(file => file.status === 'success' ? file.link.short : file.message).join('\n'));
    } else {
        res.json(data);
    }
}

function buildError(message, description) {
    const error = { status: 'error' };
    if(message) error.message = message;
    if(description) error.description = description;
    return error;
}

function moveToUpload(filePath, id) {
    if(!filePath) return Promise.reject(new Error('Invalid temporary file path.'));
    if(!id) return Promise.reject(new Error('Invalid file id.'));

    return new Promise((resolve, reject) => {
        fs.rename(filePath, `uploads/${id}`, error => {
            if(error) {
                reject(new Error('Impossible to move the uploaded file.'));
                return;
            }
            resolve();
        });
    });
}

function checkFileExists(file) {
    if(!file.id) return Promise.reject(new Error('Invalid file id.'));

    return new Promise((resolve, reject) => {
        file.path = path.join(__dirname, 'uploads', String(file.id));
        fs.access(file.path, fs.constants.R_OK, error => {
            if(error) {
                reject(new Error('File has expired.'));
                return;
            }
            resolve(file);
        });
    });
}

function booleanParamater(value) {
    if(!value) return false;
    const numberValue = Number(value);
    if(isNaN(numberValue)) return true;
    return !!numberValue;
}

database.connect()
.then((connection) => {
    console.log(`Connected to mySQL server (${connection.threadId}).`);
    app.listen(PORT, () => {
        console.log(`Server started on port ${PORT}.`);
    });
})
.catch((error) => {
    console.error(`Error connecting to mySQL: ${error.stack}`);
});
