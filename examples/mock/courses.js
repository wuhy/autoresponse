module.exports = {
    post: function (path, queryParam, postParam) {
        return {
            status: 0,
            timeout: 220,
            statusInfo: {
                errorCode: '',
                errorLevel: '',
                errorDesc: '',
                parameters: ''
            },
            data: {
                type: 'post'
            }
        };
    },

    get: function (path, queryParam, postParam, context) {
        var params = context.params;
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
                type: 'get',
                params: params
            }
        };
    },

    patch: function (path, queryParam, postParam, context) {
        var params = context.params;
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
                type: 'patch',
                params: params
            }
        };
    }
};
