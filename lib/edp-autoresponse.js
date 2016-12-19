/**
 * @file 用于 edp webserver 自动响应中间件
 *       https://github.com/ecomfe/edp-webserver
 * @author sparklewhy@gmail.com
 */

var qs = require('qs');
var autoresponseProxy = require('./autoresponse-proxy');
var autoresponse = require('./autoresponse');
var logger = require('./util/log');

function getFakeResponse(context) {
    return {
        /* eslint-disable fecs-camelcase */
        _chunks: [],
        /* eslint-enable fecs-camelcase */

        /**
         * @override
         */
        setHeader: function (name, value) {
            context.header[name] = value;
        },

        /**
         * @override
         */
        removeHeader: function (name) {
            delete context.header[name];
        },

        /**
         * @override
         */
        writeHead: function (statusCode, reasonPhrase, headers) {
            context.status = statusCode;

            var h = headers || reasonPhrase;
            if (h) {
                Object.keys(h).forEach(function (k) {
                    context.header[k] = h[k];
                });
            }
        },

        /**
         * @override
         */
        write: function (chunk) {
            this._chunks.push(new Buffer(chunk));
        },

        /**
         * @override
         */
        end: function (data) {
            if (data) {
                this.write(data);
            }
            context.content = Buffer.concat(this._chunks);
            context.start();
        }
    };
}

module.exports = exports = function (options) {
    options.getPostParams || (options.getPostParams = function (req, callback) {

        // parse url-encoded post params
        var postData = req.bodyBuffer || '';
        try {
            var postParam = qs.parse(postData.toString());
            callback(null, postParam);
        }
        catch (e) {
            logger.error(e);

            // 为了能保证正常响应，这里忽略错误信息
            callback(null, {});
        }
    });

    var autoresponseHandler = autoresponse(options);

    var handler = [
        function (context) {
            context.stop();

            /**
             * @override
             */
            autoresponseProxy.proxy = function (reqContext, target) {
                var targetInfo = target.split(':');
                delete context.request.headers.host;

                /* eslint-disable no-undef */
                proxy(targetInfo[0], targetInfo[1])(context);
                /* eslint-enable no-undef */
            };

            autoresponseHandler(
                context.request, getFakeResponse(context), function () {}
            );
        }
    ];

    // 增加自定义的处理器
    var customHandlers = options.handlers;
    if (customHandlers && !Array.isArray(customHandlers)) {
        customHandlers = [customHandlers];
    }
    if (customHandlers) {
        handler.push.apply(handler, customHandlers);
    }
    delete options.handlers;

    return {
        location: function (request) {
            return autoresponse.needAutoresponse(request, null, options);
        },
        handler: handler
    };
};
