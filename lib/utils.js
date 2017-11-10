function booleanParamater(value) {
    if(!value) return false;
    const numberValue = Number(value);
    if(isNaN(numberValue)) return true;
    return !!numberValue;
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

function isShort(req) {
    let short;
    if(req.body) {
        short = booleanParamater(req.body.short) || booleanParamater(req.body.tiny) || booleanParamater(req.body.s);
    }
    return short || booleanParamater(req.query.short) || booleanParamater(req.query.tiny) || booleanParamater(req.query.s);
}

function isPretty(req) {
    return booleanParamater(req.query.pretty || (req.body ? req.body.pretty : false));
}

exports.booleanParamater = booleanParamater;
exports.displayData = displayData;
exports.displayError = displayError;
exports.buildError = buildError;
