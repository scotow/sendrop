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
// const file = require('./lib/file.js');

// Web server.
const express = require('express');
const bodyParser = require('body-parser');
const multer  = require('multer');

// Express midlewares.
const staticPublic = express.static(path.join(__dirname, 'public'));
const uploadMidleware = multer({ dest: 'uploads/' }).fields([
    { name: 'file', maxCount: 1 },
    { name: 'files', maxCount: 32}
]);

// Setup.
const SITE_ADDRESS = 'https://dev.file.scotow.com';
const PORT = process.env.PORT || 5003;
const ALIAS_REGEX = {short: /^[a-zA-Z0-9]{6}$/, long: /^[a-z]+(-[a-z]+){2}$/};

const app = express();
app.set('trust proxy', true);
app.set('x-powered-by', false);
app.set('json spaces', '\t');
app.set('views', path.join(__dirname, 'templates'));
app.set('view engine', 'pug');

app.use(express.static(path.join(__dirname, 'public')));

app.get(/^\/((?:[a-zA-Z0-9]{6}|[a-z]+(?:-[a-z]+){2})(?:\+(?:[a-zA-Z0-9]{6}|[a-z]+(?:-[a-z]+){2}))*)$/, (req, res) => {
    const filePromises = req.params[0].split('+').map(file => {
        if(ALIAS_REGEX.short.test(file)) {
            return database.getFile('short', file).then(checkFileExists);
        } else if(ALIAS_REGEX.long.test(file)) {
            return database.getFile('long', file).then(checkFileExists);
        } else {
            return Promise.reject(new Error('Invalid file alias.'));
        }
    });

    Promise.all(filePromises)
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
                        res.sendFile(file.path, { headers: { 'Content-Type': 'image/png', 'Content-Disposition': `inline; filename="helloworld.png"` } });
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
    const archiveAlias = req.params[0];
    let archivePromise;
    if(ALIAS_REGEX.short.test(archiveAlias)) {
        archivePromise = database.getArchiveFiles('short', archiveAlias);
    } else if(ALIAS_REGEX.long.test(file)) {
        archivePromise = database.getArchiveFiles('long', archiveAlias);
    } else {
        archivePromise = Promise.reject(new Error('Invalid file alias.'));
    }

    archivePromise
    .then(files => {
        return Promise.all(files.map(file => checkFileExists(file).catch(() => null)))
    })
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
    console.log('Downloading.');
    uploadMidleware(req, res, (error) => {
        if(error) {
            console.log('Download error.');
            res.status(400).json(buildError('Upload error.'));
            return;
        }

        if(req.files) {
            handleFiles(req, res);
            console.log('Downloaded.');
        } else if(req.body.drop) {
            if(booleanParamater(req.body.pretty)) {
                res.render('link', JSON.parse(req.body.drop));
            } else {
                res.type('json').send(req.body.drop);
            }
        } else {
            res.sendStatus(404);
        }
    });
});

async function handleFiles(req, res) {
    if(!req.ip) {
        res.status(400).json(buildError('Invalid IP address.'));
        return;
    }
    const filesForm = req.files;
    if(filesForm.files && filesForm.file) {
        res.status(400).json(buildError('Invalid files form.'));
        return;
    }

    let files;
    if(filesForm.file) {
        files = filesForm.file;
    } else if(filesForm.files) {
        files = filesForm.files;
    } else {
        res.status(400).json(buildError('Invalid files form.'));
        return;
    }

    if(await disk.freespace() < bytes('1GB')) {
        res.json(buildError('Server disk is full.'));
        return;
    }

    const usage = await database.getUsage(req.ip);
    const quota = bytes('1GB');
    const filesToHandle = [];
    const unhandledFiles = [];
    for(let i = 0; i < files.length; i++) {
        if(usage.count + i + 1 < 32 && usage.size + file.size < quota) {
            filesToHandle.push(files[i]);
            usage.count += 1; usage.size += file.size;
        } else {
            const fileError = buildError('You have exceeded your daily quota.');
            fileError.name = files[i].name;
            unhandledFiles.push(fileError);
        }
    }

    files = (await Promise.all(filesToHandle.map(file => handleFile(file, req.ip)))).concat(unhandledFiles);
    const data = {files: files};
    const validFiles = files.filter(file => file.status === 'success');
    if(validFiles.length > 1) {
        data.archive = await handleArchive(validFiles, req.ip);
    }
    validFiles.forEach(file => delete file.id);
    if(booleanParamater(req.body.pretty)) {
        res.render('link', data);
    } else {
        res.json(data);
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
