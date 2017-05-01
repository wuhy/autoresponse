module.exports = function (path, queryParam, postParam, context) {
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
            id: context.params.id
        }
    };
};
