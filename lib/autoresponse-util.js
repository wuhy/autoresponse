/**
 * @file 自动响应相关的工具方法
 * @author sparklewhy@gmail.com
 */

/**
 * 判断当前请求是否是 静态 JS 资源文件
 *
 * @param {Object} context 请求的上下文
 * @return {boolean}
 */
exports.isRequestJSFile = function (context) {
    return context.method === 'get' && /\.js$/i.test(context.url.pathname);
};

/**
 * 重写请求的 url
 *
 * @param {Object} context 请求的上下文
 * @param {string} forwardPath 要请求的path
 */
exports.rewriteRequestURL = function (context, forwardPath) {
    if (forwardPath) {
        context.req.url = forwardPath + context.url.search;
    }
};

/**
 * 响应 500
 *
 * @param {http.ServerResponse} res 响应对象
 */
exports.response500 = function (res) {
    res.writeHead(500);
    res.end();
};

/**
 * 响应 404
 *
 * @param {http.ServerResponse} res 响应对象
 */
exports.response404 = function (res) {
    res.writeHead(404);
    res.end();
};
