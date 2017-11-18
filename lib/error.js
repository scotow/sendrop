const ERRORS = {
    403: 'Forbidden',
    404: 'Not found',
    413: 'Request entity too large',
    503: 'Service unavailable'
};

function fromCode(code) {
    return { code: code, message: (ERRORS[code] || 'Error') };
}

// function render(res, code) {
//     if(ERRORS[code]) {
//         res.render('error', { code: String(code), label: ERRORS[code] });
//     } else {
//         res.statusCode(code);
//     }
// }

exports.fromCode = fromCode;
// exports.render = render;
