// Imports.
const fs = require('fs');

// Utils.
const utils = require('../lib/utils.js');
const moment = require('moment');
const bytes = require('bytes');

// Database.
const database = require('../lib/database.js');

// Express.
const router = require('express').Router();

router.all(/^\/info\/([a-zA-Z0-9]{6}|[a-z]+(?:-[a-z]+){2})$/, (req, res) => {
    const alias = req.params[0];
    database.getInfo(alias)
    .then(file => {
        res.json(file);
        return;
        const info = {
            status: 'success',
            info: {
                name: file.name,
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
        }
    })
    .catch(error => utils.displayError(req, res, utils.buildError(error.message), 404));
});

module.exports = router;
