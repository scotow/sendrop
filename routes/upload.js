// Setup.
const SITE_ADDRESS = process.env.ADDR || (process.env.DEV ? 'https://dev.file.scotow.com' : 'https://file.scotow.com');

// Imports.
// Basic modules.
const path = require('path');
const fs = require('fs');
const os = require('os');

// Utils.
const utils = require('../lib/utils.js');
const moment = require('moment');
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
        dest: path.join(os.tmpdir(), 'uploads'),
        limits: {
            fieldNameSize: 255
        }
    })
    .fields([
        { name: 'file', maxCount: 1 },
        { name: 'files', maxCount: 32}
    ]);


router.post('/', bodyParser.urlencoded({ extended: false }), (req, res) => {
    uploadMidleware(req, res, (error) => {
        if(error) {
            utils.displayError(req, res, utils.buildError('Invalid files submission.'), 400);
            return;
        }

        if(req.files) {
            handleFiles(req, res);
        } else if(req.body.drop) {
            utils.displayData(req, res, JSON.parse(req.body.drop));
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

    files = (await Promise.all(filesToHandle.map(file => handleFile(file, req.ip)))).concat(unhandledFiles);
    const data = {files: files};
    const validFiles = files.filter(file => file.status === 'success');
    if(validFiles.length > 1) {
        data.archive = await handleArchive(validFiles, req.ip);
    }
    validFiles.forEach(file => delete file.id);
    if(utils.booleanParamater(req.body.pretty)) {
        res.render('links', data);
    } else {
        utils.displayData(req, res, singleFile ? data.files[0] : data, 200);
    }
}

async function handleFile(file, ip) {
    try {
        const expire = file.size < bytes('64MB') ? moment().add(1, 'days') : moment().add(6, 'hours');
        const [shortAlias, longAlias, revokeToken] = await Promise.all([database.generateToken('files', 'short_alias'), database.generateToken('files', 'long_alias'), database.generateToken('files', 'revoke_token')]);
        const id = await database.insertFile(expire.unix(), ip, file.originalname, file.size, file.mimetype, shortAlias, longAlias, revokeToken);
        await moveToUpload(file.path, id);
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
            },
            revoke: {
                token: revokeToken,
                link: `${SITE_ADDRESS}/revoke/${shortAlias}/${revokeToken}`
            }
        };
    } catch(error) {
        return utils.buildError(error.message);
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
        return utils.buildError(error.message);
    }
}

function moveToUpload(filePath, id) {
    if(!filePath) return Promise.reject(new Error('Invalid temporary file path.'));
    if(!id) return Promise.reject(new Error('Invalid file id.'));

    return new Promise((resolve, reject) => {
        fs.rename(filePath, path.join(os.tmpdir(), 'uploads', String(id)), error => {
            if(error) {
                reject(new Error('Impossible to move the uploaded file.'));
                return;
            }
            resolve();
        });
    });
}

module.exports = router;
