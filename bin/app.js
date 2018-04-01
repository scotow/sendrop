// Modules.

// Imports.
const config = require('../lib/config');

start();

async function start() {
    await config.load();
}