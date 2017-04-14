/**
 * @file 自动响应请求中间件
 * @author sparklewhy@gmail.com
 */

var _ = require('lodash');
var url = require('url');
var fileUtil = require('./util/file-util');
var autoresponseUtil = require('./autoresponse-util');
var autoresponseProcessor = require('./autoresponse-processor');

/**
 * 匹配给定的路径是否符合给定的规则
 *
 * @param {string|RegExp|Function} matchRule 要匹配的规则
 * @param {string} toMatchPath 要匹配的路径
 * @return {boolean}
 */
function isMatch(matchRule, toMatchPath) {
    return (matchRule instanceof RegExp && matchRule.test(toMatchPath))
        || (typeof matchRule === 'string' && matchRule === toMatchPath)
        || (typeof matchRule === 'function' && matchRule(toMatchPath));
}

/**
 * 获取默认的响应文件的路径
 *
 * 默认规则：
 * 如果是GET请求，且请求指定了文件类型，则请求路径作为响应文件路径返回；
 * 否则，则按如下规则，生成响应文件路径：
 * e.g., 对于 post 请求 path 如果为/biz/abc/efg
 *       对应的响应数据文件位置为：<responseDir>/biz/abc/efg.js
 *
 * @param {string} reqMethod 请求的方法
 * @param {string} reqPathName 请求的路径
 * @return {?string}
 */
function getDefaultResponseFile(reqMethod, reqPathName) {

    // 对于 GET 请求，如果指定文件名后缀，则原路径返回
    if (reqMethod === 'get' && /\.\w+$/.test(reqPathName)) {
        return reqPathName.replace(/^\/+/, '');
    }

    var pathSegments = reqPathName.split(/\//);
    var notEmptySegments = [];
    pathSegments.forEach(function (item) {
        item && notEmptySegments.push(item);
    });

    if (notEmptySegments.length >= 1) {
        return notEmptySegments.join('/') + '.js';
    }
}

/**
 * 获取自动响应的文件
 *
 * @param {Array.<Object>|boolean} matchRules 自动响应匹配规则定义
 * @param {string} reqPath 请求路径
 * @param {Object} context 请求上下文
 * @param {Object} options 自动响应的配置选项
 * @return {Object}
 */
function getResponseFile(matchRules, reqPath, context, options) {
    if (!matchRules || !reqPath) {
        return null;
    }

    if (!Array.isArray(matchRules)) {
        matchRules = [matchRules];
    }

    // 查找自动响应的配置
    var mockFile;
    var reqURL = context.url;
    for (var i = 0, len = matchRules.length; i < len; i++) {
        var rule = matchRules[i];

        if (typeof rule === 'function') {
            rule = rule(reqPath, context);
        }

        if (rule === true || isMatch(_.isPlainObject(rule) ? rule.match : rule, reqPath)) {
            mockFile = rule.mock || {};

            if (typeof mockFile === 'function') {
                mockFile = mockFile(reqURL);
            }

            break;
        }
    }

    // 不存在自动响应配置，返回null
    if (!mockFile) {
        return null;
    }

    if (typeof mockFile === 'string') {
        mockFile = {
            file: mockFile
        };
    }

    // 初始化要重写的路径
    var rewritePath = mockFile.path;
    if (typeof rewritePath === 'function') {
        rewritePath = rewritePath(reqURL);
    }

    if (rewritePath && !mockFile.proxy) {
        mockFile.proxy = context.host;
    }

    // 产生默认的响应文件，如果不存在的话
    var hasProxy = mockFile.proxy;
    if (!hasProxy && !mockFile.file && !rewritePath) {
        mockFile.file = (options.responseFileGenerator || getDefaultResponseFile)(
            context.method, reqPath);
        if (!mockFile.file) {
            return null;
        }
    }

    if (hasProxy) {
        return {
            path: mockFile.path,
            proxy: mockFile.proxy
        };
    }

    var filePath = mockFile.file;
    return {
        file: autoresponseUtil.getAbsolutePath(filePath, options),
        jsonp: mockFile.jsonp,
        callback: mockFile.callback,
        extname: fileUtil.getFileExtName(filePath).toLowerCase()
    };
}

/**
 * 获取自动响应信息
 *
 * @param {Object} context 请求上下文
 * @param {Object} options 自动响应配置选项
 * @return {Object}
 */
function getResponseInfo(context, options) {
    var reqURL = context.url;
    var reqMethod = context.method;

    var reqPathName = reqURL.pathname;
    var responseInfo = getResponseFile(
        options[reqMethod], reqPathName, context, options
    );

    var queryRules = options.query;
    if (!responseInfo && queryRules) {

        var query = reqURL.query;
        for (var k in queryRules) {

            if (queryRules.hasOwnProperty(k)
                && (responseInfo = getResponseFile(
                    queryRules[k], query[k],
                    context, options))
                ) {
                break;
            }

        }

    }

    return responseInfo;
}

/**
 * 获取请求上下文
 *
 * @param {Object} req 请求对象
 * @param {Object} res 响应对象
 * @return {{req: Object, res: Object, method: string, url: Object}}
 */
function getRequestContext(req, res) {
    var reqURL = url.parse(req.url, true);
    var reqMethod = req.method.toLowerCase();

    return {
        req: req,
        res: res,
        host: req.headers.host,
        method: reqMethod,
        url: reqURL
    };
}

/**
 * 自动响应请求
 *
 * @inner
 * @param {Object} options 选项配置信息
 * @param {http.IncomingMessage} req 请求对象
 * @param {http.ServerResponse} res 响应对象
 * @param {Function} next 请求继续执行的回调
 */
function autoResponse(options, req, res, next) {
    var context = getRequestContext(req, res);
    context.root = options.root;
    var responseInfo = getResponseInfo(context, options);

    if (responseInfo) {
        autoresponseProcessor.processResponse(responseInfo, context, options);
    }
    else {
        next();
    }
}

module.exports = exports = function (options) {
    return autoResponse.bind(this, options);
};

/**
 * 对当前请求是否需要自动响应处理
 *
 * @param {http.IncomingMessage} req 请求对象
 * @param {http.ServerResponse} res 响应对象
 * @param {Object} options 自动响应配置选项
 * @return {boolean}
 */
exports.needAutoresponse = function (req, res, options) {
    var context = getRequestContext(req, res);
    return !!getResponseInfo(context, options);
};
