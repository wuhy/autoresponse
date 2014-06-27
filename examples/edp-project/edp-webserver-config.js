exports.port = 8888;
exports.directoryIndexes = true;
exports.documentRoot = __dirname;

var autoresponse = require('./tool/autoresponse');

exports.getLocations = function () {
    return [
        { 
            location: '/', 
            handler: home( 'index.html' )
        },
        {
            location: /\.html\b.*$/,
            handler: [
                file()
            ]
        },
        { 
            location: /^\/redirect-local/, 
            handler: redirect('redirect-target', false) 
        },
        { 
            location: /^\/redirect-remote/, 
            handler: redirect('http://www.baidu.com', false) 
        },
        { 
            location: /^\/redirect-target/, 
            handler: content('redirectd!') 
        },
        { 
            location: '/empty', 
            handler: empty() 
        },
        { 
            location: /\.css\W?.*$/,
            handler: [
                autoless()
            ]
        },
        { 
            location: /\.less\W?.*$/,
            handler: [
                file(),
                less()
            ]
        },

        // =================================================================

        // 添加自动响应处理器
        autoresponse('edp', { watch: true, logLevel: 'info' }),

        // =================================================================

        { 
            location: /^.*$/, 
            handler: [
                file(),
                proxyNoneExists()
            ]
        }
    ];
};

exports.injectRes = function ( res ) {
    for ( var key in res ) {
        global[ key ] = res[ key ];
    }
};
