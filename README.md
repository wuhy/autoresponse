
autoresponse
========

自动响应请求中间件，可用于本地搭建的 node web server 请求 mock，支持本地 mock 和 代理。

## Install

```shell
npm install autoresponse
```

## Using with connect middleware

```javascript
var autoresponse = require('autoresponse')({ 
    watch: true,      // 配置文件变化，自动重新加载
    logLevel: 'info'  // 要打印的 log level
});
app.use(autoresponse);
app.use(connect.static('./webroot'));
```

自动响应配置，可以通过上述参数配置传入，建议通过 `autoresponse-config.js` 配置文件定义，关于配置说明请参考 `examples` 目录

## Using with [edp webserver](https://github.com/ecomfe/edp-webserver)

```javascript
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
        // ...
        require('autoresponse')('edp', { watch: true, logLevel: 'info' }),
        { 
            location: /^.*$/, 
            handler: [
                file(),
                proxyNoneExists()
            ]
        }
    ];
};
```

## 一个简单配置文件说明

在当前 webserver 根目录下创建 `autoreponse-config.js`  

```javascript
module.exports = {
    // 要响应的数据跟目录
    responseDir: './mock',

    /**
     * 对 `get` 请求响应内容的配置
     * 也支持 对 post 和 query 参数 进行自动响应，可以参见 examples
     *
     * @type {boolean|Array}
     */
    get: [
        {
            match: '/b.html',
            mock: 'c.html'
        },
        {
            match: '/account/getUserInfo', // also support regex and function
            mock: {
                proxy: 'localhost:9090'  // use proxy
            }
        },
        {
            // default mock file: <responseDir>/user/profile.js
            // it'will be processed as a node module by builtin js-processor
            match: '/user/profile' 
        },
        {
            match: '/data/list',
            mock: 'data/list.json'
        },
        {
            match: '/php',
            mock: {
                path: '/data/test.php' // rewrite request path
            }
        }
    ] 
};
```

 