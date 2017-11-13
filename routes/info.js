// Config.
const config = require('../lib/config.js');

// Basic modules.
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
    database.getFileInfo(alias)
    .then(file => {
        const creation = moment(file.creation);
        const expiration = moment(file.expiration);
        if(!creation.isValid() || !expiration.isValid()) {
            utils.displayError(req, res, utils.buildError('Invalid creation of expiration date.'), 400);
            return;
        }

        utils.displayData(req, res, {
            status: 'success',
            info: {
                name: file.name,
                size: {
                    bytes: file.size,
                    readable: bytes(file.size)
                },
                type: file.type,
                link: `${config.site.address}/info/${file.short_alias}`
            },
            creation: {
                timestamp: creation.unix(),
                date: creation.toISOString()
            },
            expiration: {
                expired: expiration <= moment(),
                timestamp: expiration.unix(),
                date: expiration.toISOString(),
                remaining: expiration.unix() - moment().unix()
            },
            alias: {
                short: file.short_alias,
                long: file.long_alias
            },
            link: {
                short: `${config.site.address}/${file.short_alias}`,
                long: `${config.site.address}/${file.long_alias}`,
                display: `${config.site.address}/f/${file.short_alias}`
            },
            downloads: file.downloads
        });
    })
    .catch(error => utils.displayError(req, res, utils.buildError(error.message), 404));
});

module.exports = router;
