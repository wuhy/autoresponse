/**
 * @file 文件相关的工具方法
 * @author sparklewhy@gmail.com
 */

var fs = require('fs');
var pathUtil = require('path');

/**
 * 获取给定文件路径的扩展名称
 *
 * @param  {string} filePath 文件路径
 * @return {string}
 */
exports.getFileExtName = function (filePath) {
    var lastDotIdx = filePath.lastIndexOf('.');

    if (lastDotIdx >= 0) {
        return filePath.substr(lastDotIdx + 1);
    }
    return '';
};

/**
 * 同步创建给定的目录路径，如果路径中存在某一目录不存在，会尝试创建
 *
 * NOTICE：由于是同步方法，因此需要自行执行捕获可能抛出的异常
 *
 * @param {string} path 路径 要创建目录的路径
 * @param {number=} mode 创建的目录的权限，可选
 */
exports.mkdirsSyn = function (path, mode) {

    // 初始化未存在目录的路径
    var checkPath = path;
    var toMkdirs = [];
    while (checkPath && !fs.existsSync(checkPath)) {
        toMkdirs.push(checkPath);
        checkPath = pathUtil.dirname(checkPath);
    }

    // 按路径深度逐一创建不存在的目录
    for (var i = toMkdirs.length - 1; i >= 0; i--) {
        fs.mkdirSync(toMkdirs[i], mode);
    }
};

/**
 * 判断给定的文件路径是否是相对路径
 *
 * @param {string} path 文件路径
 * @return {boolean}
 */
exports.isRelativePath = function (path) {
    path = pathUtil.normalize(path);
    return pathUtil.resolve(path) !== path;
};
