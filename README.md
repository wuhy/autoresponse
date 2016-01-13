
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
    watch: true,      // reload autoresponse-config.js file when the file is changed
    logLevel: 'info'  // the log level to be printed
});
app.use(autoresponse);
app.use(connect.static('./webroot'));
```

自动响应配置，可以通过上述参数配置传入，如果有频繁修改 mock 的映射的，建议通过 `autoresponse-config.js` 配置文件定义，关于配置说明请参考 `examples` 目录，否则可以直接通过创建 `autoresponse` 实例时候直接传入：

```javascript
var autoresponse = require('autoresponse')({
    logLevel: 'info',
    post: true,
    get: {
        match: function (reqPathName) { // mock all `/xx/xx` path
            return !/\.\w+(\?.*)?$/.test(reqPathName);
        }
    }
});
```

推荐按上面方式进行 mock，简单直接，无需频繁添加 mock 请求：所有 post 请求 和 满足条件的 get 请求都将被 mock（要求 get pathname 为 `/xx/xx` 不带文件名后缀，可以根据实际业务情况，进行这个逻辑调整）。

默认的 mock 文件跟请求的路径名一一对应，比如：请求 a/b/c，则 mock 文件为：<projectDir>/mock/a/b/c.js。触发该 mock 请求的时候，**默认如果 mock 文件不存在会自动创建该文件**。

mock 文件支持 `js`、`json`、`php` 等文件类型的 mock，对于使用 `smarty` 渲染的页面，也可以直接用 `js` 进行 mock，无需使用 `php`，更多 mock 配置和使用参见下面说明。

此外，mock 提供了一些常用的[助手方法](#helper)

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

## A simple autoresponse configure example

Create `autoresponse-config.js` file in your web document root.

```javascript
module.exports = {
    // The response directory to mock, by default is `mock`
    responseDir: './mock',

    /**
     * configure the `get` request, determine the request path and the file to be mocked.
     * You can also configure the `post` request and `query` params to mock.
     * More information, please refer to examples.
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
        },
        {
            match: '/a/b',
            mock: 'a/b.php' // mock with php file which is processed by php processor
        },
        '/account/getUserInfo', // specify the match path
        function (reqPath, context) { // using function to determine which request to mock
            return {
                match: 'a/b'
            };
        }
    ] 
};
```

## Using smarty processor

Convert `json` data to `html` or `html segment` using `smarty` template engine.

**prepare：**

* install php-cgi
    * [for mac](https://gist.github.com/xiangshouding/9359739)
    * [for windows](https://gist.github.com/lily-zhangying/9295c5221fa29d429d52)

* processor configure

```javascript
// add this config to autoresponse
processor: {
    smarty: {
        // specify the initialize configure file, the file path is relative to `responseDir`
        // the file content you can refer below
        initerFile: './initer.php',

        // you also can specify your php-cgi path here, default using `php-cgi`
        php: {bin: '<php-cgi path>'}
    }
}
```

```php
<?php

// ============== initer.php ================

error_reporting(0);
ini_set('error_reporting', E_ALL & ~E_NOTICE);

$project_root = dirname(dirname(__FILE__));

require dirname($project_root) . '/libs/Smarty.class.php';

// initialize the smarty variable
$smarty = new Smarty;

$smarty->force_compile = true;
$smarty->debugging = false;
$smarty->caching = false;

// specify the delimiter chararter
$smarty->left_delimiter = '{';
$smarty->right_delimiter = '}';

// setting the template directory and output directory for compilation
$smarty->setTemplateDir($project_root . '/templates/');
$smarty->setCompileDir($project_root . '/templates_c/');
```

* write smarty json data using js processor

    * output html document

        ```javascript
        module.exports = function (path, queryParam, postParam) {
            return {
                // of course, you can specify the delay time with a random value between 0 and 100
                _timeout: '0,100',

                // if you wanna simulate the special status, you can use this
                _status: 404,

                // tell autoresponse that the json data will be processed by smarty processor
                _process: 'smarty',

                // the smarty template name will be rendered
                _tpl: 'a/b.tpl',

                // define the template data to be applied to smarty template file
                _data: {
                    extData: [],
                    tplData: {}
                }
            };
        };
        ```

    * output json with smarty render result


        ```javascript
        module.exports = function (path, queryParam, postParam) {
            return {
                // the json data will be processed by smarty processor
                _process: 'smarty',

                filters: [],

                // the smarty render result will be replaced as the value of `filterTpl`
                filterTpl: {
                     // the smarty template name will be rendered
                     _tpl: 'filter.tpl',
                     // define the template data to be applied to smarty template file
                     _data: {
                         extData: [],
                         tplData: {}
                     }
                }
            };
        };
        ```


## Using mock helper method <a name="helper"></a>

By default, if you use js file to mock, you can access `mock` global variable in your mock file.

The following methods are provided by default:

* `mock._`: [lodash](https://lodash.com/docs) variable

* `mock.m`: [moment](http://momentjs.com/docs/) variable

* `mock.fake(format, locale)`: the encapsulation of [faker](http://marak.com/faker.js/)

    ```javascript
    // more api and variable name, please refer faker api docs
    mock.fake('{{name.firstName}}-{{name.lastName}}');
    ```

* `mock.fakeCN(format)`: generate chinese locale random information

* `mock.fakeEN(format)`: is equivalent to `mock.fake(format)`, generate english locale random information

* `mock.faker(locale)`: get `faker` instance with the specified locale, the locale argument is default english


More details, please refer to the annotation of `autoresponse-config.js`.
