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
var processorConf = require('./processor/processor-config');
var fileUtil = require('./util/file-util');
var autoresponseUtil = require('./autoresponse-util');
var logger = require('./logger');

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
 * @param {Object} resData 响应数据
 * @param {number=} timeout 响应超时时间
 */
function writeResponse(res, resData, timeout) {
    var resHandler = function () {
        var contentType = resData.type;
        var charset = mime.charsets.lookup(contentType);
        if (charset) {
            contentType += (';charset=' + charset);
        }

        var status = resData.status || 200;
        var statusType = parseInt(status / 100, 10);
        var headerInfo = resData.header || {};
        if (statusType === 2) {
            res.writeHead(200, _.assign({
                'content-type': contentType
            }, headerInfo));
            res.end(resData.data);
        }
        else {
            res.writeHead(status, headerInfo);
            res.end();
        }
    };

    // 初始化响应的延时时间
    timeout = getResponseTimeout(resData.timeout || timeout);
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
 * @return {{data: string, type: string}}
 */
function getJSONPResponseData(data, context) {
    var query = context.url.query;
    var cbFuncName = query[context.callbackKey || 'callback'];

    if (_.isPlainObject(data) || _.isArray(data)) {
        data = JSON.stringify(data);
    }

    return  {
        data: cbFuncName + '(' + data + ');',
        type: mime.lookup('.js')
    };
}

/**
 * 获取处理器
 *
 * @param {string} type 处理器类型
 * @param {Object} options 处理器选项
 * @return {?Function}
 */
function getProcessor(type, options) {
    var builtinProcessor = processorConf.builtinProcessor;
    var customProcessor = options.processor || {};
    var processor = customProcessor[type] || builtinProcessor[type];

    var processorOptions;
    if (_.isPlainObject(processor)) {
        processorOptions = processor;
        processor = builtinProcessor[type];
    }
    else if (processor && processor.hasOptions) {
        processorOptions = {};
    }

    if (processorOptions) {
        _.merge(processorOptions, {baseDir: autoresponseUtil.getAbsolutePath('.', options)});
        processor && (processor = processor(processorOptions));
        customProcessor[type] = processor;
    }

    options.processor = customProcessor;

    return processor;
}

/**
 * 获取响应的延时，单位毫秒
 *
 * @param {string|number} timeout 响应的延时，值可以为23, 或者区间 '10, 200'
 * @return {number}
 */
function getResponseTimeout(timeout) {
    timeout || (timeout = 0);
    var timeoutRange = String(timeout).split(',');
    if (timeoutRange.length === 2) {
        timeout = _.random(
            parseInt(timeoutRange[0], 10) || 0,
            parseInt(timeoutRange[1], 10) || 0
        );
    }
    else {
        timeout = parseInt(timeout, 10) || 0;
    }

    return timeout;
}

/**
 * 格式化响应数据
 *
 * @param {*} data 要预处理的响应数据
 * @return {Object}
 */
function formatResponseData(data) {
    if (!_.isPlainObject(data)) {
        return {
            data: data
        };
    }

    var result = {};
    processorConf.reservedDataKeys.forEach(function (item, index) {
        if (data[item] != null) {
            result[item.replace(/^_/, '')] = data[item];
            data[item] = undefined;
        }
    });

    // 兼容之前的 timeout 选项
    if (data.timeout != null) {
        result.timeout = data.timeout;
        data.timeout = undefined;
    }

    // 如果没有指定 _data 字段，则其它 data 字段值（不包括预留字段值）作为响应数据
    if (result.data == null) {
        result.data = data;
    }

    return result;
}

/**
 * 后处理响应 mock 的数据信息
 *
 * @param {Object} mockFile 要处理的响应数据文件
 * @param {Object} context 请求上下文
 * @param {Object} options 响应选项信息
 * @param {Function} callback 后处理后执行的回答
 */
function postprocessResponseData(mockFile, context, options, callback) {
    var rawData = mockFile.rawData;
    var processor = _.isPlainObject(rawData) && getProcessor(rawData._process, options);
    var processDone = function (err, data) {
        callback(err, data);
    };

    if (!processor) {
        processDone(null, rawData);
        return;
    }

    // 处理响应文件
    if (typeof processor === 'function') {
        processor(mockFile, context, processDone);
    }
    else {
        logger.error('post process request %s fail, '
            + 'mock file processor %s must export as a function',
            context.url.pathname, processor
        );
        autoresponseUtil.response500(context.res);
    }
}

/**
 * 响应 mock 的数据信息
 *
 * @param {Object|string} data 要响应的数据
 * @param {Object} mockFile 响应的文件
 * @param {Object} context 请求上下文
 * @param {Object} options 响应选项信息
 */
function outputResponseData(data, mockFile, context, options) {
    mockFile.rawData = data;
    postprocessResponseData(
        mockFile, context, options,
        function (err, result, dataType) {
            if (err) {
                logger.error(
                    'post process data:\n %s \nerror happen from file %s: %s',
                    JSON.stringify(data), mockFile.path, err.stack
                );
                autoresponseUtil.response500(context.res);
            }
            else {
                result = formatResponseData(result);
                data = result.data;

                var resType = dataType || mockFile.responseType;
                var isJSONP = resType === 'jsonp';
                if (isJSONP) {
                    _.assign(result, getJSONPResponseData(data, context));
                }
                else if (_.isPlainObject(data) || _.isArray(data)) {
                    _.assign(result, {
                        type: mime.lookup('.json'),
                        data: JSON.stringify(data)
                    });
                }
                else {
                    _.assign(result, {
                        type: mime.lookup(resType ? ('.' + resType) : '.txt'),
                        data: String(data)
                    });
                }

                // 响应数据的处理
                var handlers = [].concat(options.handlers || []);
                handlers.push(function (context, options) {
                    writeResponse(context.res, context.content, options.timeout);
                });

                var index = 0;
                var num = handlers.length;
                context.content = result;
                var next = function () {
                    if (index >= num) {
                        return;
                    }
                    var processIndex = index;
                    index++;
                    handlers[processIndex](context, options, next);
                };
                next();
            }
        }
    );
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
        var extName = mockFile.extname;
        var tplPath = mockDataTpl && mockDataTpl[extName];
        tplPath && (tplPath = autoresponseUtil.getAbsolutePath(tplPath, options));
        tplPath || (tplPath = processorConf.builtinTpl[extName]);

        var readStream;
        if (tplPath) {
            readStream = fs.createReadStream(tplPath).on('error', doneHandler);
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
    var processor = getProcessor(mockFile.extname, options);
    if (autoresponseUtil.isRequestJSFile(context)) {
        processor = null;
    }

    processor || (processor = processorConf.builtinProcessor.static);

    // 处理响应文件
    if (typeof processor === 'function') {
        logger.debug('mock request: %s, use local file: %s',
            context.url.pathname, mockFile.path);

        processor(mockFile, context, function (err, data, dataType) {
            if (err) {
                logger.error(
                    'processor process %s error happen: %s',
                    mockFile.path, err.stack
                );
                autoresponseUtil.response500(context.res);
            }
            else {
                mockFile.responseType || (mockFile.responseType = dataType);
                outputResponseData(data, mockFile, context, options);
            }
        });
    }
    else {
        logger.error('process mock file %s fail, '
            + 'mock file processor %s must export as a function',
            mockFile.path, processor
        );
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
                    logger.error(err.stack);
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
                logger.error('get post params of the mock request error: %s', err.stack);
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
