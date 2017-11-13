const disk = require('diskusage');
const os = require('os');

const rootPath = os.platform() === 'win32' ? 'c:' : '/';

function freespace() {
    return new Promise((resolve, reject) => {
        disk.check(rootPath, function(error, info) {
            if(error) {
                reject(error);
            } else {
                resolve(info.available);
            }
        });
    });
}

function formatBytes(bytes, decimals) {
    if(bytes == 0) return '0 Bytes';
    const k = 1024,
    dm = decimals || 2,
    sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'],
    i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

exports.freespace = freespace;
exports.formatBytes = formatBytes;
