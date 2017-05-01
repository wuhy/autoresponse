/**
 * @file 请求代理处理模块
 * @author sparklewhy@gmail.com
 */

var httpProxy = require('http-proxy');
var proxyServer = httpProxy.createProxyServer();

var logger = require('./util/log');
var autoresponseUtil = require('./autoresponse-util');

/**
 * 代理请求
 *
 * @param {Object} context 请求上下文
 * @param {string|Object} proxy 要使用代理，e.g., 'localhost:8888'
 */
function proxyRequest(context, proxy) {
    var proxyTarget = proxy;
    if (typeof proxy === 'string' && !/^http(s)?:/.test(proxy)) {
        proxyTarget = 'http://' + proxy;
    }

    proxyServer.web(context.req, context.res, {
        target: proxyTarget
    });

    proxyServer.once('error', function (err) {
        logger.error('Proxy server %s error: %s', proxy, err);
        autoresponseUtil.response500(context.res);
    });
}

exports.proxy = proxyRequest;

