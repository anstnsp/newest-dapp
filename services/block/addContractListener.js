/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const fs                            = require('fs');
const Long                          = require('long');
const path                          = require('path');
// const logger                        = require('../../utils/logger').listenerLogger;
const logger                        = require('log4js').getLogger('listener');
const request                       = require('request');
const helper                        = require('./helper');
const FilesystemCheckpoint          = require('fabric-network/lib/impl/event/filesystemcheckpointer');
const Query                         = require('./query.js');
const Invoke                        = require('./invoke');
const moment                        = require('moment');
const queue                         = require('better-queue');
// //채널명 : hcc-channel , 체인코드명 : refund-cc, 이벤트명 refundEvt 
const checkpoint = new FilesystemCheckpoint(process.env.CHANNEL_NAME, process.env.LISTENER_NAME, {basePath: process.env.CHECKPOINT_PATH, maxLength: process.env.CHECKPOINT_BLOCK_CNT} );

const q = new queue(async function(input, cb) {
    //큐 작업 시작. 

    //받은 이벤트의 트랜잭션id, 트랜잭션상태, 블럭넘버를 로그로 출력.
    logger.info(`Successfully received the chaincode event. tx_id:${input.tx_id}, tx_status:${input.tx_status}, blockNumber:${input.block_num}`);

    //체크포인트파일을 읽어옴, 
    const check = await checkpoint.load(); 

    //이미 받은 트랜잭션id이면 다음 로직을 처리하지 않고 건너뛴다. 
    if(check[input.block_num] != undefined) { //이미 받은 블럭넘버에 대해서만 아래의 if문 실행. 
        if(check && check[input.block_num].transactionIds && check[input.block_num].transactionIds.includes(input.tx_id)) {
            logger.info(`_onEvent skipped transaction: ${input.tx_id}`);
            return cb(null, 0); 
        }
    }

    //트랜잭션의 상태가 VALID가 아니면 에러로그를 출력하고 체크포인트에 저장. 
    if(input.tx_status !== 'VALID') {
        logger.error(`tx_status is not VALID. tx_id:${input.tx_id}, tx_status:${input.tx_status}, blockNumber:${input.block_num}`);
        await checkpoint.save(input.tx_id, input.block_num, input.evtLength);
        return cb(null, 0); 
    }

    let requestArr = [];

    // let event_payload = JSON.parse(event.payload.toString('utf8')); //이게 기존꺼로 하던거 
    let event_payload = input.chaincode_event.payload.toString('utf8');
    logger.debug(`event_payload:${event_payload}`);
    const json_payload = JSON.parse(event_payload); //string => json object로 변환 

    // 환불상태가 검수완료(F6)이면 PDC데이터를 삭제. 
    if(json_payload[0].refundData.refundStatusCode === 'F6') {
        const param = {
            fn : 'deleteUserData',
            pub : '',
            priv : json_payload
        }
        Invoke.invoke(param, (error, output) => {
            if(error) {
                logger.error(`deleteUserData error : ${JSON.stringify(error)}`);
            } else {
                logger.info('Successfully deleted refundUserData');
                logger.info('resultResponse:'+JSON.stringify(output));
            }
        })
        if(json_payload[0].refundData.companyCode === '01') { 
            await checkpoint.save(input.tx_id, input.block_num, input.evtLength);
            logger.info('##Listener## => Successfully saved the checkpoint !!');
            return cb(null, null); 
        }
    }
    
    for(let i=0; i<json_payload.length; i++) {
        let requestObj = {
            refundNumber : json_payload[i].refundNumber,   //환불번호
            statCode : json_payload[i].refundData.refundStatusCode, //환불상태코드
            rtgdTrco : json_payload[i].refundData.deliverCode,  //반품택배사코드
            rtgdInvcNo : json_payload[i].refundData.invoiceNumber, //반품송장번호 
            memoCn : json_payload[i].refundData.invoiceNumber //반품송장번호 
        }
        requestArr.push(requestObj);
    } 
    
    let requestData = {
        "orderList" : requestArr
    }
  
    try {
        const legacyResult = await makeRequest(process.env.LEGACY_URL, 'POST', requestData)
        const returnedData = JSON.parse(legacyResult);    
        if(returnedData.resultCode == 0) {
            await checkpoint.save(input.tx_id, input.block_num, input.evtLength);
            logger.info('Successfully saved the checkpoint !!');
            return cb(null, 0); 
        } else {
            logger.error(`get HTTPresponseCode ${returnedData.resultCode} by AdminServer`);
            let err = new Error(`LegacyServer has returned resultCode ${returnedData.resultCode}`)
            return cb(err, null);
        }
    } catch(error) {
        logger.error(`error occur while legacyAPIcall`);
        return cb(error, null); 
    }

}, { maxRetries: process.env.QUEUE_RETRY_CNT, retryDelay: process.env.QUEUE_RETRY_DELAY * 1000 })

let  eventhub; 

async function ContractListener() {

    try {
        const gateway = await helper.load_network_config(
            process.env.WALLETNAME, process.env.ADMIN);
        const channel_eventhub = await getEventhub(gateway); //이용가능한 이벤트허브 얻기 
      
        const channel  = channel_eventhub.get('channel');
         eventhub = channel_eventhub.get("eventhub");
        const peerName = channel_eventhub.get("peerName");           
    
        await registerChaincodeEvent(eventhub); //이벤트허브에 리스너 등록 
        await eventhub_connect(eventhub, channel, peerName); //이벤트허브를 피어에 연결 
      
        return eventhub; 
    } catch (error) {
      
        logger.error('메인 ContractListener error: ' + error);
        throw error; 
        
    }

}


//연결 가능한 피어의 이벤트허브 가져오기 
async function getEventhub (gateway) {

    try {
        const randomNum = Math.round(Math.random()) // 0 아니면 1 만드는 거 
        const client = await gateway.getClient('');
        const channel = client.getChannel();
        //1. 먼저 해당 msp? 아니면 채널? 기반에 속한 피어들을 전부 가져옴.
        const peerList = channel.getPeersForOrg(process.env.MSP); // MSP기반으로 해당 조직에 속한 피어들을 전부 가져옴
        let SecondPeer;
        
        const FirstPeer = peerList[randomNum];
        if(randomNum === 1) SecondPeer = peerList[0]
        else SecondPeer = peerList[1]
    
        console.log('randomNum:'+randomNum)

        if(await helper.checkAvailablePeer(FirstPeer)) {
            logger.info(`returned peer => ${FirstPeer}`);
            return helper.getEventhubFromPeer(channel,FirstPeer);
        }else if(await helper.checkAvailablePeer(SecondPeer)) {
            logger.info(`returned peer => ${SecondPeer}`)
            return helper.getEventhubFromPeer(channel, SecondPeer);
        } else {
            throw new Error('All peers are not available');
        }

    } catch(error) {
        logger.error(`getEventhub() error: ${error}`); 
        throw error; 
    }

}

async function eventhub_connect(eventhub, channel, peerName) {

    try {
        const check = await checkpoint.loadLatestCheckpoint(); 
        logger.info(check)
        logger.info('check.blockNumber:'+check.blockNumber)

        logger.info('*** listen_start *** :' + check.blockNumber);
        eventhub.connect( { full_block : true , startBlock : check.blockNumber}, (err, status) => {
                if(err) {
                    // (이벤트허브를 피어에 연결하지 못했을 시 에러)
                    logger.error('test_connect() error:'+err);
                    throw err;
                } else {      
                    logger.info('EVENTHUB CONNECT SUCCESS !!');
                }
            });
       
    } catch(error) {
        logger.error(`eventhub_connect() error: ${error}`);
        throw error;
    }
        
}

async function registerChaincodeEvent(eventhub) {

    let regid = null;

    regid = eventhub.registerChaincodeEvent(process.env.CHAINCODE_NAME, process.env.EVENT_NAME,
        async (events) => {

            let evtLength = events.length;  //이벤트길이(한블록당 트랜잭션 수)
            
            for (const {chaincode_event, block_num, tx_id, tx_status} of events) {

                //큐에 작업 push 
                q.push({chaincode_event, block_num, tx_id, tx_status, evtLength} , (err, result) => {
                    if(err) {
                        logger.error(`error occurs while processing task queued`);
                    } else {
                        logger.info(`task queued is Success`);
                    }
                })


            } //for문 끝 

    }, (error)=> {
        //여기로오는경우 피어다운, 이벤트허브연결해제, disconnect() 
        //피어연결 끊자마자 Failed to receive the chaincode event ::Error: 2 UNKNOWN: Stream removed
        logger.error('regid : ' + regid)
        logger.error('Failed to receive the chaincode event ::'+error);
        eventhub.unregisterChaincodeEvent(regid); //이벤트리스너 등록 해제 
        //1~2초로 하면 피어의 헬스체크를 다시 할 때 0번이 살았다고 판단된 때가 있음.
        //restartContractListener(재시도까지의 간격(초), 재시도 횟수)
        //ex)restartContractListener(5,5) =>> 5초간격으로 5번 시도 
        restartContractListener(process.env.LISTENER_RESTART_DELAY, process.env.LISTENER_RESTART_RETRYCOUNT);
        },
        { as_array: true}   

    );  
     
}


function wait (timeout) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve()
      }, timeout)
    })
}

async function restartContractListener (delay, retryCount) {
    const MAX_RETRIES = retryCount;
   
    for (let i = 1; i <= MAX_RETRIES; i++) {
      try {
        await ContractListener();
        return;
      } catch (err) {
        const timeout = delay*1000;
        logger.error(`Waiting ${timeout} ms`);
        await wait(timeout)
        logger.error(`Retrying count:${i} , ${err.message}`);

        // if(i == MAX_RETRIES)  process.exit(1); //재시도 횟수를 모두 충족했을때도 에러가 나면 dapp서버 중지. 

      }
    }
}

async function makeRequest(url, method, data) {
    return new Promise((resolve,reject) => {
      
        const headers = {
            "Content-Type":     "application/json"
        };
        
        const req = {
            url: url,  //레거시 url 
            timeout : 30000,
            method: method,
            headers: headers,
            form: data
        };
        request(req, (error, response, body) => {
            if (error) {
                logger.error(`LEGACY API CALL ERROR : ${error}`);
                reject(error);
            } else {
                logger.info('status code: %s, body: %s',  response.statusCode, body);
                resolve(body);
            }           
        })

    })
       
}

exports.getEventhub = getEventhub;
exports.ContractListener = ContractListener;