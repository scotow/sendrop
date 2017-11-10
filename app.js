#!/usr/bin/env node

// Basic modules.
const path = require('path');
const fs = require('fs');

// Database.
const database = require('./lib/database.js');

// Utils.
const moment = require('moment');
const bytes = require('bytes');
const disk = require('./lib/disk.js');
const archive = require('./lib/archive.js');

// Web server.
const express = require('express');
const download = require('./routes/download.js');
const upload = require('./routes/upload.js');

// Express midlewares.
const staticPublic = express.static(path.join(__dirname, 'public'));
const uploadMidleware =
    multer({
        dest: path.join(__dirname, 'uploads'),
        limits: {
            fieldNameSize: 100
        }
    })
    .fields([
        { name: 'file', maxCount: 1 },
        { name: 'files', maxCount: 32}
    ]);

// Setup.
const SITE_ADDRESS = 'https://dev.file.scotow.com';
const PORT = process.env.PORT || (process.env.DEV ? 5003 : 4003);

const app = express();
app.set('trust proxy', true);
app.set('x-powered-by', false);
app.set('json spaces', '\t');
app.set('views', path.join(__dirname, 'templates'));
app.set('view engine', 'pug');

app.use(express.static(path.join(__dirname, 'public')));

app.use('/', download);
app.use('/', upload);

fs.existsSync(path.join(__dirname, 'uploads')) || fs.mkdirSync(path.join(__dirname, 'uploads'));
database.connect()
.then((connection) => {
    console.log(`Connected to mySQL server (${connection.threadId}).`);
    app.listen(PORT, () => {
        console.log(`Server started on port ${PORT}.`);
    });
})
.catch((error) => {
    console.error(`Error connecting to mySQL: ${error.stack}`);
});
