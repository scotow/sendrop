// Modules.
const mysql = require('mysql2/promise');
const config = require('./config.js');

// Connection pool.
let pool = null;

// Setting up database.
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

// Session.
async function openSession(uuid) {
    const connection = await pool.getConnection();

    const results = await connection.execute('SELECT * FROM sessions');
    console.log(results);
}

module.exports = {
    open, ping,
    session: {
        open: openSession
    }
};