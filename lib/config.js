// Modules.
const fs = require('fs-extra');

const SENDROP_CONF_VERIFY = 'Please verify "SENDROP_CONF" environment variable.';

async function load() {
    // Check that file exists.
    if (!await fs.pathExists(process.env.SENDROP_CONF)) {
        throw new Error([
            'Sendrop configuration file could not be loaded.',
            SENDROP_CONF_VERIFY
        ].join('\n'));
    }

    // Load config file.
    let config;
    try {
        config = await fs.readJson(process.env.SENDROP_CONF);
    } catch (error) {
        throw new Error([
            'Invalid Sendrop configuration file.',
            SENDROP_CONF_VERIFY
        ].join('\n'));
    }

    verify(config, 'database', ['host', 'port', 'user', 'password', 'database']);
    verify(config, 'site', ['address', 'port']);
    verify(config, 'storage', ['path', 'max']);
}

function verify(config, field, subFields) {
    if (!config[field]) {
        throw new Error([
            `Invalid "${field}" configuration.`,
            SENDROP_CONF_VERIFY
        ].join('\n'));
    }

    for (let subField of subFields) {
        if (!config[field][subField]) {
            throw new Error([
                `Invalid "${field}" configuration: missing "${subField}" field.`,
                SENDROP_CONF_VERIFY
            ].join('\n'));
        }
    }

    exports[field] = config[field];
}

exports.load = load;