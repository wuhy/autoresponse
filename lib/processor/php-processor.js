/**
 * @file 响应 php 资源预处理器
 * @author sparklewhy@gmail.com
 */

var childProcess = require('child_process');
var _ = require('lodash');
var logger = require('../logger');

/**
 * 默认选项
 *
 * @type {Object}
 */
var defaultOptions = {
    bin: 'php-cgi' // 配置 `php-cgi` 执行路径
};

/**
 * 处理 php 文件
 *
 * @see https://github.com/ecomfe/edp-webserver/blob/master/lib/handlers/php.js
 * @see https://github.com/fgnass/gateway/blob/master/gateway.js
 * @see: http://www.cgi101.com/book/ch3/text.html
 *
 * @param {Object} file 要处理的 php 文件
 * @param {Object} options 处理器选项
 * @param {Object} context 当前请求的上下文
 * @param {Function} callback 处理完成回调
 */
function processPhpFile(file, options, context, callback) {
    var request = context.req;
    var docRoot = options.baseDir;

    // 初始化环境变量
    var host = (context.host || '').split(':');
    var env = {
        PATH: process.env.PATH,
        GATEWAY_INTERFACE: 'CGI/1.1',
        SERVER_PROTOCOL: 'HTTP/1.1',
        SERVER_ROOT: docRoot,
        DOCUMENT_ROOT: docRoot,
        SERVER_NAME: host[0],
        SERVER_PORT: host[1] || 80,
        REDIRECT_STATUS: 200,
        SCRIPT_NAME: request.pathname,
        REQUEST_URI: request.url,
        SCRIPT_FILENAME: file.path,
        REQUEST_METHOD: request.method,
        QUERY_STRING: context.url.query || '',
        TRANSFER_ENCODING: 'Chunked'
    };

    var reqHeaders = request.headers;
    for (var h in reqHeaders) {
        if (reqHeaders.hasOwnProperty(h)) {
            var name = 'HTTP_' + h.toUpperCase().replace(/-/g, '_');
            env[name] = reqHeaders[h];
        }
    }

    if ('content-type' in request.headers) {
        env.CONTENT_TYPE = request.headers['content-type'];
    }

    // 开始解析执行 php 文件
    var child = childProcess.spawn(
        options.bin,
        [],
        {env: env}
    );

    var bodyBuffer = [];
    var isBodyData = false;
    var headers = {};
    var line = [];
    var done = function (code) {
        if (code === undefined) {
            return;
        }

        // 等触发 exit 时候再执行 callback
        callback(null, {content: bodyBuffer.join(''), headers: headers});
    };

    child.on('exit', done);
    child.on('error', function () {
        logger.error('php error [' + [].slice.call(arguments) + ']');
    });
    child.stderr
        .on('end', function (chunk) {
            chunk && logger.error('php error:\n' + chunk.toString('utf8') + '\n');
        })
        .on('data', function (chunk) {
            chunk && logger.error('php error:\n' + chunk.toString('utf8') + '\n');
        });
    child.stdout
        .on('end', done)
        .on('data', function (buf) {
            for (var i = 0; i < buf.length; i++) {
                // 如果是主体数据内容
                if (isBodyData) {
                    return bodyBuffer.push(buf);
                }

                // 取出header
                var c = buf[i];
                if (c === 0xA) { // 如果是\n，则一行读取完毕
                    if (!line.length) { // 如果读取到一个空行
                        isBodyData = true;
                        bodyBuffer.push(buf.slice(i + 1));
                        return;
                    }

                    var s = line.join('');
                    line = [];

                    var idx = s.indexOf(':');
                    headers[s.slice(0, idx)] = s.slice(idx + 1).trim();
                }
                else if (c !== 0xD) { // 如果不是\n，也不是\r，说明一行还未读取结束
                    line.push(String.fromCharCode(c));
                }
            }
        }
    );
}

/**
 * php 处理器
 *
 * @param {Object=} options 处理器选项
 * @param {string=} options.bin php-cgi 可执行路径或命令，可选
 * @return {Function}
 */
function phpProcessor(options) {
    var processorOptions = _.assign({}, defaultOptions, options || {});

    return function (mockFile, context, callback) {
        processPhpFile(mockFile, processorOptions, context, function (err, data) {
            if (err) {
                callback(err);
            }
            else {
                /* eslint-disable fecs-camelcase */
                callback(null, {
                    _header: data.headers,
                    _data: data.content
                }, 'html');
                /* eslint-enable fecs-camelcase */
            }
        });
    };
}

/**
 * 是否支持选项配置
 *
 * @type {boolean}
 */
phpProcessor.hasOptions = true;

module.exports = exports = phpProcessor;
