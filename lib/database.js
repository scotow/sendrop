// Modules.
const mysql = require('mysql2/promise');
const config = require('./config.js');

// Connection pool.
let pool = null;

async function open() {
    try {
        pool = await mysql.createPool(config.database);
        await ping();
    } catch (error) {
        throw new Error('Could not open connection to database.');
    }
}

async function ping() {
    return (await pool.getConnection()).ping();
}

module.exports = { open, ping };