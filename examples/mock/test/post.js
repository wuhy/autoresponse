module.exports = {
    post: function (path, queryParam, postParam, context) {
        var method = context.method;
        console.log('method: %s, path: %s, query: %s, post: %s',
            method, path,
            JSON.stringify(queryParam || {}),
            JSON.stringify(postParam || {}));

        return {
            status: 0,
            timeout: 0,
            // _jsonp: false, // response jsonp
            // _callback: 'xxMycallback', // custom jsonp callback param name
            // custom response header
            _header: {
                'xxx': 22
            },
            statusInfo: {
                errorCode: '',
                errorLevel: '',
                errorDesc: '',
                parameters: ''
            },
            data: {

            }
        };
    },

    patch: {
        status: 0,
        statusInfo: 'patch ok'
    }
};