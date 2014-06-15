/**
 * @file 请求自动响应配置
 * @author wuhuiyao@baidu.com
 */

module.exports = {

    /**
     * 默认 响应请求的超时时间，对于使用代理无效
     *
     * @type {number}
     */
    timeout: 0,

    /**
     * 提供自动响应数据的目录
     * 如果路径为相对路径，则相对于该配置文件所在的位置
     *
     * @type {string}
     */
    responseDir: './mock',

    /**
     * 对于要自动响应的请求，如果不存在相应的本地要响应的数据文件，是否自动创建。
     *
     * 如果设为 true，会基于 `mockDataTpl` 配置项，自动创建该mock文件，如果未设置
     * 数据模板，则只是简单创建一个空文件。
     *
     * 如果设为 false，对于要 mock 请求找不到本地 mock 数据文件，则只会打印出错信息，
     * 然后以 404 响应。
     *
     * @type {boolean}
     */
    autoMock: false,

    /**
     * 自动创建 mock 文件的模板定义，该选项只有 `autoMock` 为 true 时才有效。
     *
     * e.g.,
     * {
     *     js: './mock/tpl/mock.js'
     * }
     *
     * key: 为 mock 文件的类型，以文件扩展名作为文件类型定义
     * value: mock 数据的文件模板
     *
     * @type {Object}
     */
    mockDataTpl: null,

    /**
     * 获取要请求的 path 的默认的响应数据文件的路径。
     *
     * 默认规则：
     * 如果是GET请求，且请求指定了文件类型，则请求路径作为响应文件路径返回；
     * 否则，则按如下规则，生成响应文件路径：
     * e.g., 对于 post 请求 path 如果为/biz/abc/efg
     *       对应的响应数据文件位置为：<responseDir>/biz/abc/efg.js
     *
     * @type {function(string, string):string}
     */
    responseFileGenerator: null,

    /**
     * 对 `post` 的请求自动响应内容配置，若想所有 `post` 请求都按照默认规则来产生响应数据进行
     * 响应，设为 true 即可，若想关闭，设为 false。也可以自定义某些 path 的 自动响应方式。
     *
     * NOTICE: 下述指定的响应文件路径，如果是相对路径，都是相对于 `responseDir`
     *
     * e.g.,
     *      [
     *
     *          // 完全匹配
     *          {
     *              match: '/user/getProfile'
     *          },
     *
     *          // 正则匹配
     *          {
     *              match: /^\/user\/\w+\/photo$/
     *          },
     *
     *          // 通过 function 匹配
     *          {
     *              match: function (reqPathName) {
     *                  return true;
     *              }
     *          }，
     *
     *          // 自定义 mock path
     *          {
     *              match: '/user/getDescr',
     *              mock: 'a/b.tpl'
     *          },
     *
     *          // 指定响应的类型为JSONP
     *          {
     *              match: '/user/getDescr',
     *              mock: {
     *                  file: 'a/b.js', // 可以省略，若省略按 `responseFileGenerator`
     *                                  // 生成
     *                  jsonp: true
     *              }
     *          },
     *
     *          // 自定义 mock path
     *          {
     *              match: '/user/getDescr',
     *              mock: {
     *                  proxy: 'localhost:9999'
     *              }
     *          },
     *
     *          // 自定义 mock path,
     *          {
     *              match: '/user/getDescr',
     *              mock: function (reqURL) {
     *                  // return 'a.png'; // 可以直接返回要响应的文件的路径
     *                  // return {
     *                  //    file: 'a.json',
     *                  //    jsonp: true
     *                  // };
     *                  return {
     *                      proxy: 'localhost:9999'
     *                  };
     *              }
     *          }
     *
     *      ]
     *
     * @type {boolean|Array}
     */
    post: true,

    /**
     * 对 `get` 请求响应内容的配置
     * 具体配置同 `post`
     *
     * @type {boolean|Array}
     */
    get: false,

    /**
     * 基于查询参数进行响应，有时候请求是基于 `query` 参数来区分的
     * e.g., http://localhost/index.html?ajaxPath=/a/b
     *
     * NOTICE:
     * 如果 `post` 和 `get` 的没有找到对应的响应方式，才会根据 `query` 进行 响应 查找。
     *
     * e.g.,
     * {
     *      ajaxPath: [
     *          // 同 post
     *      ],
     *
     *      ajaxPath: true // 也可以置为 true , 这样所有 参数 ajaxPath 值都会
     *                     // 按照默认规则来产生响应数据进行响应
     *
     *      // ...
     * }
     *
     * @type {Object}
     */
    query: null,

    /**
     * 如果配置了代理，对于上述配置的 post/get/query 所有匹配到请求，如果自身没有指定代理，
     * 都会采用下述代理方式处理请求的响应。
     *
     * proxy 配置：'localhost:8106'
     *
     * @type {string}
     */
    proxy: null,

    /**
     * 获取 post 请求参数，
     * 默认，自动响应处理时候，会认为 request 的 post 参数未被读取过，会自行读取解析
     * post 参数。如果 post 参数已经被读取解析处理过，可以通过该选项定义。
     *
     * e.g.,
     * function (req, callback) {
     *      // 回调第一个参数，为 error 对象，如果出错，传入 error 信息
     *      // 第二个参数为 post 的参数，必须是已经被解析过的可访问的 object 对象。
     *      callback(null, req.body);
     * }
     *
     * @type {function}
     */
    getPostParams: null,

    /**
     * 自定义的 响应 文件的处理器
     *
     * key:   为响应文件的扩展名
     * value: 为对应的该类型的文件的处理器
     *
     * e.g.,
     * {
     *      php: {
     *          proxy: 'localhost:9999' // 将请求 php 文件重新转给 web 服务器处理
     *      },
     *
     *      tpl: function (responseFile, reqContext, callback) {
     *          var data;
     *          // process response file...
     *
     *          // 第一个参数为 error 对象
     *          // 第二个参数为 要响应的数据
     *          // 第三个参数为 可选，要响应的数据内容类型，以文件扩展名来表示内容类型
     *          //            会根据该内容类型，基于 mime 来设置响应的内容类型。
     *          callback(null, data, 'html')
     *      }
     * }
     *
     * 注意：如果当前请求是GET请求且不是请求JS资源文件或者请求是POST请求，且指定的自动响应文件
     * 为 JS 文件，默认该JS文件将作为 node 模块处理。
     *
     * 可以暴露为函数，该函数会被自动调用，会自动传入如下三个参数：
     * module.exports = function (reqPath, queryParam, postParm) {
     *      return {
     *          timeout: 50, // 通过该属性，来设置请求的响应超时时间
     *          // your data
     *      };
     * };
     *
     * 当然也可以直接暴露一个普通的Object或者字符串作为响应内容：
     * module.exports = {
     *      timeout: 50,
     *      // your data
     * };
     *
     * @type {Object}
     */
    processor: null

};
