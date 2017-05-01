module.exports = {
    get: function (path, queryParam, postParam) {
        return {
            status: 0,
            timeout: 0,
            statusInfo: {
                errorCode: '333',
                errorLevel: '',
                errorDesc: '',
                parameters: ''
            },
            data: {}
        };
    },
    put: function (path, queryParam, postParam) {
        return {
            status: 0,
            timeout: 0,
            statusInfo: {
                errorCode: 'sdfsfsf',
                errorLevel: '',
                errorDesc: '',
                parameters: ''
            },
            data: {}
        };
    }
};
