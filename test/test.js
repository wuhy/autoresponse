var mime = require('mime');

console.log(mime.lookup('a/b.php'))
console.log(mime.lookup('a/b.js'))
console.log(mime.lookup('a/b.txt'))
console.log('chartset:' + mime.charsets.lookup(mime.lookup('a/b.jpg')))

var fileutil = require('../lib/util/file-util');
fileutil.mkdirsSyn('./c/b/')