#!/usr/bin/env node

// Imports.
// Config.
const config = require('./lib/config.js');

// Basic modules.
const path = require('path');
const fs = require('fs');

// Utils.
const moment = require('moment');

// Database.
const database = require('./lib/database.js');

// Web server.
const express = require('express');
const download = require('./routes/download.js');
const upload = require('./routes/upload.js');
const revoke = require('./routes/revoke.js');
const info = require('./routes/info.js');
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
app.use('/', info);

app.all('*', (req, res) => {
    utils.displayError(req, res, error.fromCode(404));
});

start();

async function start() {
    try {
        await database.ping();
        console.log(`Connected to mySQL server.`);
        await initUploadsFolder();
        app.listen(config.site.port, () => {
            console.log(`Server started on port ${config.site.port}.`);
        });
    } catch(error) {
        console.error(`Error starting Sendrop: ${error.stack}`);
    }
}

async function initUploadsFolder() {
    if(fs.existsSync(config.storage.path)) {
        const fileRegex = /^\d+$/;
        let files = fs.readdirSync(config.storage.path).filter(file => fileRegex.test(file));
        if(files.length) {
            files = await database.getExpiration(files);
            const now = moment().unix();
            files.forEach(file => {
                if(file.expiration < now) {
                    utils.deleteFile(file).catch(error => console.error('Error while deleting expired file on start-up.', error));
                } else {
                    setTimeout(() => {
                        utils.deleteFile(file).catch(error => console.error('Error while deleting expired file.', error));
                    }, (file.expiration - now) * 1e3);
                }
            });
        }
    } else {
        fs.mkdirSync(config.storage.path);
    }
}
