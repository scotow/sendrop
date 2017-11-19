// Config.
const config = require('../lib/config.js');

// Imports.
// Basic modules.
const path = require('path');
const fs = require('fs');

// Utils.
const utils = require('../lib/utils.js');
const moment = require('moment');
const ms = require('ms');
const bytes = require('bytes');
const disk = require('../lib/disk.js');

// Database.
const database = require('../lib/database.js');

// Express.
const router = require('express').Router();
const bodyParser = require('body-parser');
const multer = require('multer');

// Express midlewares.
const uploadMidleware =
    multer({
        dest: config.storage.path,
        limits: {
            fieldNameSize: 255
        }
    })
    .fields([
        { name: 'file', maxCount: 1 },
        { name: 'files', maxCount: 32 }
    ]);


router.post('/', bodyParser.urlencoded({ extended: false }), (req, res) => {
    uploadMidleware(req, res, (error) => {
        if(error) {
            utils.displayError(req, res, utils.buildError('Invalid files submission.'), 400);
            return;
        }

        if(req.files) {
            handleFiles(req, res);
        } else if(req.body['drop-display']) {
            utils.displayFiles(req, res, JSON.parse(req.body['drop-display']));
        } else {
            utils.displayError(req, res, utils.buildError('Invalid request.'), 404);
        }
    });
});

async function handleFiles(req, res) {
    if(!req.ip) {
        utils.displayError(req, res, utils.buildError('Invalid IP address.'), 400);
        return;
    }
    const filesForm = req.files;
    if(filesForm.files && filesForm.file) {
        utils.displayError(req, res, utils.buildError('Invalid files form.'), 400);
        return;
    }

    let files, singleFile;
    if(filesForm.file) {
        files = filesForm.file;
        singleFile = true;
    } else if(filesForm.files) {
        files = filesForm.files;
    } else {
        utils.displayError(req, res, utils.buildError('Invalid files form.'), 400);
        return;
    }

    if(await disk.freespace() < bytes('1GB')) {
        utils.displayError(req, res, utils.buildError('Server disk is full.'), 503);
        return;
    }

    const usage = await database.getUsage(req.ip);
    const quota = { count: 127, size: bytes('1GB') };
    const filesToHandle = [];
    const unhandledFiles = [];
    files.forEach((file, index) => {
        if(usage.count + 1 < quota.count && usage.size + file.size < quota.size) {
            filesToHandle.push(file);
            usage.count += 1; usage.size += file.size;
        } else {
            const fileError = utils.buildError('You have exceeded your daily quota.');
            fileError.name = file.name;
            unhandledFiles.push(fileError);
        }
    });

    files = (await Promise.all(filesToHandle.map(file => handleFile(req, file)))).concat(unhandledFiles);
    const data = {files: files};
    const validFiles = files.filter(file => file.status === 'success');
    if(validFiles.length > 1) {
        data.archive = await handleArchive(req, validFiles);
    }
    validFiles.forEach(file => delete file.id);
    utils.displayFiles(req, res, singleFile ? data.files[0] : data);
}

async function handleFile(req, file) {
    try {
        const expiration = parseExpiration(req, file.size);
        const [shortAlias, longAlias, revokeToken] = await Promise.all([database.generateToken('files', 'short_alias'), database.generateToken('files', 'long_alias'), database.generateToken('files', 'revoke_token')]);
        const id = await database.insertFile(expiration.unix(), req.ip, file.originalname, file.size, file.mimetype, shortAlias, longAlias, revokeToken);
        await moveToUpload(file.path, id);
        scheduleDeletion(id, expiration - moment());
        const baseAddress = config.site.address === 'auto' ? `${req.protocol}://${req.hostname}` : config.site.address;
        return {
            status: 'success',
            id: id,
            info: {
                name: file.originalname,
                size: {
                    bytes: file.size,
                    readable: bytes(file.size)
                },
                type: file.mimetype,
                link: `${baseAddress}/info/${shortAlias}`
            },
            expiration: {
                timestamp: expiration.unix(),
                date: expiration.toISOString(),
                remaining: expiration.unix() - moment().unix()
            },
            alias: {
                short: shortAlias,
                long: longAlias
            },
            link: {
                short: `${baseAddress}/${shortAlias}`,
                long: `${baseAddress}/${longAlias}`,
                display: `${baseAddress}/f/${shortAlias}`
            },
            revoke: {
                token: revokeToken,
                link: `${baseAddress}/revoke/${shortAlias}/${revokeToken}`
            }
        };
    } catch(error) {
        return utils.buildError(error.message);
    }
}

function parseExpiration(req, size) {
    const maxExpiration = size < bytes('64MB') ? moment().add(1, 'days') : moment().add(6, 'hours');
    let expirationRequested = utils.valueParameter(req, ['expiration', 'time', 'delay']);
    if(expirationRequested) {
        let expirationMs = ms(expirationRequested) * (/^\d+$/.test(expirationRequested) ? 1000 : 1);
        if(expirationMs) {
            expirationRequested = moment().add(expirationMs, 'milliseconds');
            return maxExpiration < expirationRequested ? maxExpiration : expirationRequested;
        } else {
            return maxExpiration;
        }
    } else {
        return maxExpiration;
    }
}

async function handleArchive(req, files) {
    try {
        const size = files.reduce((acc, cur) => acc + cur.info.size.bytes, 0);
        const [shortAlias, longAlias] = await Promise.all([database.generateToken('archives', 'short_alias'), database.generateToken('archives', 'long_alias')]);
        const id = await database.insertArchive(req.ip, size, shortAlias, longAlias);
        await Promise.all(files.map(file => database.addFileToArchive(id, file.id)));
        const baseAddress = config.site.address === 'auto' ? `${req.protocol}://${req.hostname}` : config.site.address;
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
                short: `${baseAddress}/a/${shortAlias}`,
                long: `${baseAddress}/a/${longAlias}`
            }
        }
    } catch(error) {
        return utils.buildError(error.message);
    }
}

function moveToUpload(filePath, id) {
    if(!filePath) return Promise.reject(new Error('Invalid temporary file path.'));
    if(!id) return Promise.reject(new Error('Invalid file id.'));

    return new Promise((resolve, reject) => {
        fs.rename(filePath, path.join(config.storage.path, String(id)), error => {
            if(error) {
                reject(new Error('Impossible to move the uploaded file.'));
                return;
            }
            resolve();
        });
    });
}

function scheduleDeletion(id, delay) {
    setTimeout(() => {
        const filePath = path.join(config.storage.path, String(id));
        fs.access(filePath, fs.constants.F_OK, error => {
            if(error) {
                console.error('Error while deleting expired file. No access.', error);
                return;
            }
            fs.unlink(filePath, error => error && console.error('Error while deleting expired file. Unlink impossible.', error));
        });
    }, delay);
}

module.exports = router;
