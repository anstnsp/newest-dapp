/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

// const logger        = require('../../utils/logger').logger;
const logger = require('log4js').getLogger('invoke');
const helper        = require('./helper.js');
// const addContractListener = require('./addContractListener');
let obj;
/**
 * 환불상품 블록체인등록
 * 
 * @param {*} param json형식 파라미터
 * @param {*} callback 콜백함수 (status, output) =>{..}
 */
exports.invoke = async function (args, callback) {
  
    const returnData = args;
    let transientData;
    const pub = args.pub;

    if(args.priv !== undefined) {
        const priv = args.priv;
        const privDtToBuff = Buffer.from(JSON.stringify(priv));
        transientData = {
            privPersonal : privDtToBuff
        };
    }

    logger.debug('################');
    logger.debug('args.fn:'+args.fn);
    logger.debug('################');

    try {
	// if(!obj) obj = await helper.get_contract(); 
        await helper.submitTransaction(args.fn, pub, transientData)
        if(args.fn === 'cancelRefund') await helper.deleteUserData(pub);
        logger.info('Transaction has been submitted');
        callback(null, returnData)
        //obj = await helper.get_contract();
        // if(args.fn === 'completeRefund' || args.fn === 'registerComplaint' || args.fn === 'confirmReturnItem') {
        //     transaction = await obj.contract.createTransaction(args.fn)
        //     await transaction.submit(JSON.stringify(pub));
        //     await addTxListener(transaction); 
        //     logger.info('Transaction has been submitted');
        //     callback(null, returnData)
        //     // await obj.contract.submitTransaction(args.fn, JSON.stringify(pub));
        // } else if(args.fn === 'cancelRefund') {
        //     transaction = await obj.contract.createTransaction(args.fn)
        //     await transaction.submit(JSON.stringify(pub));
        //     await addTxListener(transaction); 
        //     logger.info('Transaction has been submitted');
        //     callback(null, returnData)
        // } else {
        //      transaction = await obj.contract.createTransaction(args.fn);
        //      await transaction.setTransient(transientData);
        //      await transaction.submit(JSON.stringify(pub));    
        //      await addTxListener(transaction); 
        //      logger.info('Transaction has been submitted');
        //      callback(null, returnData)
        // }

    } catch (err) {
        logger.error(`Failed to submit transaction: ${err}`);
        logger.error(`Failed to submit transaction: ${err.message}`);
       // logger.error(`Failed to submit transaction: ${err.endorsements}`);
        // Failed to submit transaction: Error: Failed to send transaction successfully to the orderer status:SERVICE_UNAVAILABLE
        let error = {
            code : '',
            msg : ''
        };
        //if(err.endorsements) [error.code, error.msg] = helper.setErrorMsg(err.endorsements);
        [error.code, error.msg] = helper.setErrorMsg(err.message);
        callback(error, null);
        
     } 
}


// function addTxListener(transaction) {
//     return new Promise((resolve, reject) => {
//         transaction.addCommitListener((err, transactionId, status, blockNumber) => {
//             logger.info(`Transaction ID: ${transactionId}, Status: ${status}, Block number: ${blockNumber}`);
//             if (err) {
//                 logger.error(err);
//                 reject(err);
//             } else {
//                 if(status != 'VALID') {
//                     logger.error(`Transaction ID: ${transactionId}, Status: ${status}, Block number: ${blockNumber}`)
//                     reject(new Error(`Transaction Status is not VAILD`));
//                 } else {
//                     resolve();
//                 }
//             }
//         });
//     })
// }
