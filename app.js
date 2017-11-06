// Basic modules.
const path = require('path');
const fs = require('fs');

// Database.
const database = require('./lib/database.js');

// Utils.
const moment = require('moment');
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

app.get(/^\/(?:[a-zA-Z0-9]{6}|[a-z]+(?:-[a-z]+){2})(?:\+(?:[a-zA-Z0-9]{6}|[a-z]+(?:-[a-z]+){2}))*$/, (req, res) => {
    const filePromises = req.url.slice(1).split('+').map(file => {
        if(ALIAS_REGEX.short.test(file)) {
            return database.getFile('short', file).then((file) => checkFileExists(file));
        } else if(ALIAS_REGEX.long.test(file)) {
            return database.getFile('long', file).then((file) => checkFileExists(file));
        } else {
            return Promise.reject(new Error('A file or more wasn\'t found or have expired.'));
        }
    });

    Promise.all(filePromises)
    .then(files => {
        switch(files.length) {
            case 0:
                res.status(404).json(buildError('An error has occured while fetching your file(s).'));
                break;
            case 1:
                const file = files[0];
                res.download(file.path, file.name);
                break;
            default:
                archive.createZip(files)
                .then(archivePath => {
                    res.download(archivePath, 'files.zip', error => {
                        fs.unlink(archivePath, error => error && console.error('Error while unlinking archive file.', error, archivePath));
                    });
                })
                .catch(error => {
                    console.error(error);
                    res.status(404).json(buildError(error.message));
                });
                break;
        }
    })
    .catch(error => res.status(404).json(buildError(error.message)));
});

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
            if(isPretty(req.body.pretty)) {
                res.render('link', { files: JSON.parse(req.body.drop) });
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

    console.log(files);
    files = await Promise.all(files.map(file => handleFile(file, req.ip)));
    if(isPretty(req.body.pretty)) {
        res.render('link', { files: files });
    } else {
        res.json(files);
    }
}

async function handleFile(file, ip) {
    try {
        const [shortAlias, longAlias] = await Promise.all([database.generateAlias('files', 'short'), database.generateAlias('files', 'long')]);
        const id = await database.insertFile(ip, file.originalname, file.size, shortAlias, longAlias);
        await moveToUpload(file.path, id);
        const expire = moment().add(1, 'days');
        return {
            status: 'success',
            info: {
                name: file.originalname,
                size: {
                    bytes: file.size,
                    readable: formatBytes(file.size)
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
                reject('Impossible to move the uploaded file.');
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

function isPretty(pretty) {
    if(!pretty) return false;
    const numberValue = Number(pretty);
    if(isNaN(numberValue)) return true;
    return !!numberValue;
}

function formatBytes(bytes, decimals) {
    if(bytes == 0) return '0 Bytes';
    const k = 1024,
    dm = decimals || 2,
    sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'],
    i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
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
