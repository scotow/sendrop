const path = require('path');
const fs = require('fs');
const os = require('os');

function checkFileExists(file) {
    if(!file.id) return Promise.reject(new Error('Invalid file id.'));

    return new Promise((resolve, reject) => {
        file.path = path.join(os.tmpdir(), 'uploads', String(file.id));
        fs.access(file.path, fs.constants.R_OK, error => {
            if(error) {
                reject(new Error('File has expired.'));
                return;
            }
            resolve(file);
        });
    });
}

function displayData(req, res, data, statusCode = 200) {
    res.status(statusCode);
    if(isShort(req)) {
        res.send((data.files ? [...data.files, data.archive] : [data]).map(file => file.status === 'success' ? file.link.short : file.message).join('\n'));
    } else if(isPretty(req)) {
        res.render('links', data);
    } else {
        res.json(data);
    }
}

function displayError(req, res, error, statusCode = 400) {
    res.status(statusCode);
    if(isShort(req)) {
        res.send(error.message);
    } else if(isPretty(req)) {
        console.log('pretty');
        res.render('error', error);
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

function booleanParamater(value) {
    if(!value) return false;
    const numberValue = Number(value);
    if(isNaN(numberValue)) return true;
    return !!numberValue;
}

function hasFlag(req, names) {
    if(!Array.isArray(names)) names = [names];
    return names.some(name => booleanParamater(req.query[name])) || !!(req.body && names.some(name => booleanParamater(req.body[name])));
}

function isShort(req) {
    return hasFlag(req, ['short', 'tiny', 's']);
}

function isPretty(req) {
    return hasFlag(req, ['pretty', 'web', 'readable']);
}

exports.checkFileExists = checkFileExists;
exports.displayData = displayData;
exports.displayError = displayError;
exports.buildError = buildError;
exports.booleanParamater = booleanParamater;
