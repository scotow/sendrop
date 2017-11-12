const random = require('./random.js');
const mysql = require('mysql');

const TOKEN_REGEX = {
    short: /^[a-zA-Z0-9]{6}$/,
    long: /^[a-z]+(-[a-z]+){2}$/,

};
const ipRegex = require('ip-regex');

// mySQL connection.
const connection = mysql.createConnection(require('../config/credentials.json')[process.env.DEV ? 'dev' : 'prod']);

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

function generateToken(table, type) {
    if(!['files', 'archives'].includes(table)) return Promise.reject(new Error(`Invalid table name when generating alias: ${table}`));
    if(!['short_alias', 'long_alias', 'revoke_token'].includes(type)) return Promise.reject(new Error(`Invalid alias/token type name when generating alias/token: ${type}`));

    return new Promise((resolve, reject) => {
        let attemps = 0;
        function checkAvailability() {
            if(attemps++ === 20) {
                reject(new Error('Alias/token generating timeouted.'));
                return;
            }

            const token = random[type]();
            connection.query('SELECT EXISTS (SELECT 1 FROM ?? WHERE BINARY ?? = ?) AS \'exists\'', [table, type, token], (error, results, fields) => {
                if(error) {
                    reject(error);
                } else if(results[0].exists) {
                    checkAvailability();
                } else {
                    resolve(token);
                }
            });
        }
        checkAvailability();
    });
}

function insertFile(expiration, ip, name, size, type, shortAlias, longAlias, revokeToken) {
    if(!expiration) return Promise.reject(new Error('Invalid expiration date.'));
    if(!ipRegex({exact: true}).test(ip)) return Promise.reject(new Error('Invalid IP address.'));
    if(!name) return Promise.reject(new Error('Invalid file name.'));
    if(size <= 0) return Promise.reject(new Error('Invalid file size.'));
    if(!shortAlias) return Promise.reject(new Error('Invalid short alias.'));
    if(!longAlias) return Promise.reject(new Error('Invalid long alias.'));

    return new Promise((resolve, reject) => {
        connection.query('INSERT INTO files (expiration, uploader, name, size, type, short_alias, long_alias, revoke_token) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [expiration, ip, name, size, type, shortAlias, longAlias, revokeToken], (error, results, fields) => {
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

function getFile(alias) {
    if(!alias) return Promise.reject(new Error('Invalid alias.'));
    const aliasType = getAliasType(alias) + '_alias';
    if(!aliasType) return Promise.reject(new Error(`Invalid alias synthax when fetching file.`));

    return new Promise((resolve, reject) => {
        connection.query('SELECT id, name, type FROM files WHERE BINARY ?? = ?', [aliasType, alias], (error, results, fields) => {
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

function revokeFile(alias, revokeToken) {
    if(!alias) return Promise.reject(new Error('Invalid alias.'));
    const aliasType = getAliasType(alias) + '_alias';
    if(!aliasType) return Promise.reject(new Error(`Invalid alias synthax when revoking archive files.`));

    return new Promise((resolve, reject) => {
        connection.query('SELECT id FROM files WHERE BINARY ?? = ? AND revoke_token = ?', [aliasType, alias, revokeToken], (error, results, fields) => {
            if(error) {
                reject(error);
            } else if(!results.length) {
                reject(new Error('File not found or token is not matching.'));
            } else if(results.length > 1) {
                reject(new Error('Too many files found with this alias (server error).'));
            } else {
                resolve(results[0]);
            }
        });
    });
}

function shouldBeDelete(ids) {
    if(!Array.isArray(ids)) return Promise.reject(new Error('Invalid files id.'));

    return new Promise((resolve, reject) => {
        connection.query('SELECT id FROM files WHERE id IN (?) AND expiration < NOW()', [ids], (error, results, fields) => {
            if(error) {
                reject(error);
            } else {
                resolve(results);
            }
        });
    });
}

function getArchiveFiles(alias) {
    if(!alias) return Promise.reject(new Error('Invalid alias.'));
    const aliasType = getAliasType(alias) + '_alias';
    if(!aliasType) return Promise.reject(new Error(`Invalid alias synthax when fetching archive files.`));

    return new Promise((resolve, reject) => {
        connection.query('SELECT files.id, files.name FROM files INNER JOIN archive_files ON files.id = file_id INNER JOIN archives ON archives.id = archive_id WHERE BINARY archives.?? = ?', [aliasType, alias], (error, results, fields) => {
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
    if(!ipRegex({ exact: true }).test(ip)) return Promise.reject(new Error('Invalid IP address.'));

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

function getAliasType(alias) {
    if(TOKEN_REGEX.short.test(alias)) return 'short';
    if(TOKEN_REGEX.long.test(alias)) return 'long';
    return false;
}


exports.connect = connect;
exports.shouldBeDelete = shouldBeDelete;

exports.generateToken = generateToken;
exports.getUsage = getUsage;

exports.insertFile = insertFile;
exports.getFile = getFile;
exports.revokeFile = revokeFile;

exports.insertArchive = insertArchive;
exports.addFileToArchive = addFileToArchive;
exports.getArchiveFiles = getArchiveFiles;
