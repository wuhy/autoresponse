/**
 * @file 响应 TPL 资源预处理器
 * @author sparklewhy@gmail.com
 */
var fs = require('fs');
var tplEngine = require('./json-tpl-engine');

module.exports = exports = function (mockFile, context, callback) {
    fs.readFile(mockFile.path, function (err, data) {
        if (err) {
            callback(err);
        }
        else {
            var result = tplEngine.generateFromTemplate(JSON.parse(data.toString()))
            callback(null, result, 'json');
        }
    });
};