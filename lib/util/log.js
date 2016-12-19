/**
 * @file 日志模块
 * @author sparklewhy@gmail.com
 */

var util = require('util');
var chalk = require('chalk');

/* eslint-disable fecs-camelcase */
/**
 * 打印的 log 层级定义
 *
 * @type {string}
 * @private
 */
var _logLevel = 'info';
/* eslint-enable fecs-camelcase */

// 定义各个错误层级使用的颜色
var debug = chalk.green;
var info = chalk.green;
var warn = chalk.yellow;
var error = chalk.red;

/* eslint-disable no-console */
// 定义各个层级log配置
var LOG_LEVEL = {
    debug: {
        id: 0,
        logger: console.log,
        prefix: debug('[DEBUG]')
    },
    info: {
        id: 1,
        logger: console.log,
        prefix: info('[INFO]')
    },
    warn: {
        id: 2,
        logger: console.warn,
        prefix: warn('[WARN]')
    },
    error: {
        id: 3,
        logger: console.error,
        prefix: error('[ERROR]')
    }
};
/* eslint-enable no-console */

function padNum(num) {
    var value = String(num);
    var bitNum = 2;

    var padItems = [];
    var padValue = 0;
    for (var i = 0, len = bitNum - value.length; i < len; i++) {
        padItems[padItems.length] = padValue;
    }

    return padItems.join('') + value;
}

/**
 * 获取当前系统时间
 *
 * @return {string}
 */
function getCurrentTime() {
    var date = new Date();

    return date.getFullYear() + '-' + padNum(date.getMonth() + 1)
        + '-' + padNum(date.getDate()) + ' ' + padNum(date.getHours())
        + ':' + padNum(date.getMinutes()) + ':' + padNum(date.getSeconds());
}

/**
 * 获取打印log的方法
 *
 * @inner
 * @param {string} logLevel 要打印的log层级
 * @return {Function}
 */
function getLogger(logLevel) {
    return function () {
        var logType = LOG_LEVEL[logLevel];
        if (logType.id < _logLevel) {
            return;
        }

        var msg = util.format.apply(util, arguments);
        exports.log(logLevel, msg);
    };
}

/**
 * 打印日志
 *
 * @param {string} logLevel 日志 level
 * @param {string} msg 要打印的日志消息
 */
exports.log = function (logLevel, msg) {
    var logType = LOG_LEVEL[logLevel];
    logType.logger(
        chalk.gray(getCurrentTime()) + ' ' + logType.prefix + ' ' + msg
    );
};

/**
 * 设置打印 log 的层级，默认打印层级为 `info`
 * log层级大小定义：
 * debug > info > warn > error
 *
 * @param {string} level 要打印的层级，所有低于给定层级都不打印
 */
exports.setLogLevel = function (level) {
    level && (level = String(level).toLowerCase());
    if (!level || !LOG_LEVEL[level]) {
        level = 'info';
    }

    /* eslint-disable fecs-camelcase */
    _logLevel = level;
    /* eslint-enable fecs-camelcase */
};

/**
 * 显示debug信息
 */
exports.debug = getLogger('debug');

/**
 * 显示info信息
 */
exports.info = getLogger('info');

/**
 * 显示警告信息
 */
exports.warn = getLogger('warn');

/**
 * 显示错误信息
 */
exports.error = getLogger('error');
