// Config.
const config = require('./config.js');

// Basic modules.
const path = require('path');
const fs = require('fs');

// Archiver.
const archiver = require('archiver');

function createZip(files) {
    return new Promise((resolve, reject) => {
        // create a file to stream archive data to.
        const zipPath = path.join(config.storage.path, 'archive' + Date.now());
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', {
            zlib: { level: 9 } // Sets the compression level.
        });

        // listen for all archive data to be written
        // 'close' event is fired only when a file descriptor is involved
        output.on('close', () => {
            resolve(zipPath);
        });

        // This event is fired when the data source is drained no matter what was the data source.
        // It is not part of this library but rather from the NodeJS Stream API.
        // @see: https://nodejs.org/api/stream.html#stream_event_end
        output.on('end', () => {
            console.log('Data has been drained');
        });

        // good practice to catch warnings (ie stat failures and other non-blocking errors)
        archive.on('warning', error => {
            output.end();
            if (error.code === 'ENOENT') {
                reject(new Error('File not found while creating archive file.'));
            } else {
                reject(new Error('Error while creating archive file.'));
            }
        });

        // good practice to catch this error explicitly
        archive.on('error', err => {
            reject(new Error('Error while creating archive file.'));
        });

        // pipe archive data to the file
        archive.pipe(output);

        // append files
        files.forEach(file => {
            archive.file(file.path, { name: file.name });
        });

        // finalize the archive (ie we are done appending files but streams have to finish yet)
        // 'close', 'end' or 'finish' may be fired right after calling this method so register to them beforehand
        archive.finalize();
    });
}

exports.createZip = createZip;
