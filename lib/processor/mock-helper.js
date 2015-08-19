/**
 * @file 提供 mock 常用的一些辅助工具方法
 * @author sparklewhy@gmail.com
 */

var _ = require('lodash');
var logger = require('../logger');

/**
 * 预定义的 mock 助手工具方法
 *
 * @type {{inject: Function}}
 */
var mockHelper = {

    /**
     * 注入 mock 助手工具方法
     *
     * @param {Object} helper 要注入的助手方法
     */
    inject: function (helper) {

        helper || (helper = {});
        Object.keys(helper).forEach(function (name) {
            if (mockHelper[name]) {
                logger.error(
                    'mock helper name: %s has existed in the mock global variable.'
                );
            }
            else {
                var value = helper[name];
                if (_.isString(value)) {
                    exports[name] = require(value);
                }
                else {
                    exports[name] = value;
                }
            }
        });
    },

    /**
     * 将该助手工具方法导出成全局变量
     *
     * @param {string} name 全局变量的名称
     * @return {boolean}
     */
    asGlobal: function (name) {
        if (global[name]) {
            logger.error('export global variable `%s` fail, the variable has existed!', name);
            return false;
        }

        logger.info('export global mock helper variable %s', name);

        /**
         * 暴露全局 `mock` 变量
         *
         * @type {Object}
         */
        global[name] = exports;
        return true;
    }
};

_.merge(exports, mockHelper);
