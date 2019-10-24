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
exports.block_search_service = (params,callback) => {
    
    logger.debug("search refundNumber: %s, query in : %s ", params, JSON.stringify(params));

    fabric_query.query(params, (err, data)=>{
        if(err){
            logger.error("fabric search error : %s", JSON.stringify(err));
            callback(err, null)
        } else{
            logger.debug("query out : %s ", data);
            callback(null, JSON.parse(data));
        }
    });
      
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
exports.block_create_service = (params, callback) => {

    logger.debug('invoke in : %s', JSON.stringify(params));
    
    fabric_invoke.invoke(params, (err, output)=>{
        if(err){
            logger.error("invoke error : %s", JSON.stringify(err));
            callback(err, 'fabric invoke error');
        } else{
            logger.debug("invoke out : %s" , JSON.stringify(output));
            callback(null, null);
        }
    });  

}
