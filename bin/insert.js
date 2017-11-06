const database = require('../lib/database.js');

database.connect()
.then(database.generateLongAlias.bind(null, 'files'))
.then((alias) => console.log(alias))
.catch(() => console.log('Alias generation failed.'));
