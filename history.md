0.1.3 / 2015-08-19
===================

  * [^] mockDataTpl路径之前相对于配置文件路径，现在改成相对于responseDir
  * [+] 增加默认的mock数据模板：json 和 js 类型
  * [^] autoMock默认设为true
  * [+] 配置项支持直接传入match的路径、正则或function(reqPath, context){return {match: '', mock: ''}}
  * [+] timeout全局配置包括mock配置的timeout支持随机功能，语法类似于：timeout: '0, 100'
  * [+] 增加特殊响应数据字段：

    - _timeout：（同timeout）

    - _status: 增加设置响应的http状态码

    - _header: 增加自定义的响应数据头信息

    - _data：增加该数据字段，可以把所有要响应的数据统一放在该字段下

    - _process: 增加当前 json 数据需要预处理的后处理器类型，比如 `smarty`

    - _tplPath: 要渲染的模板路径，比如 `smarty` 的模板路径

  * [^] autoresponse-config.js配置文件变化监听用 `chokidar` 模块实现，替换掉不稳定的 `fs.watch` 接口
  * [+] 增加 php 预处理器
  * [+] 增加 smarty 预处理器：可以通过定义 json 数据来直接输出 smarty 模板，也支持部分数据项值替换为 smarty 模板输出
  * [^] 调整下默认的 js 预处理器的 mock 数据方法的 查询参数 和 post 参数顺序
  * [+] 增加 mock 一些辅助的工具方法，通过autoresponse-config.js如下配置选项定义：

    ```
     helperName: 'mock' // 指定 mock 助手工具方法要挂载的全局变量名称，默认值 `mock`
     helper: {_: 'lodash', m: 'moment'} // 这样可以访问：`mock._.merge()`
    ```

    扩展助手工具方法，除了通过该选项配置，也可以通过 `mock.inject({a: function() {}})` 方式添加
    此外还封装了 [faker](http://marak.com/faker.js/) 库来提供随机数据生成方法


