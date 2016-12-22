/**
 * @file 响应 smarty 资源预处理器
 * @author sparklewhy@gmail.com
 */

var pathUtil = require('path');
var fs = require('fs');
var _ = require('lodash');
var etpl = require('etpl');

var logger = require('../util/log');
var phpProcessor = require('./php-processor');
var processorConf = require('./processor-config');
var reservedDataKeys = processorConf.reservedDataKeys;

/**
 * 默认选项定义
 *
 * @type {Object}
 */
var defaultOptions = {
    php: null,
    baseDir: '',
    renderFile: 'autoresponse.php',
    initerFile: '',
    render: function (data) {
        if (!this._render) {
            var tpl = fs.readFileSync(
                pathUtil.join(__dirname, '../tpl/smarty-render.php')
            ).toString();
            this._render = etpl.compile(tpl);
        }

        return this._render(data);
    }
};

/**
 * 获取渲染 `smarty` 模板的数据: 滤掉一些预定义的特殊字段的数据
 *
 * @param {Object} data 原始数据
 * @return {Object}
 */
function getSmartyTplData(data) {
    var tplData = data._data;

    if (!tplData) {
        tplData = {};
        Object.keys(data).forEach(function (k) {
            if (reservedDataKeys.indexOf(k) === -1) {
                tplData[k] = data[k];
            }
        });
    }

    return tplData;
}

/**
 * 处理包含 smarty 信息的数据
 *
 * @param {Object} data 要处理的 php 文件的数据
 * @param {Object} options 预处理器的选项
 * @param {Object} context 当前请求的上下文信息
 * @param {Function} callback 执行的回调
 */
function processSmarty(data, options, context, callback) {
    // 初始化 query
    var query = context.url.rawQuery;
    var tplPath = data._tpl;
    data._tpl = undefined;

    _.assign(query, {
        jsonData: JSON.stringify(getSmartyTplData(data)),
        tplPath: tplPath
    });
    var queryStrArr = [];
    Object.keys(query).forEach(function (k, index) {
        queryStrArr[index] = encodeURIComponent(k) + '=' + encodeURIComponent(query[k]);
    });

    // 避免多次调用 query 修改互相影响，copy 一份
    var newUrl = _.assign({}, context.url);
    newUrl.query = queryStrArr.join('&');
    context.url = newUrl;

    var processor = phpProcessor(options.php);
    processor({path: options.phpFile}, context, callback);
}

/**
 * 将包含特定 smarty 渲染信息的数据进行渲染。
 * e.g.,
 * <code>
 * {
 *     _tpl: 'personList.tpl',
 *     _data: {
 *        listData: [{name: 'Jack', from: 'USA'}]
 *     }
 * }
 * </code>
 * 上述数据，最后将转成 `personList.tpl` 渲染后的 html 字符串
 *
 * 局部渲染的例子：
 * <code>
 * {
 *    status: 0,
 *    count: 100,
 *    page: 1,
 *    tpl: {
 *          _tpl: 'personList.tpl',
 *          _data: {
 *              listData: [{name: 'Jack', from: 'USA'}]
 *          }
 *     }
 * }
 * </code>
 *
 * 上述数据，tpl值将最后替换成 `personList.tpl` 渲染后的 html 字符串
 * <code>
 * {
 *    status: 0,
 *    count: 100,
 *    page: 1,
 *    tpl: '<personList.tpl render result>'
 * }
 * </code>
 *
 * @param {Object} data 要渲染的数据
 * @param {Object} options 预处理器的选项
 * @param {Object} context 当前请求的上下文信息
 * @param {Function} callback 执行的回调
 * @return {void}
 */
function renderData(data, options, context, callback) {
    var tplPath = data._tpl;

    if (tplPath) {
        return processSmarty(data, options, context, callback);
    }

    var processObjCounter = 0;
    var renderDone = function (name, err, result) {
        processObjCounter--;
        if (err) {
            callback(err);
        }
        else {
            result && (data[name] = result._data);
            processObjCounter <= 0 && callback();
        }
    };
    var keys = Object.keys(data);
    var toProcessObjs = [];
    for (var i = 0, len = keys.length; i < len; i++) {
        var name = keys[i];
        var value = data[name];
        if (_.isPlainObject(value)) {
            processObjCounter++;
            toProcessObjs.push({
                name: name,
                value: value
            });
        }
    }

    if (processObjCounter) {
        toProcessObjs.forEach(function (item) {
            renderData(item.value, options, context, renderDone.bind(this, item.name));
        });
    }
    else {
        renderDone();
    }
}

/**
 * 重写给定的要响应的数据: json -> smarty
 *
 * @param {Object} mockFile 要处理的 mock 数据文件
 * @param {Object} options 预处理器的选项
 * @param {Object} context 当前请求的上下文信息
 * @param {Function} callback 执行的回调
 */
function rewrite(mockFile, options, context, callback) {
    var rawData = mockFile.rawData;
    var tplPath = rawData._tpl;
    renderData(rawData, options, context, function (err, result) {
        if (err) {
            callback(err);
        }
        else {
            if (tplPath) {
                rawData._data = result._data;
                rawData._header = _.assign(rawData._header || {}, result._header || {});
            }
            callback(null, rawData, tplPath ? 'html' : null);
        }
    });
}

/**
 * 获取处理器的选项
 *
 * @param {Object} options 自定义的选项
 * @return {Object}
 */
function getProcessorOptions(options) {
    var processorOptions = {};
    _.assign(processorOptions, defaultOptions, options || {});
    _.merge(processorOptions, {
        phpFile: pathUtil.join(processorOptions.baseDir, processorOptions.renderFile)
    });

    // 创建 smarty 模板渲染的 php 文件，如果不存在的话
    try {
        var renderFile = processorOptions.phpFile;
        if (!fs.existsSync(renderFile)) {
            var initerFile = processorOptions.initerFile || '';
            if (initerFile) {
                initerFile = 'require("' + initerFile + '");';
            }
            var phpFileContent = processorOptions.render({
                initer: initerFile
            });
            logger.info('create smarty render file: %s', renderFile);
            fs.writeFileSync(renderFile, phpFileContent);
        }
    }
    catch (e) {
        logger.error('init smarty processor fail: %s', e.stack);
    }

    return processorOptions;
}

/**
 * smarty 处理器
 *
 * @param {Object=} options 处理器选项
 * @param {string=} options.php php 处理器的选项，具体参见 {@link php-processor} ，可选
 * @param {string=} options.renderFile 负责渲染 smarty 的 php 文件路径，默认会自动生成，
 *                  如果不存在，路径相对于 `responseDir`，可选
 * @param {string=} options.initerFile 提供 smarty 的初始化配置的 php 文件路径，比如
 *                  `$smarty->left_delimiter = '{';`，该文件路径相对于 `renderFile`
 * @return {Function}
 */
function smartyProcessor(options) {
    var processorOptions = getProcessorOptions(options);

    return function (mockFile, context, callback) {
        context.url.rawQuery = _.merge({}, context.url.query || {});
        if (mockFile.rawData) {
            rewrite(mockFile, processorOptions, context, callback);
            return;
        }

        fs.readFile(mockFile.path, function (err, data) {
            if (err) {
                callback(err);
            }
            else {
                data = data.toString();
                try {
                    data = JSON.parse(data);
                    mockFile.rawData = data;
                    rewrite(mockFile, processorOptions, context, callback);
                }
                catch (e) {
                    callback(null, data, 'txt');
                }
            }
        });
    };
}

/**
 * 是否支持选项配置
 *
 * @type {boolean}
 */
smartyProcessor.hasOptions = true;

module.exports = exports = smartyProcessor;
