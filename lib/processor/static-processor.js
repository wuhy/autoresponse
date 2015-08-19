/**
 * @file 响应静态资源预处理器
 * @author sparklewhy@gmail.com
 */

var fs = require('fs');

module.exports = exports = function (mockFile, context, callback) {
    fs.readFile(mockFile.path, function (err, data) {
        if (err) {
            callback(err);
        }
        else {
            callback(null, data, mockFile.extname);
        }
    });
};
