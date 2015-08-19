module.exports = function (path, queryParam, postParam) {
    console.log('path: %s, query: %s, post: %s',
        path, JSON.stringify(queryParam || {}), JSON.stringify(postParam || {}));
    console.log('global mock helper: random name = ' + mock.faker().name.findName());
    return {
        status: 0,
        timeout: 0,
        statusInfo: {
            errorCode: '',
            errorLevel: '',
            errorDesc: '',
            parameters: ''
        },
        data: {

        }
    };
};