/**
 * @file 请求代理处理模块
 * @author sparklewhy@gmail.com
 */

var httpProxy = require('http-proxy');
var proxyServer = httpProxy.createProxyServer();

var logger = require('./logger');
var autoresponseUtil = require('./autoresponse-util');

/**
 * 代理请求
 *
 * @param {Object} context 请求上下文
 * @param {string} proxy 要使用代理，e.g., 'localhost:8888'
 */
function proxyRequest(context, proxy) {
    proxyServer.web(context.req, context.res, {
        target: 'http://' + proxy
    });

    proxyServer.once('error', function (err) {
        logger.error('Proxy server %s error: %s', proxy, err);
        autoresponseUtil.response500(context.res);
    });
}

exports.proxy = proxyRequest;

