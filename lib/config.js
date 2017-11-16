const path = require('path');
const os = require('os');
const profile = process.env.SENDROP_ENV || 'production';

const DEFAULT = {
    database: {
        host    : 'localhost',
        user    : 'root',
        password: 'password',
        database: 'file'
    },
    site: {
        address: 'http://localhost',
        port: 80
    },
    storage: {
        path: path.join(os.tmpdir(), 'uploads')
    }
};

const database = require('../config/database.json')[profile] || DEFAULT.database;
database.host = process.env.DB_HOST || database.host;
database.user = process.env.DB_USER || database.user;
database.password = process.env.DB_PASSWORD || database.password;
database.database = process.env.DB_DATABASE || database.database;

const site = require('../config/site.json')[profile] || DEFAULT.site;
site.address = process.env.ADDRESS || site.address;
site.port = process.env.PORT || site.port;

const storage = require('../config/storage.json')[profile] || DEFAULT.storage;
storage.path = process.env.STORAGE_PATH || storage.path;

exports.database = database;
exports.site = site;
exports.storage = storage;
