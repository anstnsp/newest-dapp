const fabric_invoke = require('./invoke');
const fabric_query  = require('./query');
// const logger        = require('../../utils/logger').logger;
const logger = require('log4js').getLogger('services')
/**
 * 환불상품조회
 * 
 * @param {*} param json 형식 파라미터
 * @param {*} callback 콜백함수 (status, output) =>{..}
 */
exports.block_search_service = async (params) => {
    
    logger.debug("search refundNumber: %s, query in : %s ", params, JSON.stringify(params));

    try {
        const queryResult = await fabric_query.query(params);
        return Promise.resolve(JSON.parse(queryResult))
    } catch(error) {
        logger.error("fabric search error : %s", JSON.stringify(error));
        return Promise.reject(error); 
    }
      
}

/**
 * 환불상품 등록/수정
 * 
 * @param {*} param json형식 파라미터
 * ordCd         (환불일련번호)
 * refStatCd     (환불상태코드)
 * refStatDtl    (환불상태상세)
 * coCd          (기관코드)
 * @param {*} callback 콜백함수 (status, output) =>{..}
 */
exports.block_create_service = async (params) => {

    logger.debug('invoke in : %s', JSON.stringify(params));
    
    try {
        const invokeResult = await fabric_invoke.invoke(params);
        logger.debug("invoke out : %s" , JSON.stringify(invokeResult));
        return Promise.resolve(null); 
    } catch(error) {
        logger.error("invoke error : %s", JSON.stringify(error));
        return Promise.reject(JSON.stringify(error)); 
    }

}
