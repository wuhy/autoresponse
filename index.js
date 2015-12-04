/**
 * @file 自动响应中间件
 * @author sparklewhy@gmail.com
 */

var fs = require('fs');
var pathUtil = require('path');
var _ = require('lodash');
var chokidar = require('chokidar');

var edpAutoresponse = require('./lib/edp-autoresponse');
var autoresponse = require('./lib/autoresponse');
var defaultOptions = require('./lib/autoresponse-config');
var mockHelper = require('./lib/processor/mock-helper');
var logger = require('./lib/logger');

var workingDir = process.cwd();

/**
 * 自定义的自动响应的配置文件名
 *
 * @type {string}
 */
var configFile = 'autoresponse-config.js';

/**
 * 加载用户自定义的配置文件：<root>/autoresponse-config.js
 *
 * @param {string} configFilePath 配置文件路径
 * @return {Object}
 */
function loadUserConfig(configFilePath) {
    var customConfig;

    try {
        delete require.cache[require.resolve(configFilePath)];
        customConfig = require(configFilePath);
    }
    catch (ex) {
        logger.error(
            'Try to read User autoresponse config file %s fail: %s',
            configFilePath, ex.stack
        );
        customConfig = {};
    }

    return customConfig;
}

var oldMockHelperName;

/**
 * 获取自动响应配置选项
 *
 * @param {Object} userConf 自定义的选项配置
 * @return {Object}
 */
function getAutoresponseOptions(userConf) {
    var options = {};

    var watch = userConf.watch;
    var root = userConf.root || workingDir;
    var configFilePath = pathUtil.join(root, configFile);
    var hasCustomConfFile = fs.existsSync(configFilePath);

    var updateConfHandler = function (path) {
        if (path) {
            logger.info('Autoresponse config file %s change, reload user config file', path);
        }

        _.assign(
            options, defaultOptions,
            hasCustomConfFile ? loadUserConfig(configFilePath) : {},
            userConf
        );

        // 添加全局的助手工具方法
        mockHelper.inject(options.helper);

        // 将全局助手工具方法导出成全局变量
        oldMockHelperName && (global[oldMockHelperName] = undefined);
        if (options.helperName) {
            var mockGlobalName = options.helperName;
            mockHelper.asGlobal(mockGlobalName) && (oldMockHelperName = mockGlobalName);
        }

        // 添加配置的路径的基目录，配置文件的路径，都是相对于该属性值
        options.baseDir = root;
    };

    if (hasCustomConfFile) {
        // watch && fs.watch(configFilePath, updateConfHandler);
        if (watch) {
            chokidar.watch(configFilePath).on('change', updateConfHandler);
        }
        updateConfHandler();
    }
    else {
        updateConfHandler();
    }

    return options;
}

/**
 * 获取自动响应中间件
 *
 * @param {string=} type 中间件类型，当前支持两种，标准 web server 中间件，符合 `connect` 中间件
 *                 接口规范，另一种是 `edp webserver` 中间件
 *                 有效值 `edp` 或者 不传
 * @param {Object=} userConf 用户自定义的自动响应配置，可选，优先级高于配置文件
 * @param {string=} useConf.root mock 配置文件的根目录，可选，默认当前运行目录
 * @return {Function}
 */
module.exports = exports = function (type, userConf) {
    if (arguments.length === 1 && _.isPlainObject(type)) {
        userConf = type;
        type = null;
    }

    userConf || (userConf = {});

    // 设置 log level
    var logLevel = userConf.logLevel;
    if (logLevel) {
        logger.setLevel(String(logLevel).toUpperCase());
    }

    logger.info('enable autoresponse middleware...');

    var options = getAutoresponseOptions(userConf);
    type && (type = type.toLowerCase());
    if (type === 'edp') {
        return edpAutoresponse(options);
    }
    return autoresponse(options);
};

