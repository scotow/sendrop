// Modules.
const path = require('path');
const moment = require('moment');

const config = require('./config.js');
const database = require('./database.js');

async function clearExpired() {
    const files = await database.expiredFiles();

    for (file of files) {
        try {
            await fs.remove(path.join(config.storage.path, file));
        } catch (error) {
            console.log(`Expired file with id ${file} could not be deleted. Skipping.`);
        }
    }
}

async function scheduleDeletion() {
    const files = await database.expiringFiles();

    for (file of files) {
        // File path.
        const path = path.join(config.storage.path, file.id);

        // Check if file still exists.
        if (!await fs.pathExists(path)) {
            console.log(`Expiring file with id ${file.id} is not in the storage folder. Skipping.`);
            continue;
        }

        // Schedule file deletion.
        setTimeout(() => {
            fs.remove(path, error => {
                if (error) {
                    console.log([
                        `Expired file with id ${file} could not be deleted.`,
                        error.message
                    ].join('\n'));
                }
            });
        }, (file.expiration - moment().unix()) * 1e3);
    }
}

module.exports = { clearExpired, scheduleDeletion };