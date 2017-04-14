/**
 * @file 处理器相关配置信息定义
 * @author sparklewhy@gmail.com
 */

var pathUtil = require('path');

/**
 * 预留的响应数据的 key 名称
 *
 * @type {Array.<string>}
 */
exports.reservedDataKeys = [
    'timeout',   // 响应延时时间，单位毫秒，值为数值或随机延时区间，e.g., 50 or '30,150'
    '_timeout',  // 同上
    '_status',   // http 响应状态码
    '_header',   // 自定义的响应头，e.g., {Location: 'http://www.baidu.com'}
    '_data',     // 响应的数据
    '_process',  // 响应数据的处理器类型名称
    '_tpl',      // 要渲染的模板文件路径，比如 smarty 要渲染的模板文件路径
    '_jsonp',    // 是否以 jsonp 方式响应
    '_callback'  // jsonp 回调请求回调参数名称
];

/**
 * 内建响应数据的预处理器
 *
 * @type {Object}
 */
exports.builtinProcessor = {
    'js': require('./js-processor'),
    'static': require('./static-processor'),
    'smarty': require('./smarty-processor'),
    'php': require('./php-processor')
};

/**
 * 内建的响应数据的模板
 *
 * @type {Object}
 */
exports.builtinTpl = {
    js: pathUtil.join(__dirname, '../tpl/mock-data-tpl.js'),
    json: pathUtil.join(__dirname, '../tpl/mock-data-tpl.json')
};

