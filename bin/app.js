// Modules.

// Imports.
const config = require('../lib/config.js');
const database = require('../lib/database.js');

start();

async function start() {
    try {
        // Load configuration.
        await config.load();

        // Open connection to database.
        await database.open();

        // Testing.
        await database.session.open();
    } catch (error) {
        console.error(error.message);
    }
}