function booleanParamater(value) {
    if(!value) return false;
    const numberValue = Number(value);
    if(isNaN(numberValue)) return true;
    return !!numberValue;
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

exports.booleanParamater = booleanParamater;
exports.sendData = sendData;
exports.buildError = buildError;
