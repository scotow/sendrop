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

app.all('*', (req, res) => {
    utils.displayError(req, res, error.fromCode(404));
});

fs.existsSync(path.join(os.tmpdir(), 'uploads')) || fs.mkdirSync(path.join(os.tmpdir(), 'uploads'));
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
