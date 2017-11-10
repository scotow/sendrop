// Imports.
// Basic modules.
const path = require('path');
const fs = require('fs');

// Utils.
const utils = require('../lib/utils.js');
const archive = require('../lib/archive.js');

// Database.
const database = require('../lib/database.js');

// Express.
const router = require('express').Router();

router.get(/^\/(?:(a|d|f|g|i|t|v|z)\/)?([a-zA-Z0-9]{6}|[a-z]+(?:-[a-z]+){2})$/, (req, res) => {
    const shortcut = req.params[0];
    const alias = req.params[1];
    if(shortcut === 'a' || shortcut === 'archive') {
        prepareArchive(res, alias);
    } else {
        database.getFile(alias)
        .then(checkFileExists)
        .then(file => {
            let type;
            switch(shortcut) {
                case 'f': case 'd':
                    type = file.type;
                    break;
                case 't':
                    type = 'text/plain';
                    break;
                case 'i':
                    type = 'image';
                    break;
                case 'g':
                    type = 'image/gif';
                    break;
                case 'v':
                    type = 'video';
                    break;
                case 'z':
                    sendArchive(res, file);
                    return;
                default:
                    res.download(file.path, file.name);
                    return;
            }
            res.sendFile(file.path, { headers: { 'Content-Type': type, 'Content-Disposition': `inline; filename="${file.name}"` } });
        })
        .catch(error => utils.displayError(req, res, utils.buildError(error.message), 404));
    }
});

router.get(/^\/((?:[a-zA-Z0-9]{6}|[a-z]+(?:-[a-z]+){2})(?:\+(?:[a-zA-Z0-9]{6}|[a-z]+(?:-[a-z]+){2}))+)$/, (req, res) => {
    Promise.all(req.params[0].split('+').map(alias => database.getFile(alias).then(checkFileExists)))
    .then(files => {
        if(files.length) {
            sendArchive(res, files);
        } else {
            utils.displayError(req, res, utils.buildError('An error has occured while fetching your file(s).'), 404);
        }
    })
    .catch(error => utils.displayError(req, res, utils.buildError(error.message), 404));
});

function prepareArchive(res, alias) {
    database.getArchiveFiles(alias)
    .then(files => Promise.all(files.map(file => checkFileExists(file).catch(() => null))))
    .then(files => {
        const existingFiles = files.filter(Boolean);
        if(existingFiles.length) {
            sendArchive(res, existingFiles);
        } else {
            utils.displayError(req, res, utils.buildError('All files of this archive have expired.'), 404);
        }
    })
    .catch(error => utils.displayError(req, res, utils.buildError(error.message), 404));
}

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
        utils.displayError(req, res, utils.buildError(error.message), 404);
    });
}

function checkFileExists(file) {
    if(!file.id) return Promise.reject(new Error('Invalid file id.'));

    return new Promise((resolve, reject) => {
        file.path = path.join(__dirname, '..', 'uploads', String(file.id));
        fs.access(file.path, fs.constants.R_OK, error => {
            if(error) {
                reject(new Error('File has expired.'));
                return;
            }
            resolve(file);
        });
    });
}

module.exports = router;
