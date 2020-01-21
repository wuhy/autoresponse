/**
 * @file mock 规则解析器
 * @author sparklewhy@gmail.com
 */

/* eslint-disable fecs-camelcase */

var {pathToRegexp, parse} = require('path-to-regexp');
var _ = require('lodash');
var util = require('./autoresponse-util');

module.exports = exports = {};

/**
 * 解析路由规则
 *
 * @param {string} routerPattern 路由 pattern
 * @param {Object|string} mockOption mock 选项
 * @return {Object}
 */
function parseRouterRule(routerPattern, mockOption) {
    var parts = routerPattern.replace(/^\s+/, '').split(/\s+/);

    var methods;
    var reqPath = parts.pop() || '';
    if (parts.length) {
        methods = parts.map(function (k) {
            return k.toLowerCase();
        });
    }

    methods = methods && methods.map(function (key) {
        return ('' + key).toLowerCase();
    });

    var args = [];
    var regexp = pathToRegexp(reqPath, args);
    var tokens = args.length ? parse(reqPath) : null;
    return {
        path: reqPath,
        args: args,
        tokens: tokens,
        regexp: regexp,
        match: regexp,
        methods: methods,
        mock: mockOption
    };
}

/**
 * 解析 mock 规则
 *
 * @inner
 * @param {Object|Array} rules 要解析的 mock 规则
 * @return {Array.<Object>}
 */
function parseMockRules(rules) {
    var result = [];
    if (rules && _.isPlainObject(rules)) {
        // key 为 match; value: 为 mock
        for (var k in rules) {
            if (rules.hasOwnProperty(k)) {
                var mockRule = parseRouterRule(k, rules[k]);
                result.push(mockRule);
            }
        }
    }
    else if (Array.isArray(rules)) {
        for (var i = 0, len = rules.length; i < len; i++) {
            var item = rules[i];

            if (!_.isPlainObject(item)) {
                item = {match: item};
            }

            var match = item.match;
            if (typeof match === 'string') {
                var rule = parseRouterRule(match, item.mock);

                var method = item.method;
                if (method && typeof method === 'string') {
                    rule.methods = [method.toLowerCase()];
                }
                else if (Array.isArray(method)) {
                    rule.methods = method.map(function (k) {
                        return k.toLowerCase();
                    });
                }

                result.push(rule);
            }
            else {
                result.push(item);
            }
        }
    }

    return result;
}

/**
 * 规范化 mock 规则
 *
 * @inner
 * @param {string} method 请求方法
 * @param {Object|Array} rules mock 规则
 * @return {Array.<Object>}
 */
function normalizeMockRules(method, rules) {
    if (!rules) {
        return [];
    }

    if (rules === true) {
        rules = {
            match: function () {
                return true;
            }
        };
    }

    if (!Array.isArray(rules)) {
        rules = [rules];
    }

    var result = parseMockRules(rules);
    method && result.forEach(function (item) {
        item.methods = [method.toLowerCase()];
    });

    return result;
}

/**
 * 匹配给定的路径是否符合给定的规则
 *
 * @inner
 * @param {string|RegExp|Function} matchRule 要匹配的规则
 * @param {string} toMatchPath 要匹配的路径
 * @param {string} method 请求方法
 * @param {Object} reqURL 请求的 url 信息
 * @return {boolean}
 */
function isMatch(matchRule, toMatchPath, method, reqURL) {
    return (matchRule instanceof RegExp && matchRule.test(toMatchPath))
        || (typeof matchRule === 'string' && matchRule === toMatchPath)
        || (typeof matchRule === 'function'
            && matchRule(toMatchPath, method, reqURL));
}

/**
 * 格式化 mock 信息里字符串变量
 *
 * @inner
 * @param {string} pathname 请求路径名
 * @param {Object} rule mock 规则
 * @return {{mock: *, params: Object}}
 */
function formatMockVariables(pathname, rule) {
    var regexp = rule.regexp;
    var matches = regexp && regexp.exec(pathname);
    var params = {};
    var args = rule.args || [];
    var mock = rule.mock;
    if (matches) {
        for (var j = 0, jLen = args.length; j < jLen; j++) {
            params[args[j].name] = matches[j + 1];
        }

        // 替换路由选项中的变量参数
        if (typeof mock === 'string') {
            mock = util.format(mock, params);
        }
        else if (_.isPlainObject(mock)) {
            var tmp = {};
            for (var k in mock) {
                if (mock.hasOwnProperty(k)) {
                    var value = mock[k];
                    if (typeof value === 'string') {
                        value = util.format(value, params);
                    }
                    tmp[k] = value;
                }
            }
            mock = tmp;
        }
    }

    return {
        mock: mock,
        params: params
    };
}

/**
 * 获取默认的 mock 路径，主要针对 restful 请求，默认会移除命名参数的请求路径部分
 * e.g., /users/:id, 默认的 mock 路径为：/users
 *
 * @inner
 * @param {string} pathname 请求路径
 * @param {Object} rule mock 规则
 * @param {Object} params restful url 匹配到的参数信息
 * @return {string}
 */
function getDefaultMockPath(pathname, rule, params) {
    var tokens = rule.tokens;
    if (!tokens) {
        return pathname;
    }

    var mockPath = [];
    var tmp = pathname;
    for (var i = 0, len = tokens.length; i < len; i++) {
        var tokenItem = tokens[i];
        if (typeof tokenItem === 'string') {
            mockPath.push(tokenItem);
            tmp = tmp.replace(tokenItem, '');
        }
        else {
            var name = tokenItem.name;
            var value = params[name];
            tmp = tmp.replace(value, '');
            if (typeof name === 'number' && value !== '') {
                mockPath.push(value);
            }
        }
    }

    if (tmp && !/^\/+$/.test(tmp)) {
        mockPath.push(tmp);
    }

    return mockPath.join('/');
}

/**
 * 缓存的 mock 规则编译结果
 *
 * @type {Object}
 * @private
 */
var _compileMockRules = {};

/**
 * 缓存的查询信息 mock 规则编译结果
 *
 * @type {Object}
 * @private
 */
var _queryCompileMockRules = {};

/**
 * 根据查询参数定义的 mock 规则获取 mock 信息
 *
 * @inner
 * @param {string} method 请求方法
 * @param {Object} queryInfo 当前查询参数信息
 * @param {Object|Array} queryRules 查询参数的 mock 规则定义
 * @param {Object} reqURL 请求的 url 信息
 * @return {?Object}
 */
function getMockInfoByQueryParamRules(method, queryInfo, queryRules, reqURL) {
    if (!queryRules) {
        return null;
    }

    for (var k in queryRules) {

        if (queryRules.hasOwnProperty(k)) {

            var mockRules = _queryCompileMockRules[k];
            if (!mockRules) {
                mockRules = _queryCompileMockRules[k]
                    = normalizeMockRules('get', queryRules[k]);
            }

            var query = queryInfo[k];
            if (query == null) {
                continue;
            }

            var foundMock = exports.match(
                method, query, mockRules, reqURL
            );
            if (foundMock) {
                return foundMock;
            }

        }

    }
}

/**
 * 获取匹配的 mock 规则信息
 *
 * @param {string} method 请求方法
 * @param {string} pathname 请求路径
 * @param {Object} options mock 选项配置
 * @param {Object} reqURL 请求的 url 信息
 * @return {?Object}
 */
exports.findMatchMockRule = function (method, pathname, options, reqURL) {
    method = method.toLowerCase();

    // 初始化 mock 规则
    var mockRules = _compileMockRules.rules;
    if (!mockRules) {
        mockRules = _compileMockRules.rules
            = parseMockRules(options.rules);
    }

    var methodMockRules = _compileMockRules[method];
    if (!methodMockRules) {
        methodMockRules = _compileMockRules[method]
            = normalizeMockRules(method, options[method]);
        mockRules.push.apply(mockRules, methodMockRules);
    }

    // 根据当前请求信息获取匹配到的 mock 规则
    var foundMock = exports.match(method, pathname, mockRules, reqURL);
    if (!foundMock) {
        foundMock = getMockInfoByQueryParamRules(
            method, reqURL.query || {}, options.query, reqURL
        );
    }

    return foundMock;
};

/**
 * 根据给定的 mock 规则，查找匹配的请求方法和路径的 mock 规则
 *
 * @param {string} method 请求的方法
 * @param {string} pathname 请求的路径
 * @param {Array.<Object>} rules mock 规则
 * @param {Object} reqURL 原始的请求 url 对象
 * @return {?Object}
 */
exports.match = function (method, pathname, rules, reqURL) {
    for (var i = 0, len = rules.length; i < len; i++) {
        var ruleItem = rules[i];

        if ((!ruleItem.methods || ruleItem.methods.indexOf(method) !== -1)
            && isMatch(ruleItem.match, pathname, method, reqURL)
        ) {
            var info = formatMockVariables(pathname, ruleItem);
            var mock = info.mock;

            if (typeof mock === 'function') {
                mock = mock(pathname, method, reqURL);
                if (!mock) {
                    return null;
                }
            }

            var mockPath = pathname;
            if (!mock || !mock.file) {
                mockPath = getDefaultMockPath(pathname, ruleItem, info.params);
            }

            return {
                pathname: pathname,
                method: method,
                params: info.params,
                mock: mock,
                mockPath: mockPath
            };
        }
    }
};

/**
 * 解析 mock 规则
 *
 * @param {Object|Array.<Object>} conf 要解析的 mock 配置
 * @return {Array.<Object>}
 */
exports.parse = parseMockRules;

/**
 * 清除 mock 规则缓存的编译结果
 */
exports.clearCache = function () {
    _compileMockRules = {};
    _queryCompileMockRules = {};
};

/* eslint-enable fecs-camelcase */
