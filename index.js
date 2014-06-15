/**
 * @file 自动响应中间件
 * @author sparklewhy@gmail.com
 */

var pathUtil = require('path');
var _ = require('lodash');

var edpAutoresponse = require('./lib/edp-autoresponse');
var autoresponse = require('./lib/autoresponse');
var defaultOptions = require('./lib/autoresponse-config');

var workingDir = process.cwd();

/**
 * 自定义的自动响应的配置文件名
 *
 * @type {string}
 */
var configFile = 'autoresponse-config.js';

/**
 * 加载用户自定义的配置
 *
 * @return {Object}
 */
function loadUserConfig() {
    var configFilePath = pathUtil.join(workingDir, configFile);
    var customConfig;

    try {
        customConfig = require(configFilePath);
        customConfig.baseDir = workingDir;
    }
    catch (ex) {
        console.error(
            'Read User autoresponse config file: %s, error happen: %s',
            configFilePath, ex
        );
        customConfig = {
            baseDir: workingDir
        };
    }

    return customConfig;
}

/**
 * 获取自动响应中间件
 *
 * @type {string=} 中间件类型，当前支持两种，标准 web server 中间件，符合 `connect` 中间件
 *                 接口规范，另一种是 `edp webserver` 中间件
 *                 有效值 `edp` 或者 不传
 */
module.exports = exports = function (type) {
    var options = _.merge(defaultOptions, loadUserConfig());
    type || (type = type.toLowerCase());
    if (type === 'edp') {
        return edpAutoresponse(options);
    }
    else {
        return autoresponse(options);
    }
};

