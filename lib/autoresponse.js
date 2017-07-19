/**
 * @file 自动响应请求中间件
 * @author sparklewhy@gmail.com
 */

var url = require('url');
var fileUtil = require('./util/file-util');
var autoresponseUtil = require('./autoresponse-util');
var autoresponseProcessor = require('./autoresponse-processor');
var mockRuleParser = require('./rule-parser');

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
 * @param {string} mockPath mock 文件的路径
 * @return {?string}
 */
function getDefaultResponseFile(reqMethod, reqPathName, mockPath) {
    var mockFile = mockPath || reqPathName;

    // 对于 GET 请求，如果指定文件名后缀，则原路径返回
    if (reqMethod === 'get' && /\.\w+$/.test(mockFile)) {
        return mockFile.replace(/^\/+/, '');
    }

    var pathSegments = mockFile.split(/\//);
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
 * @param {Object} context 请求上下文
 * @param {Object} options 自动响应的配置选项
 * @return {Object}
 */
function getResponseFile(context, options) {
    var reqMethod = context.method;
    var reqUrl = context.url;
    var reqPath = reqUrl.pathname;
    var mockInfo = mockRuleParser.findMatchMockRule(
        reqMethod, reqPath, options, reqUrl
    );

    if (!mockInfo) {
        return null;
    }

    // cache restful url params info
    context.params = mockInfo.params;

    var mockFile = mockInfo.mock || {};
    if (typeof mockFile === 'string') {
        mockFile = {
            file: mockFile
        };
    }

    // 初始化要重写的路径
    var rewritePath = mockFile.path;
    if (typeof rewritePath === 'function') {
        rewritePath = rewritePath(reqUrl);
    }

    if (rewritePath && !mockFile.proxy) {
        mockFile.proxy = context.host;
    }

    // 产生默认的响应文件，如果不存在的话
    var hasProxy = mockFile.proxy;
    if (!hasProxy && !mockFile.file && !rewritePath) {
        mockFile.file = (options.responseFileGenerator || getDefaultResponseFile)(
            reqMethod, reqPath, mockInfo.mockPath);
        if (!mockFile.file) {
            return null;
        }
    }

    if (hasProxy) {
        return {
            path: rewritePath,
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

    var responseInfo = getResponseFile(context, options);
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
    return !!getResponseFile(context, options);
};
