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

router.get(/^\/(?:(a|archive|d|f|g|i|t|v|z)\/)?([a-zA-Z0-9]{6}|[a-z]+(?:-[a-z]+){2})$/, (req, res) => {
    const shortcut = req.params[0];
    const alias = req.params[1];
    if(shortcut === 'a' || shortcut === 'archive') {
        prepareArchive(res, alias);
    } else {
        database.getFile(alias)
        .then(utils.checkFileExists)
        .then(file => {
            let type;
            switch(shortcut) {
                case 'f':
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
                    res.download(file.path, file.name, error => filesDownloaded(error, file));
                    return;
            }
            res.sendFile(file.path, {
                headers: {
                    'Content-Type': type,
                    'Content-Disposition': `inline; filename="${file.name}"`
                }
            }, error => filesDownloaded(error, file));
        })
        .catch(error => utils.displayError(req, res, utils.buildError(error.message), 404));
    }
});

router.get(/^\/((?:[a-zA-Z0-9]{6}|[a-z]+(?:-[a-z]+){2})(?:\+(?:[a-zA-Z0-9]{6}|[a-z]+(?:-[a-z]+){2}))+)$/, (req, res) => {
    Promise.all(req.params[0].split('+').map(alias => database.getFile(alias).then(utils.checkFileExists)))
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
    .then(files => Promise.all(files.map(file => utils.checkFileExists(file).catch(() => null))))
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
            filesDownloaded(error, files);
            fs.unlink(archivePath, error => error && console.error('Error while unlinking archive file.', error, archivePath));
        });
    })
    .catch(error => {
        utils.displayError(req, res, utils.buildError(error.message), 404);
    });
}

function filesDownloaded(error, files) {
    if(error) {
        console.error('Error while uploading archive.', error, archivePath);
        return;
    }

    if(!Array.isArray(files)) files = [files];
    database.filesDownloaded(files.map(file => file.id))
    .catch(error => console.error('Error while updating files download count.', error));
}

module.exports = router;
