// Express.
const router = require('express').Router();

router.all(/^\/(?:d|delete|r|revoke)\/([a-zA-Z0-9]{6}|[a-z]+(?:-[a-z]+){2})(?:\/[a-zA-Z0-9]{15})?$/, (req, res) => {
    const alias = req.params[0];
    const revokeToken = req.params[1] || req.query.d || req.query.delete || req.query.r || req.query.revoke;
    if(!revokeToken || revokeToken.test(/^[a-zA-Z0-9]{15}$/)) {
        utils.displayError(req, res, utils.buildError('Invalid or no revoke token found.', 400));
        return;
    }

    database.revokeFile(alias, revokeToken)
    .then(checkFileExists)
    .then(file => {
        utils.displayData(req, res, { status: 'success', message: 'The file has been successfully revoked.' }, 200);
    })
    .catch(error => utils.displayError(req, res, utils.buildError(error.message), 404));
});

module.exports = router;
