var http = require('http');
var connect = require('connect');

var app = connect();

app.use('/account/getName', function (req, res) {
    res.writeHead(200, {
        'content-type': 'application/json;charset=UTF-8'
    });

    res.end(JSON.stringify({
        name: 'Jack'
    }));
});


app.use(connect.static('./fixtures'));

var httpServer = http.createServer(app);
var port = 7979;
httpServer.listen(port, function () {
    console.log('Http server started on port: %d ...', port);
});