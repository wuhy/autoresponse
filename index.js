/**
 * @file 自动响应中间件
 * @author sparklewhy@gmail.com
 */

var fs = require('fs');
var pathUtil = require('path');
var _ = require('lodash');

var edpAutoresponse = require('./lib/edp-autoresponse');
var autoresponse = require('./lib/autoresponse');
var defaultOptions = require('./lib/autoresponse-config');
var logger = require('./lib/logger');

var workingDir = process.cwd();

/**
 * 自定义的自动响应的配置文件名
 *
 * @type {string}
 */
var configFile = 'autoresponse-config.js';

/**
 * 加载用户自定义的配置文件：<workingDir>/autoresponse-config.js
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
            configFilePath, ex
        );
        customConfig = {};
    }

    // 添加配置的路径的基目录，配置文件的路径，都是相对于该属性值
    customConfig.baseDir = workingDir;
    return customConfig;
}

/**
 * 读取用户配置文件，初始化自动响应配置
 *
 * @param {Object} options 自动响应配置
 * @param {boolean} watch 是否监控用户配置文件变化，如果变化，会自动 reload 配置文件，并更新
 *                        自动响应的配置选项
 */
function initAutoresponseOptionFromFile(options, watch) {
    var configFilePath = pathUtil.join(workingDir, configFile);
    var updateConfHandler = function (event) {
        var isChange = event === 'change';

        if (isChange) {
            logger.info('Autoresponse config file %s, reload user config file', event);
        }

        if (isChange || !event) {
            _.assign(options, loadUserConfig(configFilePath));
        }
    };

    if (fs.existsSync(configFilePath)) {
        watch && fs.watch(configFilePath, updateConfHandler);
        updateConfHandler();
    }
}

/**
 * 获取自动响应中间件
 *
 * @param {string=} type 中间件类型，当前支持两种，标准 web server 中间件，符合 `connect` 中间件
 *                 接口规范，另一种是 `edp webserver` 中间件
 *                 有效值 `edp` 或者 不传
 * @param {Object=} userConf 用户自定义的自动响应配置，可选，优先级高于配置文件
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

    var options = _.merge({}, defaultOptions);

    initAutoresponseOptionFromFile(options, userConf.watch);
    _.assign(options, userConf);

    logger.info('enable autoresponse middleware...');

    type && (type = type.toLowerCase());
    if (type === 'edp') {
        return edpAutoresponse(options);
    }
    else {
        return autoresponse(options);
    }
};

