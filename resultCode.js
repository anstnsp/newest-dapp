exports.resultCode = {
    SUCCESS: {status: 200, code: "0", message: 'Success'},
    REQUIRED_PARAMETER: {status: 400, code: 'DAP001', message: 'Required parameters are missing...'},
    JSON_PARSE_ERROR: {status: 400, code: 'DAP002', message: 'Parameters are not json syntax'},
    DUPLICATE_KEY : {status: 400, code: 'DA003', message: 'Key is duplicate'},
    FABRIC_QUERY_ERROR: {status: 500, code: 'DAP004', message: "Fabric query error..."},
    FABRIC_INVOKE_ERROR: {status: 500, code: 'DAP005', message: "Fabric invoke error..."},
    FABRIC_GATEWAY_CONNECT_ERROR : {status: 500, code: 'DAP006', message: 'Gateway connection is failed'},
    FABRIC_GET_CONTRACT_ERROR : {status: 500, code: 'DAP007', message: 'Get contract is failed'},
    FABRIC_ETC_ERROR : {status: 500, code: 'DAP008', message: "Fabric etc error... "}
    
};

exports.getResponse = (response, resultCode, data) => {
    let resultObj;
    let commonObj = {
        resultCode: resultCode.code,
        resultMsg: resultCode.message
    };

    if (data) {
        resultObj = Object.assign({}, commonObj, data);
        // resultObj = Object.assign({}, data);
    } else {
        resultObj = commonObj;
    }

    return response.status(resultCode.status).json(resultObj);
};

exports.getResponseWithExternalCode = (response, code, message, statusCode) => {
    let resultObj = {
        resultCode: code,
        resultMsg: message
    };

    return response.status(statusCode ? statusCode : 200).json(resultObj);
};