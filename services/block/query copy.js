/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const logger        = require('../../utils/logger').logger;
const helper        = require('./helper.js');
const addContractListener = require('./addContractListener');
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

    logger.info('################');
    logger.info('args.fn:'+args.fn);
    logger.info('################');

    let obj = {
        contract : null,
        gateway : null
    };
    let transaction;
    let listener;
    try {
        obj = await helper.get_contract(); 
        if(args.fn === 'cancelRefund' || args.fn === 'completeRefund' || args.fn === 'registerComplaint') {
            transaction = await obj.contract.createTransaction(args.fn)

             await transaction.submit(JSON.stringify(pub));
            // await obj.contract.submitTransaction(args.fn, JSON.stringify(pub));
        } else {
            transaction = await obj.contract.createTransaction(args.fn)
            console.log('transaction._transactionId:'+JSON.stringify(transaction._transactionId._transaction_id))
/************************************************************** */
        //1.채널이벤트허브 인스턴스 얻기
        const channel_eventhub = await addContractListener.getEventhub(obj.gateway); //이용가능한 이벤트허브 얻기 
        const eventhub = channel_eventhub.get("eventhub");
        //2.채널이벤트허브 인스턴스를 피어의 이벤트서비스에 연결하기 . (많은 트랜잭션에 대해 채널이벤트허브 인스턴스를 재사용할 때 이벤트리스너등록전에 미리 연결해놓는게 더 좋음.)
        eventhub.connect( { full_block : false , startBlock : null}, (err, status) => {
            if(err) {
                // (이벤트허브를 피어에 연결하지 못했을 시 에러)
                logger.error('****TRANSACTION LISTENER**** => test_connect() error:'+err);
                throw err;
            } else {      
                logger.info('****TRANSACTION LISTENER**** => EVENTHUB CONNECT SUCCESS !!');
            }
        });

        //3.트랜잭션 만들고 인도스받기
        let event_monitor = new Promise((resolve, reject) => {
            let handle = setTimeout(() => {
                // do the housekeeping when there is a problem
                eventhub.unregisterTxEvent(transaction._transactionId._transaction_id);
                console.log('Timeout - Failed to receive the transaction event');
                reject(new Error('Timed out waiting for block event'));
            }, 20000);
        
            eventhub.registerTxEvent(transaction._transactionId._transaction_id, (transaction, status, block_num) => {
                clearTimeout(handle);
                //channel_event_hub.unregisterTxEvent(event_tx_id); let the default do this
                console.log('Successfully received the transaction event');
                console.log(`transaction ID: ${transaction}, status: ${status}, block_num: ${block_num}`)
                resolve(status);
            }, (error)=> {
                clearTimeout(handle);
                console.log('Failed to receive the transaction event ::'+error);
                reject(error);
            },
                // when this `startBlock` is null (the normal case) transaction
                // checking will start with the latest block
                 //{startBlock: null , unregister: true}
                 {startBlock: null , unregister: true, disconnect: false}
                // notice that `unregister` is not specified, so it will default to true
                // `disconnect` is also not specified and will default to false
            );
           
        }); 
        console.log('event_monitor:'+event_monitor)
        event_monitor
        .then((status) => {
            console.log(`invoke.js의 stats:${status}`)
        })
        .catch((error) => {
            console.log('모니터캐치부분:'+error)
        })
        /************************************************************** */

            await transaction.setTransient(transientData)
            await transaction.submit(JSON.stringify(pub))

            //  await obj.contract.createTransaction(args.fn)
            // .setTransient(transientData)
            // .submit(JSON.stringify(pub));           
        }

        //4.트랜잭션아이디로 이벤트허브 인스턴스에 콜백등록 

        logger.info('Transaction has been submitted');
        callback(null, returnData);
    } catch (err) {
        logger.error(`Failed to submit transaction: ${err}`);
        let error = {
            code : '',
            msg : ''
        };

        [error.code, error.msg] = helper.setErrorMsg(err.endorsements);
        callback(error, null);
        
    } finally {
        // Disconnect from the gateway.
        if(obj.gateway) await obj.gateway.disconnect();
    }
}
