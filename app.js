#!/usr/bin/env node

// Setup.
const PORT = process.env.PORT || (process.env.DEV ? 5003 : 4003);

// Imports.
// Basic modules.
const path = require('path');
const fs = require('fs');
const os = require('os');

// Database.
const database = require('./lib/database.js');

// Web server.
const express = require('express');
const download = require('./routes/download.js');
const upload = require('./routes/upload.js');
const revoke = require('./routes/revoke.js');
const utils = require('./lib/utils.js');
const error = require('./lib/error.js');

const app = express();
app.set('trust proxy', true);
app.set('x-powered-by', false);
app.set('json spaces', '\t');
app.set('views', path.join(__dirname, 'templates'));
app.set('view engine', 'pug');

app.use(express.static(path.join(__dirname, 'public')));

app.use('/', download);
app.use('/', upload);
app.use('/', revoke);

app.all('*', (req, res) => {
    utils.displayError(req, res, error.fromCode(404));
});

start();

async function start() {
    try {
        const connection = await database.connect();
        console.log(`Connected to mySQL server (${connection.threadId}).`);
        await initUploadsFolder();
        app.listen(PORT, () => {
            console.log(`Server started on port ${PORT}.`);
        });
    } catch(error) {
        console.error(`Error starting sandrop: ${error.stack}`);
    }
}

async function initUploadsFolder() {
    const UPLOAD_PATH = path.join(os.tmpdir(), 'uploads');
    if(fs.existsSync(UPLOAD_PATH)) {
        const fileRegex = /^\d+$/;
        const files = fs.readdirSync(UPLOAD_PATH).filter(file => fileRegex.test(file));
        if(files.length) {
            const filesToDelete = (await database.shouldBeDelete(files));
            filesToDelete.forEach(file => fs.unlinkSync(path.join(UPLOAD_PATH, String(file.id))));
        }
    } else {
        fs.mkdirSync(UPLOAD_PATH);
    }
}
