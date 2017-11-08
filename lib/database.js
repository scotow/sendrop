const alias = require('./alias.js');
const mysql = require('mysql');
const ipRegex = require('ip-regex');

// mySQL connection.
const connection = mysql.createConnection({
    host    : 'localhost',
    user    : 'file',
    password: 'lkX438A2sGiObnvp',
    database: 'file'
});

function connect() {
    return new Promise((resolve, reject) => {
        connection.connect((err) => {
            if(err) {
                reject(err);
                return;
            }

            resolve(connection);
        });
    });
}

function generateAlias(table, type) {
    if(!['files', 'archives'].includes(table)) return Promise.reject(new Error(`Invalid table name when generating alias: ${table}`));
    if(!['short', 'long'].includes(type)) return Promise.reject(new Error(`Invalid alias type name when generating alias: ${type}`));

    return new Promise((resolve, reject) => {
        let attemps = 0;
        function checkAvailability() {
            if(attemps++ === 20) {
                reject();
                return;
            }

            const aliasGenerated = alias[type]();
            connection.query('SELECT EXISTS (SELECT 1 FROM ?? WHERE BINARY ?? = ?) AS \'exists\'', [table, (type + '_alias'), aliasGenerated], (error, results, fields) => {
                if(error) {
                    reject(error);
                } else if(results[0].exists) {
                    checkAvailability();
                } else {
                    resolve(aliasGenerated);
                }
            });
        }
        checkAvailability();
    });
}

function insertFile(ip, name, size, type, shortAlias, longAlias) {
    if(!ipRegex({exact: true}).test(ip)) return Promise.reject(new Error('Invalid IP address.'));
    if(!name) return Promise.reject(new Error('Invalid file name.'));
    if(size <= 0) return Promise.reject(new Error('Invalid file size.'));
    if(!shortAlias) return Promise.reject(new Error('Invalid short alias.'));
    if(!longAlias) return Promise.reject(new Error('Invalid long alias.'));

    return new Promise((resolve, reject) => {
        connection.query('INSERT INTO files (uploader, name, size, type, short_alias, long_alias) VALUES (?, ?, ?, ?, ?, ?)', [ip, name, size, type, shortAlias, longAlias], (error, results, fields) => {
            if(error) {
                reject(error);
            } else {
                resolve(results.insertId);
            }
        });
    });
}

function insertArchive(ip, size, shortAlias, longAlias) {
    if(!ipRegex({exact: true}).test(ip)) return Promise.reject(new Error('Invalid IP address.'));
    if(size <= 0) return Promise.reject(new Error('Invalid file size.'));
    if(!shortAlias) return Promise.reject(new Error('Invalid short alias.'));
    if(!longAlias) return Promise.reject(new Error('Invalid long alias.'));

    return new Promise((resolve, reject) => {
        connection.query('INSERT INTO archives (uploader, size, short_alias, long_alias) VALUES (?, ?, ?, ?)', [ip, size, shortAlias, longAlias], (error, results, fields) => {
            if(error) {
                reject(error);
            } else {
                resolve(results.insertId);
            }
        });
    });
}

function addFileToArchive(archiveId, fileId) {
    if(!archiveId) return Promise.reject(new Error('Invalid archive id.'));
    if(!fileId) return Promise.reject(new Error('Invalid file id.'));

    return new Promise((resolve, reject) => {
        connection.query('INSERT INTO archive_files (archive_id, file_id) VALUES (?, ?)', [archiveId, fileId], (error, results, fields) => {
            if(error) {
                reject(error);
            } else {
                resolve();
            }
        });
    });
}

function getFile(type, alias) {
    if(!['short', 'long'].includes(type)) return Promise.reject(new Error(`Invalid alias type name when fetching file: ${type}`));
    if(!alias) return Promise.reject(new Error('Invalid alias.'));

    return new Promise((resolve, reject) => {
        connection.query('SELECT id, name, type FROM files WHERE BINARY ?? = ?', [(type + '_alias'), alias], (error, results, fields) => {
            if(error) {
                reject(error);
            } else if(!results.length) {
                reject(new Error('File not found.'));
            } else if(results.length > 1) {
                reject(new Error('Too many files found with this alias (server error).'));
            } else {
                resolve(results[0]);
            }
        });
    });
}

function getArchiveFiles(type, alias) {
    if(!['short', 'long'].includes(type)) return Promise.reject(new Error(`Invalid alias type name when fetching archive files: ${type}`));
    if(!alias) return Promise.reject(new Error('Invalid alias.'));

    return new Promise((resolve, reject) => {
        connection.query('SELECT files.id, files.name FROM files INNER JOIN archive_files ON files.id = file_id INNER JOIN archives ON archives.id = archive_id WHERE BINARY archives.?? = ?', [(type + '_alias'), alias], (error, results, fields) => {
            if(error) {
                reject(error);
            } else if(!results.length) {
                reject(new Error('No files found for this archive.'));
            } else {
                resolve(results);
            }
        });
    });
}

function getUsage(ip) {
    if(!ipRegex({exact: true}).test(ip)) return Promise.reject(new Error('Invalid IP address.'));

    return new Promise((resolve, reject) => {
        connection.query('SELECT COUNT(*) AS \'count\', SUM(size) AS \'size\' FROM files WHERE uploader = ? AND DATE(creation) = CURDATE()', [ip], (error, results, fields) => {
            if(error) {
                reject(error);
            } else if(!results.length || results.length > 1) {
                reject(new Error('An error has occured while fetching upload usage.'));
            } else {
                resolve(results[0]);
            }
        });
    });


}

exports.connect = connect;
exports.generateAlias = generateAlias;
exports.insertFile = insertFile;
exports.insertArchive = insertArchive;
exports.addFileToArchive = addFileToArchive;
exports.getFile = getFile;
exports.getArchiveFiles = getArchiveFiles;
exports.getUsage = getUsage;
