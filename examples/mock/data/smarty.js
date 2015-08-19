module.exports = function (path, queryParam, postParam) {
    return {
        status: 0,
        timeout: 0,
        _process: 'smarty',
        statusInfo: {
            errorCode: '',
            errorLevel: '',
            errorDesc: '',
            parameters: ''
        },
        data: {
            listData: []
        }
    };
};