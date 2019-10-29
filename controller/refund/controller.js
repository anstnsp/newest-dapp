const service = require('../../services/block/index');
// const logger   = require('../../utils/logger').logger;
const logger = require('log4js').getLogger("controller")
const moment = require('moment');
const {resultCode, getResponse, getResponseWithExternalCode} = require('../../resultCode');

/**
 * 환불상품정보 조회 처리(PUBLIC)
 * @param {Request} req 요청객체
 * @param {Response} res 응답객체
 */
exports.query_item = (req, res, next) => {
 
    logger.info('################################# query_item start #################################');
    let params;

    try{
        params = req.query.params; //빠른환불admin에게 받은 그대로의 queryString 데이터 
        const parsedParams = JSON.parse(params); //받은 데이터를 json 파싱 
        for(let i=0; i<parsedParams.length; i++) { //필수값인 refundNumber 체크 
            if(!parsedParams[i].refundNumber || parsedParams[i].refundNumber.length === 0) {
            logger.error('query error: Required Parameters fail, params => %s', JSON.stringify(params));
            return getResponse(res, resultCode.REQUIRED_PARAMETER);            
            }
        }
        req.fn = 'queryRefundData';
        next();
    }catch(error) {
        //SyntaxError: Unexpected token } in JSON at position 17
        if (error.name === 'SyntaxError' || error.message.indexOf('Unexpected token ') === 0) {
            logger.error('query error: Json parse fail, params => %s', JSON.stringify(params));
            return getResponse(res, resultCode.JSON_PARSE_ERROR);   
          }
    }

}

/**
 * 환불상품정보 조회 처리(PUBLIC+PRIVATE)
 * @param {Request} req 요청객체
 * @param {Response} res 응답객체
 */
exports.query_item_with_private =  (req, res, next) => {
 
    logger.info('################################# query_item_with_private start #################################');
    let params;
    try{
        params = req.query.params;
        const parsedParams = JSON.parse(params);
        for(let i=0; i<parsedParams.length; i++) {
            if(!parsedParams[i].refundNumber || parsedParams[i].refundNumber.length === 0) {
            logger.error('Required Parameters fail, params => %s', JSON.stringify(params));
            return getResponse(res, resultCode.REQUIRED_PARAMETER);            
            }
        }
        req.fn = 'queryUserData';
        next();
    }catch(error) {
        //SyntaxError: Unexpected token } in JSON at position 17
        if (error.name === 'SyntaxError' || error.message.indexOf('Unexpected token ') === 0) {
            logger.error('Json parse fail, params => %s', JSON.stringify(params));
            return getResponse(res, resultCode.JSON_PARSE_ERROR);   
          }
    }

}

/**
 * 환불상품정보 조회 처리(rich query [WHERE COLUMN : VALUE])
 * @param {Request} req 요청객체
 * @param {Response} res 응답객체
 */
exports.query_item_by_columnname_value =  (req, res, next) => {
    console.log('%%%%%%%%%%%%%%%%%%%%'+Object.keys(req.query))
    logger.info('################################# query_item_by_columnname_value start #################################');
    //현재 체인코드의 rich query함수는 원하는 하나의 컬럼의 값으로 조회하게 되어 있다. 
    //req.query의 key는 조회할 컬럼명 , req.query의 value는 조회할 컬럼의 값이 된다. 
    //URL: 도메인/refund?컬럼명=값
    if(Object.keys(req.query).length !== 1) { //보낸 파라미터 갯수 틀릴 때 
        logger.error('Invalid Parameters number, params => %s', JSON.stringify(req.query));
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
exports.insert_item_with_private = async (req, res, next) => {
   
    // logger.info('################################# insert_item_with_private start #################################');

    //1.request에 pub, priv가 있는지 체크
    if(!req.body.pub || !req.body.priv) {
        console.log('여긴 pub, 랑 priv 체크구간 ')
        logger.error('create error: pub, priv  do not exist in body, params => %s', JSON.stringify(req.body));
        return getResponse(res, resultCode.REQUIRED_PARAMETER);   
        
    }
    try {
        let publicList = req.body.pub;
        let privateList = req.body.priv;
        // console.log('^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^')
        // console.log(publicList)
        // console.log(privateList)
        // console.log('^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^')
        await checkParamsValidation(publicList, privateList);
        //publicData 필수값 체크하면서 회사코드 넣기 
        for(let i=0; i<publicList.length; i++){
            publicList[i].refundData.companyCode = process.env.COMPANYCODE;
            publicList[i].refundData.lastUpdateDate = moment().format('YYYYMMDDHHmmss');
            if(!publicList[i].refundNumber || !publicList[i].refundData.orderSequence || !publicList[i].refundData.productCode || (typeof publicList[i].refundData.retryYn) !== 'boolean'
            || (typeof publicList[i].refundData.fastRefundYn) !== 'boolean' || !publicList[i].refundData.refundStatusCode || !publicList[i].refundData.refundDate || !publicList[i].refundData.refundReason || !publicList[i].refundData.refundFee
            || !publicList[i].refundData.sellerCode ){
                
                logger.error('Required Public Parameters fail, params => %s', JSON.stringify(publicList));
                return getResponse(res, resultCode.REQUIRED_PARAMETER);           
            }
        }
        //privateData 필수값 체크 
        for(let i=0; i<privateList.length; i++) {
            if(!privateList[i].refundNumber || !privateList[i].userData.orderCode || !privateList[i].userData.customerName
                || !privateList[i].userData.zipCode || !privateList[i].userData.baseAddress || !privateList[i].userData.detailAddress
                || (!privateList[i].userData.telNumber && !privateList[i].userData.cellNumber) || !privateList[i].userData.extraMemo) {

                    logger.error('Required Private Parameters fail, params => %s', JSON.stringify(publicList));
                    return getResponse(res, resultCode.REQUIRED_PARAMETER);         
                }
        }

        req.fn = 'requestRefunds';
        req.body.pub = publicList;
        next();

    }catch(error) {
        return getResponse(res, error);         
    }


}

/**
 * 환불상품 수정(PUBLIC+PRIVATE)
 * @param {Request} req 요청객체
 * @param {Response} res 응답객체
 */
exports.update_item_with_private = async (req, res, next) => {
   
    logger.info('################################# update_item_with_private start #################################');
    //1.request에 pub, priv가 있는지 체크
    if(!req.body.pub || !req.body.priv) {
        console.log('여긴 pub, 랑 priv 체크구간 ')
        logger.error('create error: pub, priv  do not exist in body, params => %s', JSON.stringify(req.body));
        return getResponse(res, resultCode.REQUIRED_PARAMETER);   
    }
    try {
        let publicList = req.body.pub;
        let privateList = req.body.priv;
        await checkParamsValidation(publicList, privateList);
        //publicData 필수값 체크하면서 회사코드 넣기 
        for(let i=0; i<publicList.length; i++){
            publicList[i].refundData.companyCode = process.env.COMPANYCODE;
            publicList[i].refundData.lastUpdateDate = moment().format('YYYYMMDDHHmmss');
            if(!publicList[i].refundNumber || !publicList[i].refundData.orderSequence || !publicList[i].refundData.productCode || (typeof publicList[i].refundData.retryYn) !== 'boolean'
            || (typeof publicList[i].refundData.fastRefundYn) !== 'boolean' || !publicList[i].refundData.refundStatusCode || !publicList[i].refundData.refundDate || !publicList[i].refundData.refundReason || !publicList[i].refundData.refundFee
            || !publicList[i].refundData.sellerCode ){
                
                logger.error('Required Public Parameters fail, params => %s', JSON.stringify(publicList));
                return getResponse(res, resultCode.REQUIRED_PARAMETER);           
            }
        }
        //privateData 필수값 체크 
        for(let i=0; i<privateList.length; i++) {
            if(!privateList[i].refundNumber || !privateList[i].userData.orderCode || !privateList[i].userData.customerName
                || !privateList[i].userData.zipCode || !privateList[i].userData.baseAddress || !privateList[i].userData.detailAddress
                || (!privateList[i].userData.telNumber && !privateList[i].userData.cellNumber) || !privateList[i].userData.extraMemo) {

                    logger.error('Required Private Parameters fail, params => %s', JSON.stringify(publicList));
                    return getResponse(res, resultCode.REQUIRED_PARAMETER);         
                }
        }
        req.fn = 'retryRefund';
        req.body.pub = publicList;
        next();
    }catch(error) {
        return getResponse(res, error);         
    }

}

/**
 * 환불상품 수정(PUBLIC)
 * @param {Request} req 요청객체
 * @param {Response} res 응답객체
 */
exports.update_item = async (req, res, next) => {
   
    logger.info('################################# update_item start #################################');
    //1.request에 pub있는지 체크
    if(!req.body.pub) {
        console.log('여긴 pub 체크구간 ')
        logger.error('update error: pub, priv  do not exist in body, params => %s', JSON.stringify(req.body));
        return getResponse(res, resultCode.REQUIRED_PARAMETER);   
        
    }
    try {
        let publicList = req.body.pub;
        await checkParamsValidation(publicList);
        const status = publicList[0].refundData.refundStatusCode;

         // -빠른환불취소(public update) [F8] cancelRefund
        // -빠른환불완료(public update)[F4] 함수명:completeRefund
        // -이의제기(public update)[F9] 함수명:registerComplaint
        if(status === 'F8') {
            req.fn = 'cancelRefund'
        }else if(status === 'F4') {
            req.fn = 'completeRefund'
        }else if(status === 'F9') {
            req.fn = 'registerComplaint'
        }else if(status === 'F6') {
            req.fn = 'confirmReturnItem'
        }
        //publicData 필수값 체크하면서 회사코드 넣기 
        for(let i=0; i<publicList.length; i++){
            publicList[i].refundData.companyCode = process.env.COMPANYCODE;
            publicList[i].refundData.lastUpdateDate = moment().format('YYYYMMDDHHmmss');
            if(status === 'F4') {
                if(!publicList[i].refundNumber || !publicList[i].refundData.refundStatusCode || !publicList[i].refundData.refundCompletedDate){
                    logger.error('update error: Public Required Parameters fail, params => %s', JSON.stringify(publicList[i]));
                    return getResponse(res, resultCode.REQUIRED_PARAMETER);           
                }
            }else if(status === 'F6') {
                if(!publicList[i].refundNumber || !publicList[i].refundData.refundStatusCode || !publicList[i].refundData.returnCompletedDate){
                    logger.error('update error: Public Required Parameters fail, params => %s', JSON.stringify(publicList[i]));
                    return getResponse(res, resultCode.REQUIRED_PARAMETER);           
                }               
            } else {
                if(!publicList[i].refundNumber || !publicList[i].refundData.refundStatusCode){
                    logger.error('update error: Public Required Parameters fail, params => %s', JSON.stringify(publicList[i]));
                    return getResponse(res, resultCode.REQUIRED_PARAMETER);           
                }
            }
        }

        req.body.pub = publicList;
        next();        
    }catch(error) {
        return getResponse(res, error);         
    }

}

exports.common_insert_update = async (req, res) => {

    // req.body.fn = req.fn;
    const params = { 
        fn : req.fn,
        pub : req.body.pub,
        priv : req.body.priv
    }
    
    try {
        const createResult = await service.block_create_service(params); 
        return getResponse(res, resultCode.SUCCESS);
    } catch(error) {
        logger.error(`invoke중 에러발생:${error}`); 
        return getResponse(res, resultCode.FABRIC_INVOKE_ERROR);
    }

}

exports.common_query = async (req, res) => {

    let params = {
        refundNumber : req.query.params, //주문번호
        // column_value : req.query,            //rich query용 컬럼과 값 
        fn : req.fn                          //호출할체인코드명
    }
    try {
        const searchResult = await service.block_search_service(params); 
        return getResponse(res, resultCode.SUCCESS, searchResult);
    } catch(error) {
        logger.error(`쿼리중 에러발생:${error}`)
        return getResponse(res, resultCode.FABRIC_QUERY_ERROR); 
    }

}

//해당 object타입 체크 
function typeOf(object) {

    var firstVal = typeof object;
    if (firstVal !== 'object') {
        return firstVal;
    }
    else if (object === null) {
        return 'null';
    }
    else if (object.constructor === [].constructor) {
        return 'array';
    }
    else if (object.constructor === {}.constructor) {
        return 'object';
    }
    else {
        return 'not type';
    } 
}

function checkParamsValidation(pubData, privData) {
    return new Promise((resolve, reject) => {
        // let map = new Map(); 
        // for(let i=0; i<pubData.length; i++) {
        //     map.set(pubData[i].refundNumber, 'a');
        // }
        // if(map.size !== pubData.length) reject(resultCode.DUPLICATE_KEY);
        //public데이터만 처리해야할 경우
        // console.log('여기는 함수 처음부분!!!!!!!!!!!!!!!!!!!!!!')
        if(!privData) {
            // console.log('프라이빗없을때!!!!!!!!!!!!!!!!!!!!!!')
            //2.request에 pub, priv 가 배열인지 체크 
            if(!Array.isArray(pubData)) {
                console.log('여긴 배열체크 구간 ')
                logger.error('create error: Parameters are not array, params => %s', JSON.stringify(pubData));
                // return getResponse(res, resultCode.REQUIRED_PARAMETER);      
                reject(resultCode.REQUIRED_PARAMETER)   
            }

            //4.배열이지만 길이가 0인 경우 
            if(pubData.length ===0) reject(resultCode.REQUIRED_PARAMETER);

            //5.pub,priv배열이 json object인지 체크 
            for(let i=0; i<pubData.length; i++) {
                if(typeOf(pubData[i]) !== 'object') {
                    console.log('여긴 json 파스 구간 ')
                    logger.error('create error: Json parse fail, pub => %s', JSON.stringify(pubData[i]));
                    // return getResponse(res, resultCode.JSON_PARSE_ERROR); 
                    reject(resultCode.REQUIRED_PARAMETER)  
                }
            }
            resolve(0);
        }else {
            // console.log('프라이빗있을때 !!!!!!!!!!!!!!!!!!!!!!')
            // const result = Object.assgin()
            //2.request에 pub, priv 가 배열인지 체크 
            if(!Array.isArray(pubData) || !Array.isArray(privData)) {
                console.log('여긴 배열체크 구간 ')
                logger.error('create error: Parameters are not array, pubData => %s, privData => %s', JSON.stringify(pubData), JSON.stringify(privData));
                // return getResponse(res, resultCode.REQUIRED_PARAMETER);      
                reject(resultCode.REQUIRED_PARAMETER)   
            }
            //4.배열이지만 길이가 0인 경우 
            if(pubData.length === 0 || privData.length === 0) reject(resultCode.REQUIRED_PARAMETER);
            //3.pub배열과 priv배열의 길이 체크 
            if(pubData.length !== privData.length) {
                console.log('여긴 pub배열과 priv배열 길이 체크 구간 ')
                logger.error('create error: pubs length is not equal privs length');
                // return getResponse(res, resultCode.REQUIRED_PARAMETER); 
                reject(resultCode.REQUIRED_PARAMETER)    
            }
            //4.pub,priv배열이 json object인지 체크 
            for(let i=0; i<pubData.length; i++) {
                if(typeOf(pubData[i]) !== 'object' || typeOf(privData[i]) !== 'object') {
                    console.log('여긴 json 파스 구간 ')
                    logger.error('create error: Json parse fail, pub => %s, priv => %s', JSON.stringify(pubData[i]), JSON.stringify(privData[i]));
                    // return getResponse(res, resultCode.JSON_PARSE_ERROR); 
                    reject(resultCode.REQUIRED_PARAMETER)  
                }
            }
            let map = new Map(); 
            for(let i=0; i<pubData.length; i++) {
                map.set(pubData[i].refundNumber, 'a');
            }
            if(map.size !== pubData.length) reject(resultCode.DUPLICATE_KEY);
            resolve(0);
        }
    });

}

// function checkRequiredParams(pubData, privData) {
//     return new Promise((resolve, reject) => {
//         //publicData 필수값 체크하면서 회사코드 넣기 
//         for(let i=0; i<pubData.length; i++){
//             pubData[i].refundData.companyCode = process.env.COMPANYCODE;
//             pubData[i].refundData.lastUpdateDate = moment().format('YYYYMMDDHHmmss');
//             if(!pubData[i].refundNumber || !pubData[i].refundData.orderSequence || !pubData[i].refundData.productCode
//                 || !pubData[i].refundData.refundStatusCode || !pubData[i].refundData.refundDate || (typeof pubData[i].refundData.retryYn) !== 'boolean' || (typeof pubData[i].refundData.fastRefundYn) !== 'boolean'
//                 || !pubData[i].refundData.refundReason || !pubData[i].refundData.refundFee){

//                 logger.error('Required Public Parameters fail, params => %s', JSON.stringify(pubData));
//                 // return getResponse(res, resultCode.REQUIRED_PARAMETER);          
//                 reject(resultCode.REQUIRED_PARAMETER);
//             }
//         }
//         if(!privData) {
//             resolve(pubData) 
//         } else {
//              //privateData 필수값 체크
//              console.log('#$%#$%^$@^%@$^%@^@%^@$%@#%$')
//              for(let i=0; i<privData.length; i++) {
//                 if(!privData[i].refundNumber || !privData[i].userData.orderCode || !privData[i].userData.customerName
//                     || !privData[i].userData.zipCode || !privData[i].userData.baseAddress || !privData[i].userData.detailAddress
//                     || !privData[i].userData.telNumber || !privData[i].userData.cellNumber || !privData[i].userData.extraMemo) {
        
//                     logger.error('Required Private Parameters fail, params => %s', JSON.stringify(privData));
//                     // return getResponse(res, resultCode.REQUIRED_PARAMETER);         
//                     reject(resultCode.REQUIRED_PARAMETER);
//                 }
//             }
//             resolve(pubData);    
//         }

//     });
// }
