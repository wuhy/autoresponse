/**
 * @file 自动响应处理器
 * @author sparklewhy@gmail.com
 */

var fs = require('fs');
var pathUtil = require('path');
var _ = require('lodash');
var mime = require('mime');
var formidable = require('formidable');
var webProxy = require('./autoresponse-proxy');

var fileUtil = require('./util/file-util');
var autoresponseUtil = require('./autoresponse-util');
var logger = require('./logger');

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
    var isObj =  (data && (_.isPlainObject(data) || _.isArray(data)));

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
        else {
            fs.writeFile(mockFilePath, '', doneHandler);
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
    var customProcessor = options.processor || {};

    var processor = customProcessor[mockType] || builtinProcessor[mockType];

    if (autoresponseUtil.isRequestJSFile(context)) {
        processor = null;
    }

    processor || (processor = builtinProcessor.static);

    // 处理响应文件
    if (typeof processor === 'function') {
        processor(mockFile, context, function (err, data, dataType) {
            if (err) {
                logger.error('processor process %s error happen: %s', mockFile, err);
                autoresponseUtil.response500(context.res);
            }
            else {
                var resData = getResponseData(
                    data, mockFile.responseType || dataType , context
                );
                writeResponse(context.res, resData, options.timeout);

                logger.debug('mock request: %s, use local file: %s',
                    context.url.pathname, mockFile.path);
            }
        });
    }
    else {
        logger.error('process mock file %s fail, ' +
            'mock file processor %s must export as a function',
            mockFile.path, processor);
        autoresponseUtil.response500(context.res);
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
            logger.info('auto generate mock data file: %s for request %s',
                mockPath, reqUrl);

            createMockFile(mockFile, options, function (err) {
                if (err) {
                    autoresponseUtil.response500(res);
                }
                else {
                    processMockFile(mockFile, context, options);
                }
            });
        }
        else {
            logger.info('cannot find mock data file: %s for reqeust %s',
                mockPath, reqUrl);
            autoresponseUtil.response404(res);
        }
    }
}

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
        var rewritePath = responseInfo.path;
        var reqPath = context.url.pathname;
        if (rewritePath) {
            autoresponseUtil.rewriteRequestURL(context, rewritePath);
            logger.debug('forward request: %s to %s', reqPath, rewritePath);
        }

        logger.debug('mock request: %s, use proxy: %s', reqPath, proxy);
        webProxy.proxy(context, proxy);
        return;
    }

    var mockFile = {
        path: responseInfo.file,
        responseType: responseInfo.jsonp ? 'jsonp' : null,
        extname: responseInfo.extname
    };

    // 初始化 jsonp 回调的key
    context.callbackKey = responseInfo.callback;

    if (context.method === 'post') {
        getPostParams(options, context, function (err, postParams) {
            if (err) {
                logger.error('get post params of the mock request error: %s', err);
                autoresponseUtil.response500(context.res);
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
