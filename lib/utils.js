// Config.
const config = require('./config.js');

// Basic modules.
const path = require('path');
const fs = require('fs');

// Tools.
const QRCode = require('qrcode');

function checkFileExists(file) {
    if(!file.id) return Promise.reject(new Error('Invalid file id.'));

    return new Promise((resolve, reject) => {
        file.path = path.join(config.storage.path, String(file.id));
        fs.access(file.path, fs.constants.R_OK, error => {
            if(error) {
                reject(new Error('File has expired.'));
                return;
            }
            resolve(file);
        });
    });
}

function deleteFile(file) {
    if(!file) return Promise.reject(new Error('Invalid file. Deletion.'));
    if(!file.id && !file.path) return Promise.reject(new Error('Invalid file identifier. Deletion.'));
    if(!file.path) file.path = path.join(config.storage.path, String(file.id));

    return new Promise((resolve, reject) => {
        fs.access(file.path, fs.constants.F_OK, error => {
            if(error) {
                console.error('Error while deleting expired file. No access.', error);
                reject(error);
                return;
            }
            fs.unlink(file.path, error => {
                if(error) {
                    console.error('Error while deleting expired file. Unlink impossible.', error);
                    reject(error);
                } else {
                    resolve(file);
                }
            });
        });
    });
}

function displayFiles(req, res, data, statusCode = 200) {
    res.status(statusCode);
    if(isPretty(req) && !hasFlag(req, 'drop-upload')) {
        res.render('links', data.files ? data : { files: [data] });
    } else if(isShort(req)) {
        const files = data.files ? data.files : [data];
        if(data.archive) files.push(data.archive);
        res.send(files.map(file => file.status === 'success' ? file.link.short : file.message).join('\n'));
    } else if(hasFlag(req, 'qr')) {
        const file = data.archive ? data.archive : (data.files ? data.files[0] : data);
        if(file.status === 'success') {
            QRCode.toString(file.link.short, { type: hasFlag(req, 'utf8') ? 'utf' : 'terminal' })
            .then((qrCode) => { res.send(qrCode); })
            .catch(error => res.send('Error while generating QR code.'));
        } else {
            res.send(file.message);
        }
    } else {
        res.json(data);
    }
}

function displayData(req, res, data, statusCode = 200) {
    res.status(statusCode);
    res.json(data);
}

function displayError(req, res, error, statusCode = 400) {
    res.status(statusCode);
    if(isPretty(req) && !hasFlag(req, 'drop-upload')) {
        error.code = statusCode;
        res.render('error', error);
    } else if(isShort(req)) {
        res.send(error.message);
    } else {
        res.json(error);
    }
}

function buildError(message, description) {
    const error = { status: 'error' };
    if(message) error.message = message;
    if(description) error.description = description;
    return error;
}

function valueParameter(req, names) {
    if(!Array.isArray(names)) names = [names];
    for(let i = 0; i < names.length; i++) {
        const value = req.query[names[i]] || (req.body && req.body[names[i]]) || req.cookies[names[i]];
        if(value) return value;
    }
}

function booleanParameter(value) {
    if(!value) return false;
    const numberValue = Number(value);
    if(isNaN(numberValue)) return true;
    return !!numberValue;
}

function hasFlag(req, names) {
    if(!Array.isArray(names)) names = [names];
    return (
        names.some(name => booleanParameter(req.query[name])) ||
        !!(req.body && names.some(name => booleanParameter(req.body[name]))) ||
        names.some(name => booleanParameter(req.cookies[name]))
    );
}

function isShort(req) {
    return hasFlag(req, ['short', 'tiny', 's']);
}

function isPretty(req) {
    return hasFlag(req, ['pretty', 'web', 'readable']);
}

exports.checkFileExists = checkFileExists;
exports.deleteFile = deleteFile;
exports.displayFiles = displayFiles;
exports.displayData = displayData;
exports.displayError = displayError;
exports.buildError = buildError;
exports.valueParameter = valueParameter;
exports.booleanParameter = booleanParameter;
exports.isPretty = isPretty;
