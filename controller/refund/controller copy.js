const service = require('../../services/block/index');
const logger2   = require('../../utils/logger2')
const {resultCode, getResponse, getResponseWithExternalCode} = require('../../resultCode');

/**
 * 환불상품정보 조회 처리(PUBLIC)
 * @param {Request} req 요청객체
 * @param {Response} res 응답객체
 */
exports.query_item = (req, res, next) => {
 
    logger2.info('################################# query_item start #################################');
    // if(!req.query.gdCd) {
    //     logger2.error('query error: Required Parameters fail, params => %s', req.params.refundNumber);
    //     return getResponse(res, resultCode.REQUIRED_PARAMETER);
    // }
    //queryRefundData
    req.fn = 'queryRefundData';
    next();


}

/**
 * 환불상품정보 조회 처리(PUBLIC+PRIVATE)
 * @param {Request} req 요청객체
 * @param {Response} res 응답객체
 */
exports.query_item_with_private =  (req, res, next) => {
 
    logger2.info('################################# query_item_with_private start #################################');
    // if(!req.query.rfdmSq) {
    //     logger2.error('query error: Required Parameters fail, params => %s', JSON.stringify(req.query.rfdmSq));
    //     return getResponse(res, resultCode.REQUIRED_PARAMETER);
    // }
    //queryUserData
    req.fn = 'queryUserData';
    next();

}

/**
 * 환불상품정보 조회 처리(rich query [WHERE COLUMN : VALUE])
 * @param {Request} req 요청객체
 * @param {Response} res 응답객체
 */
exports.query_item_by_columnname_value =  (req, res, next) => {
    console.log('%%%%%%%%%%%%%%%%%%%%'+Object.keys(req.query))
    logger2.info('################################# query_item_by_columnname_value start #################################');
    //현재 체인코드의 rich query함수는 원하는 하나의 컬럼의 값으로 조회하게 되어 있다. 
    //req.query의 key는 조회할 컬럼명 , req.query의 value는 조회할 컬럼의 값이 된다. 
    //URL: 도메인/refund?컬럼명=값
    if(Object.keys(req.query).length !== 1) { //보낸 파라미터 갯수 틀릴 때 
        logger2.error('query error: Invalid Parameters number, params => %s', JSON.stringify(req.query));
        return getResponse(res, resultCode.INVALID_PARAMETER_NUMBER);
    }
    req.fn = 'queryPubRefStatCd';
    next();

}

/**
 * 환불상품 등록(PUBLIC+PRIVATE)
 * @param {Request} req 요청객체
 * @param {Response} res 응답객체
 */
exports.insert_item_with_private = (req, res, next) => {
   
    logger2.info('################################# insert_item_with_private start #################################');
    //필수파라미터 체크 
    let publicList = req.body.pub;
    let privateList = req.body.priv;

    //publicdata 필수값 체크 
    publicList.forEach( (data, i) => {
        if(!data.refundNumber || !data.refundData.orderSequence || !data.refundData.productCode || !data.refundData.refundStatusCode
            !data.refundData.refundStatusMemo || !data.refundData.companyCode || !data.refundData.deliverCode || !data.refundData.refundDate
            || !data.refundData.retryYn || !data.refundData.fastRefundYn || !data.refundData.refundReason || !data.refundData.refundFee
            || !data.refundData.invoiceNumber) {
            logger2.error('create/update error: Required Parameters fail, params => %s', JSON.stringify(publicList));
            return getResponse(res, resultCode.REQUIRED_PARAMETER);      
        }
    })
    
    //private data 필수값 체크 
    privateList.forEach( (data,i) => {
        if(!data.refundNumber || !data.userData.orderCode  || !data.userData.customerName 
            || !data.userData.zipCode || !data.userData.baseAddress || !data.userData.detailAddress || !data.userData.telNumber
            || !data.userData.cellNumber || !data.userData.shippingContents) {
                logger2.error('create/update error: Required Parameters fail, params => %s', JSON.stringify(privateList));
                return getResponse(res, resultCode.REQUIRED_PARAMETER);  
            }
    })

    req.fn = 'requestRefunds';
    next();

}

/**
 * 환불상품 수정(PUBLIC+PRIVATE)
 * @param {Request} req 요청객체
 * @param {Response} res 응답객체
 */
exports.update_item_with_private = (req, res, next) => {
   
    logger2.info('################################# update_item_with_private start #################################');
    let publicList = req.body.pub;
    let privateList = req.body.priv;
    //publicdata 필수값 체크 
    publicList.forEach( (data, i) => {
        if(!data.refundNumber || !data.refundData.orderSequence || !data.refundData.productCode || !data.refundData.refundStatusCode
            !data.refundData.refundStatusMemo || !data.refundData.companyCode || !data.refundData.deliverCode || !data.refundData.refundDate
            || !data.refundData.retryYn || !data.refundData.fastRefundYn || !data.refundData.refundReason || !data.refundData.refundFee
            || !data.refundData.invoiceNumber) {
            logger2.error('create/update error: Required Parameters fail, params => %s', JSON.stringify(publicList));
            return getResponse(res, resultCode.REQUIRED_PARAMETER);      
        }
    })
    
    //private data 필수값 체크 
    privateList.forEach( (data,i) => {
        if(!data.refundNumber || !data.userData.orderCode  || !data.userData.customerName 
            || !data.userData.zipCode || !data.userData.baseAddress || !data.userData.detailAddress || !data.userData.telNumber
            || !data.userData.cellNumber || !data.userData.shippingContents) {
                logger2.error('create/update error: Required Parameters fail, params => %s', JSON.stringify(privateList));
                return getResponse(res, resultCode.REQUIRED_PARAMETER);  
            }
    })
    req.fn = 'retryRefund'; //재접수임 
    // req.fn = 'requestReturnItem' //수거접수
    next();

}

/**
 * 환불상품 수정(PUBLIC)
 * @param {Request} req 요청객체
 * @param {Response} res 응답객체
 */
exports.update_item = (req, res, next) => {
   
    logger2.info('################################# update_item start #################################');
    let publicList = req.body.pub;

    //필수값 체크 
    publicList.forEach( (data,i) => {
        if(!data.refundNumber || !data.refundData.refundStatusCode || !data.refundData.companyCode) {
          logger2.error('create/update error: Required Parameters fail, params => %s', JSON.stringify(publicList));
          return getResponse(res, resultCode.REQUIRED_PARAMETER);           
        }
    })
    let status = publicList[0].refundData.refundStatusCode;

// -빠른환불취소(public update) [F8] cancelRefund
// -빠른환불완료(public update)[F4] 함수명:completeRefund
// -이의제기(public update)[F9] 함수명:registerComplaint
    if(status === 'F8') {
        req.fn = 'cancelRefund'
    }else if(status === 'F4') {
        req.fn = 'completeRefund'
    }else if(status === 'F9') {
        req.fn = 'registerComplaint'
    }
    // req.fn = 'updatePub';
    next();

}

exports.common_insert_update = (req, res) => {

    req.body.fn = req.fn;

    service.block_create_service(req.body, (blockCreateError, data) => {
        if(blockCreateError) { 
            if(blockCreateError.code) {
                logger2.error("create/update refundNumber: %s, error code(%s), msg(%s)", req.body.pub[0].refundNumber, blockCreateError.code, blockCreateError.msg);
                return getResponseWithExternalCode(res, blockCreateError.code, blockCreateError.msg);
            } else {
                return getResponse(res, resultCode.FABRIC_INVOKE_ERROR);
            }
        } else {
            return getResponse(res, resultCode.SUCCESS);
        }
    });

}

exports.common_query = (req, res) => {

    let params = {
        refundNumber : req.params.refundNumber, //주문번호
        // column_value : req.query,            //rich query용 컬럼과 값 
        fn : req.fn                          //호출할체인코드명
    }

    service.block_search_service(params, (blockSearchError,data) => {
        logger2.info('search refundNumber: %s, block search error: %s', params.refundNumber, blockSearchError !== null)

        if(blockSearchError) {
            if(blockSearchError.code) {
                logger2.error("search refundNumber: %s, error code(%s), msg(%s)", params.refundNumber, blockSearchError.code, blockSearchError.msg);
                return getResponseWithExternalCode(res, blockSearchError.code,blockSearchError.msg);
            } else {
                return getResponse(res, resultCode.FABRIC_QUERY_ERROR);
            }
        } else {
            logger2.info('response data : %s', JSON.stringify(data));
            return getResponse(res, resultCode.SUCCESS, data);
        }
    });

}