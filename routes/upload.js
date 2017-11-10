const bodyParser = require('body-parser');
const multer = require('multer');

const utils = require('../lib/utils.js');
const router = require('express').Router();

router.post('/', bodyParser.urlencoded({ extended: false }), (req, res) => {
    // console.log('Downloading.');
    uploadMidleware(req, res, (error) => {
        if(error) {
            // console.log('Download error.');
            utils.sendData(req, res, utils.buildError('Invalid files submission.'), 400);
            return;
        }

        if(req.files) {
            handleFiles(req, res);
            // console.log('Downloaded.');
        } else if(req.body.drop) {
            if(utils.booleanParamater(req.body.pretty)) {
                res.render('links', JSON.parse(req.body.drop));
            } else {
                res.type('json').send(req.body.drop);
            }
        } else {
            utils.sendData(req, res, utils.buildError('Invalid request.'), 404);
        }
    });
});

async function handleFiles(req, res) {
    if(!req.ip) {
        utils.sendData(req, res, utils.buildError('Invalid IP address.'), 400);
        return;
    }
    const filesForm = req.files;
    if(filesForm.files && filesForm.file) {
        utils.sendData(req, res, utils.buildError('Invalid files form.'), 400);
        return;
    }

    let files, singleFile;
    if(filesForm.file) {
        files = filesForm.file;
        singleFile = true;
    } else if(filesForm.files) {
        files = filesForm.files;
    } else {
        utils.sendData(req, res, utils.buildError('Invalid files form.'), 400);
        return;
    }

    if(await disk.freespace() < bytes('1GB')) {
        utils.sendData(req, res, utils.buildError('Server disk is full.'), 503);
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
        utils.sendData(req, res, singleFile ? data.files[0] : data);
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
        fs.rename(filePath, path.join(__dirname, 'uploads', String(id)), error => {
            if(error) {
                reject(new Error('Impossible to move the uploaded file.'));
                return;
            }
            resolve();
        });
    });
}

module.exports = router;
