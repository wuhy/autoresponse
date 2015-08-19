/**
 * @file 响应 JS 资源预处理器
 * @author sparklewhy@gmail.com
 */

module.exports = exports = function (mockFile, context, callback) {
    try {
        var mockPath = mockFile.path;
        delete require.cache[require.resolve(mockPath)];
        var mockObj = require(mockPath);
        if (typeof mockObj === 'function') {
            var reqURL = context.url;
            mockObj = mockObj(reqURL.pathname, reqURL.query || {}, context.post || {}, context);
        }

        callback(null, mockObj);
    }
    catch (e) {
        callback(e);
    }
};
