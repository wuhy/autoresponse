/**
 * @file 自动响应处理器
 * @author sparklewhy@gmail.com
 */

var fs = require('fs');
var pathUtil = require('path');
var mime = require('mime');
var formidable = require('formidable');
var httpProxy = require('http-proxy');
var proxyServer = httpProxy.createProxyServer();

var fileUtil = require('./util/file-util');

/**
 * 内建响应数据的预处理器
 *
 * @type {Object}
 */
var builtinProcessor = {
    js: require('./processor/js-processor'),
    static: require('./processor/static-processor')
};

/**
 * 重写请求的 url
 *
 * @param {Object} context 请求的上下文
 * @param {string} forwardPath 要请求的path
 */
function forwardRequest(context, forwardPath) {
    context.req.url = forwardPath + context.url.search;
}

/**
 * 判断当前请求是否是 静态 JS 资源文件
 *
 * @param {Object} context 请求的上下文
 * @return {boolean}
 */
function isRequestJSFile(context) {
    return context.method === 'get' && /\.js$/i.test(context.url.pathname);
}

/**
 * 获取请求的 post 参数
 *
 * @param {Object} options 自动响应选项
 * @param {Object} context 请求的上下文
 * @param {function=} callback 创建完成执行回调
 */
function getPostParams(options, context, callback) {
    var postParamsGetter = options.getPostParams;
    if (typeof postParamsGetter === 'function') {
        postParamsGetter(context.req, callback);
    }
    else {
        var form = new formidable.IncomingForm();

        form.parse(context.req, function (err, fields, files) {
            callback(err, {
                fields: fields,
                files: files
            });
        });
    }
}

/**
 * 响应 500
 *
 * @param {http.ServerResponse} res 响应对象
 */
function response500(res) {
    res.writeHead(500);
    res.end();
}

/**
 * 响应 404
 *
 * @param {http.ServerResponse} res 响应对象
 */
function response404(res) {
    res.writeHead(404);
    res.end();
}

/**
 * 输出响应的数据
 *
 * @param {http.ServerResponse} res 响应对象
 * @param {string} resData 响应数据
 * @param {number=} timeout 响应超时时间
 */
function writeResponse(res, resData, timeout) {
    var resHandler = function () {
        var contentType = resData.type;
        var charset = mime.charsets.lookup(contentType);
        if (charset) {
            contentType += (';charset=' + charset);
        }

        res.writeHead(200, {
            'content-type': contentType
        });

        res.end(resData.data);
    };

    timeout = resData.timeout || timeout;
    if (timeout) {
        setTimeout(resHandler, timeout);
    }
    else {
        resHandler();
    }
}

/**
 * 获取 JSONP 响应数据
 *
 * @param {Object|string} data 要响应的数据
 * @param {Object} context 请求上下文
 * @returns {{data: string, type: string}}
 */
function getJSONPRespnoseData(data, context) {
    var query = context.url.query;
    var cbFuncName = query[context.callbackKey || 'callback'];

    if (typeof data === 'object') {
        data = JSON.stringify(data);
    }
    else {
        data = String(data);
    }

    return  {
        data: cbFuncName + '(' + data + ');',
        type: mime.lookup('.js')
    };
}

/**
 * 获取要响应的数据信息
 *
 * @param {Object|string} data 要响应的数据
 * @param {string} resType 响应的类型，'jsonp' 或者 响应资源文件扩展名（js,html,etc.）
 * @param {Object} context 请求上下文
 * @return {{type: string, data: string, timeout: number}}
 */
function getResponseData(data, resType, context) {
    var dataType = typeof data;
    var isObj =  (dataType && dataType === 'object');

    // 如果有设置超时选项，暂时移除该选项，该选项不做为响应数据一部分
    var timeout;
    if (isObj && data.hasOwnProperty('timeout')) {
        timeout = data.timeout;
        data.timeout = undefined;
    }

    var result;
    var isJSONP = resType === 'jsonp';
    if (isJSONP) {
        result = getJSONPRespnoseData(data, context);
    }
    else if (isObj) {
        result = {
            type: mime.lookup('.json'),
            data: JSON.stringify(data)
        };
    }
    else {
        result = {
            type: mime.lookup(resType ? ('.' + resType) : '.txt'),
            data: String(data)
        };
    }

    result.timeout = timeout;

    return result;
}

/**
 * 创建要自动响应的 mock 文件
 *
 * @param {Object} mockFile 要响应的文件
 * @param {Object} options 自动响应选项
 * @param {function=} callback 创建完成执行回调
 */
function createMockFile(mockFile, options, callback) {
    var doneHandler = function (err) {
        callback && callback(err);
    };

    var mockFilePath = mockFile.path;
    try {
        // 创建 mock 文件路径所在的目录
        fileUtil.mkdirsSyn(pathUtil.dirname(mockFilePath));

        // 如果定义了 mock 数据模板，基于该模板创建 mock 数据
        var mockDataTpl = options.mockDataTpl;
        var tplPath = (mockDataTpl && mockDataTpl[mockFile.extname]);
        var readStream;
        if (tplPath) {
            tplPath = pathUtil.join(options.baseDir, tplPath);
            readStream = fs.createReadStream(tplPath);
        }

        if (readStream) {
            var writeStream = fs.createWriteStream(mockFilePath);
            writeStream.on('close', doneHandler).on('error', doneHandler);

            readStream.pipe(writeStream);
        }
    }
    catch (ex) {
        doneHandler(ex);
    }
}

/**
 * 处理要自动响应的本地 mock 文件
 *
 * @param {Object} mockFile 要响应的文件
 * @param {Object} context 请求上下文
 * @param {Object} options 自动响应选项
 */
function processMockFile(mockFile, context, options) {
    var mockType = mockFile.extname;

    var processor = options.processor || builtinProcessor;
    processor = processor[mockType];

    if (isRequestJSFile(context)) {
        processor = null;
    }

    processor || (processor = builtinProcessor.static);

    // 处理响应文件
    var mockPath = mockFile.path;
    if (typeof processor === 'function') {
        processor(mockFile, context, function (err, data, dataType) {
            if (err) {
                console.error(err);
                response500(context.res);
            }
            else {
                var resData = getResponseData(
                    data, mockFile.responseType || dataType , context
                );
                writeResponse(context.res, resData, options.timeout);
            }
        });
    }
    else if (processor.proxy) {
        forwardRequest(context, mockPath);
        exports.proxyRequest(context, processor.proxy);
    }
}

/**
 * 自动响应指定的本地文件
 *
 * @param {Object} mockFile 要响应的文件
 * @param {Object} context 请求上下文
 * @param {Object} options 自动响应选项
 */
function responseLocalData(mockFile, context, options) {
    var mockPath = mockFile.path;

    if (fs.existsSync(mockPath)) {
        processMockFile(mockFile, context, options);
    }
    else {
        var reqUrl = context.req.url;
        var res = context.res;

        if (options.autoMock) {
            console.log('Auto generate mock data file: %s for request %s',
                mockPath, reqUrl);

            createMockFile(mockFile, options, function (err) {
                if (err) {
                    response500(res);
                }
                else {
                    processMockFile(mockFile, context, options);
                }
            });
        }
        else {
            console.log('Cannot find mock data file: %s from reqeust %s',
                mockPath, reqUrl);
            response404(res);
        }
    }
}

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
        console.error('Proxy server %s error: %s', proxy, err);
        response500(context.res);
    });
}

exports.proxyRequest = proxyRequest;

/**
 * 自动响应给定的响应信息
 *
 * @param {Object} responseInfo 要自动响应的信息
 * @param {Object} context 请求上下文
 * @param {Object} options 自动响应的选项配置
 */
exports.processResponse = function (responseInfo, context, options) {
    var proxy = responseInfo.proxy;
    proxy || (proxy = options.proxy);

    if (proxy) {
        exports.proxyRequest(context, proxy);
        return;
    }

    var mockFile = {
        path: responseInfo.file,
        responseType: responseInfo.jsonp ? 'jsonp' : null,
        extname: responseInfo.extname
    };
    if (context.method === 'post') {
        getPostParams(options, context, function (err, postParams) {
            if (err) {
                console.error('Get post params of the mock request error: %s', err);
                response500(context.res);
            }
            else {
                context.post = postParams;
                responseLocalData(mockFile, context, options);
            }
        });
    }
    else {
        responseLocalData(mockFile, context, options);
    }
};