/**
 * @file 响应 JS 资源预处理器
 * @author sparklewhy@gmail.com
 */

module.exports = exports = function (mockFile, context, callback) {
    try {
        var mockPath = mockFile.path;
        delete require.cache[require.resolve(mockPath)];
        var mockObj = require(mockPath);

        var mockHandler = mockObj;
        if (typeof mockHandler !== 'function' && mockHandler) {
            mockHandler = mockHandler[context.method];
        }

        if (typeof mockHandler === 'function') {
            var reqURL = context.url;
            mockObj = mockHandler(
                reqURL.pathname, reqURL.query || {},
                context.post || {}, context
            );
        }
        else {
            mockObj = mockHandler;
        }

        callback(null, mockObj);
    }
    catch (e) {
        callback(e);
    }
};
