var http = require('http');
var connect = require('connect');

var app = connect();

// watch: 监控配置文件变化是否重新reload
// logLevel: 设置控制台打印 log level，如果不想输出太多log信息，可以把log level调高，建议 error
// refer: https://github.com/nomiddlename/log4js-node
var autoresponse = require('../index')({
    watch: true, logLevel: 'debug', handlers: [
        // 增加自定义处理器
        function (context, options, next) {
            console.log(context.content);
            next();
        }
    ]
});
app.use(autoresponse);
app.use('/account/getUserInfo', function (req, res) {
    res.writeHead(200, {
        'content-type': 'application/json;charset=UTF-8'
    });

    res.end(JSON.stringify({
        name: 'Jack',
        age: 33
    }));
});

app.use('/mock/getUserInfo', function (req, res) {
    res.writeHead(200, {
        'content-type': 'application/json;charset=UTF-8'
    });

    res.end(JSON.stringify({
        name: 'I\'m not Jack, 0_0',
        age: 44
    }));
});

app.use('/data/test.php', function (req, res) {
    res.writeHead(200, {
        'content-type': 'text/html;charset=UTF-8'
    });

    res.end('<html><head><title>Test PHP Proxy</title></head><body>Hello PHP</body></html>');
});

app.use(connect.static('./fixtures'));

var httpServer = http.createServer(app);
var port = 9090;
httpServer.listen(port, function () {
    console.log('Http server started on port: %d ...', port);
});
