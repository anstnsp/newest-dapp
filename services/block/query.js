/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';



// const logger        = require('../../utils/logger').logger;
const logger = require('log4js').getLogger('query')
const helper        = require('./helper.js');
const resultCode    = require('../../resultCode')
let obj;
/**
 * 환불상품 블록체인조회
 * @param {*} param json 형식의 파라미터
 * @param {*} callback 콜백함수 (status, output) =>{..}
 */
exports.query = async function (args, callback) {
    
    let result ='';

    let error = {
      code : '',
      msg : ''
    }
    // let column_value = args.column_value;
    // const rich_param = {
    //   selector : column_value
    // }

    try {
          if(!obj) obj = await helper.get_contract(); 
          // obj = await helper.get_contract(); 
          logger.debug('#################################')
          logger.debug('args.fn : ' + args.fn);
          logger.debug('args : '+args);
          logger.debug('args.refundNumber : '+args.refundNumber);
          logger.debug('#################################')

          if(args.fn === 'queryRefundData'){
            result = await obj.contract.evaluateTransaction(args.fn, args.refundNumber); //PUBLIC 조회
          } else if(args.fn === 'queryUserData'){
            const privDtToBuff = Buffer.from(args.refundNumber);
            const transientData = {
                privPersonal : privDtToBuff
            };

            result = await obj.contract.createTransaction(args.fn)
                    .setTransient(transientData)
                    .evaluate('');
          }
          // result = await obj.contract.evaluateTransaction(args.fn, JSON.stringify(args.refundNumber));//PRIVATE 조회
          // } else {
          //   // result = await obj.contract.evaluateTransaction(args.fn, JSON.stringify(rich_param)); //couchDB용  
          //   result = await obj.contract.evaluateTransaction(args.fn, JSON.stringify(rich_param)); //couchDB용       
          // }
        
          logger.info(`Transaction has been evaluated`);
          logger.debug('result.toString():'+ result.toString());

          callback(null, result.toString());
    } catch (err) {
          logger.error(`Failed to evaluate transaction: ${err}`);
          logger.error(`Failed to evaluate transaction: ${err.message}`);

          if(err.message.indexOf('|') != -1) {
            const arr1 = err.message.split(',');
            const arr2 = arr1[0].split(':"');
            const arr3 = arr2[1].split('|');

            error.code = arr3[0];
            error.msg = arr3[1].replace(/\"/g,""); 
          } else { 
            error.code = resultCode.FABRIC_ETC_ERROR.code;
            error.msg = resultCode.FABRIC_ETC_ERROR.message;
          }
          
          callback(error, null);
     } 

}