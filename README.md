
autoresponse [![NPM Version](https://img.shields.io/npm/v/autoresponse.svg?style=flat)](https://npmjs.org/package/autoresponse)
========

> A connect middleware for mocking the http request, supporting `edp-webserver` and `webpack-dev-server` mocking

## Install

```shell
npm install autoresponse
```

## Usage

The `autoresponse` mock config, you can specify by a `autoresponse-config.js` config file or passing the mock config params.

```javascript
var autoresponse = require('autoresponse')({
    logLevel: 'info', // the level to print log info
    post: true,       // mock all post request
    patch: true,      // mock all patch request
    get: {
        match: function (reqPathName) { // mock all `/xx/xx` path
            return !/\.\w+(\?.*)?$/.test(reqPathName);
        }
    }
});
```

By default the mock file path is the same as the request url pathname, e.g., the request pathname is `/a/b`, the default mock file path is `<projectRoot>/mock/a/b.js`. If the mock file is not existed, `autoresponse` will auto create the mock file basing the mock file template.

The mock file like this:
```javascript
module.exports = function (path, queryParam, postParam, context) {
    return {
        'timeout': 50,          // response timeout, unit is millisecond, default is 0
        '_timeout': 50,         // The same as timeout
        '_status': 200,         // The response http status code, by default 200
        '_header': {},          // The response header
        '_data': {},            // The response mock data
        '_jsonp': false,        // response jsonp
        '_callback': 'callback' // The jsonp callback param name, default: callback
    };
    
    // mock data placed in `_data` is not required, the following is also valid
    // return {
    //    timeout: 10,
    //    status: 0,
    //    statusInfo: {}
    // };
};
```

If the same request need to mock different request method, you can also write the mock data, like this:

```javascript
module.exports = {
    // mock the post request
    post: function (path, queryParam, postParam, context) {
        return {
            // ...
        };
    },

    // mock the patch request
    patch: {
        status: 0,
        statusInfo: 'patch ok'
    }
};
```

`Autoresponse` supports any file types mocking, you can using `js file`, `json file` or any other custom mock syntax to generate the mock data. For example, you can using `js` to mock `smarty` template rendered without needing `php` programming. If  there is not suitable mock handler, you can also custom it.

Moreover, `autoresponse` provide some useful [mock helpers](#helper) to help generating mock data.

**Tip:** If you need modify the mock config frequently, the best selection is using `autoresponse-config.js` config file, `autoresponse` support auto reload config file by using `watch: true` option without having to restart the dev server. The more usage information you can see [here](#config-file).

The more detail usage, you can see [examples](https://github.com/wuhy/autoresponse/tree/master/examples).

## Using as a connect middleware

```javascript
var autoresponse = require('autoresponse')({ 
    logLevel: 'info',
    post: true
});
app.use(autoresponse);

var serveStatic = require('serve-static');
app.use(serveStatic('./webroot'));
```

## Using in webpack-dev-server

[webpack-dev-server](https://github.com/webpack/webpack-dev-server) is developed based on `express`, so `autoresponse` can as a middleware served it using `setup` option.
 
 ```javascript
 var compiler = Webpack(webpackConfig);
 var server = new WebpackDevServer(compiler, {
     // install middlewares
     setup: function (app) {
         var autoresponse = require('autoresponse');
         app.use(autoresponse({
             logLevel: 'debug',
             root: projectRootPath, // you can specify the project root path
             post: true, // mock all post request
             patch: true // mock all patch request
         }));
     }
 });
 
 server.listen(8888, function() {
     console.log('Starting server on port 8888...');
 });
 ```

## Using in edp-webserver

If you use [EDP](https://github.com/ecomfe/edp) solution, you can also use `autoresponse` middleware in [edp-webserver](https://github.com/ecomfe/edp-webserver) to mock the http request.

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
        // add autoresposne mock handler
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

## Using mock config file <a name="config-file"></a>

Create `autoresponse` middleware:

```javascript
var autoresponse = require('autoresponse')({
    // specify whether need auto reload config file when config file change
    watch: true 
});
```

Create `autoresponse-config.js` file in your web document root, the config file content like the following:

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

* `mock.fake(format, locale)`: the encapsulation of [faker](https://github.com/Marak/faker.js/)

    ```javascript
    // more api and variable name, please refer faker api docs
    mock.fake('{{name.firstName}}-{{name.lastName}}');
    ```

* `mock.fakeCN(format)`: generate chinese locale random information

* `mock.fakeEN(format)`: is equivalent to `mock.fake(format)`, generate english locale random information

* `mock.faker(locale)`: get `faker` instance with the specified locale, the locale argument is default english


More details, please refer to the [autoresponse-config.js](https://github.com/wuhy/autoresponse/blob/master/lib/autoresponse-config.js).
