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


// //채널명 : hcc-channel , 체인코드명 : refund-cc, 이벤트명 refundEvt 
const checkpoint = new FilesystemCheckpoint(process.env.CHANNEL_NAME, process.env.LISTENER_NAME, {basePath: process.env.CHECKPOINT_PATH, maxLength: 10} );
//                                             //('채널명', '리스너이름')
let q = [];
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
      
        logger.error('##Listener## => 메인 ContractListener error: ' + error);
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
        // const FirstPeer = peerList.shift();
        // const SecondPeer = peerList.shift();

        if(await helper.checkAvailablePeer(FirstPeer)) {
            logger.info(`##Listener## => returned peer => ${FirstPeer}`);
            return helper.getEventhubFromPeer(channel,FirstPeer);
        }else if(await helper.checkAvailablePeer(SecondPeer)) {
            logger.info(`##Listener## => returned peer => ${SecondPeer}`)
            return helper.getEventhubFromPeer(channel, SecondPeer);
        } else {
            throw new Error('##Listener## => All peers are not available');
        }

    } catch(error) {
        logger.error(`##Listener## => getEventhub() error: ${error}`); 
        // ##Listener## => getEventhub() error: Error: ##Listener## => All peers is not available
        throw error; 
    }

}

async function eventhub_connect(eventhub, channel, peerName) {

    try {
        const check2 = await checkpoint.loadLatestCheckpoint(); 
        console.log(check2)
        console.log('check2.blockNumber:'+check2.blockNumber)

        // const check = await checkpoint.load();
      
        // let listen_start = null;
        // logger.info('##Listener## => check.blockNumber : ' + check.blockNumber);
        // const blockchainInfo = await channel.queryInfo(peerName);
        // logger.info('##Listener## => blockchainInfo.height : ' + blockchainInfo.height);
        
        // //현재 채널의 블럭의 -1 보다 체크포인트의 블럭이 작다면 if문 실행 
        // if(check && check.blockNumber) {
        //     logger.info(`##Listener## => Requested Block Number: ${Number(check.blockNumber) + 1} Latest Block Number: ${blockchainInfo.height - 1}`);
        //     listen_start =  Long.fromInt(Number(check.blockNumber) );
        // }

        logger.info('##Listener## => *** listen_start *** :' + check2.blockNumber);
        eventhub.connect( { full_block : true , startBlock : check2.blockNumber}, (err, status) => {
                if(err) {
                    // (이벤트허브를 피어에 연결하지 못했을 시 에러)
                    logger.error('##Listener## => test_connect() error:'+err);
                    throw err;
                } else {      
                    logger.info('##Listener## => EVENTHUB CONNECT SUCCESS !!');
                }
            });
       
    } catch(error) {
        logger.error(`##Listener## => eventhub_connect() error: ${error}`);
        throw error;
    }
        
}

async function registerChaincodeEvent(eventhub) {

    let regid = null;
    let json_payload;
   // const check = await checkpoint.load();
    // let testarr = new Array();
    // const check = await checkpoint.load();
    //채널명 : hcc-channel , 체인코드명 : refund-cc, 이벤트명 refundEvt 
    //registerChaincodeEvent('체인코드명','발행이벤트명'
    //1,4,8,9 아닌거    process.env.EVENT_NAME
    
    regid = eventhub.registerChaincodeEvent(process.env.CHAINCODE_NAME, process.env.EVENT_NAME,
        async (events) => {
            //  const check = await checkpoint.load();
            // const orderedBlockNumbers = Object.keys(check).sort();
             let useCheckpoint;
         
            logger.info('events.length:'+events.length);
            for (const {chaincode_event, block_num, tx_id, tx_status} of events) {
                //chaincode_event, block_num, tx_id, tx_status
                //{event, block_num, txnid, status}


              
                const check = await checkpoint.loadLatestCheckpoint(); 
                if(!check.blockNumber || check.blockNumber === 'undefined') {
                    
                } else {
                    useCheckpoint = Number(check.blockNumber || 0) <= Number(block_num);  
                    if (check && check.transactionIds && check.transactionIds.includes(tx_id)) {
                        logger.info('##Listener## => _onEvent skipped transaction: %s', tx_id);
                        continue;
                    }
                }
//                 console.log('check:'+check)
// console.log('check.transactionIds:'+check.transactionIds)
// console.log('check.transactionIds.includes:'+check.transactionIds.includes(tx_id))


                if(check && check.transactionIds && check.transactionIds.includes(tx_id)) {
                    logger.info('##Listener## => _onEvent skipped transaction: %s', tx_id);
                    continue;
                }

                let requestArr = [];
                logger.info('##Listener## => Successfully got a chaincode event with transid:'+ tx_id + ' with status:'+tx_status);
          
                //이미받은 블럭인지 체크    11 <= 11 
                const useCheckpoint = Number(check.blockNumber || 0) <= Number(block_num);  
                // if (check && check.transactionIds && check.transactionIds.includes(tx_id)) {
                //     logger.info('##Listener## => _onEvent skipped transaction: %s', tx_id);
                //     continue;
                // }
               
                //트랜잭션의 상태가 VAILD가 아니면 받았다고 저장만 하고 리턴 
                if (tx_status != 'VALID') {
                    logger.info(`##Listener## => Block tx_status is ${tx_status}, blockNumber is ${block_num}`);
                    // 이벤트로 수신받은 트랜잭션과 블럭넘버를 파일에 저장.
                    if(useCheckpoint) await checkpoint.save(tx_status, block_num);   
                    continue;
                }
                
                // let event_payload = JSON.parse(event.payload.toString('utf8')); //이게 기존꺼로 하던거 
                let event_payload = chaincode_event.payload.toString('utf8');
                logger.debug(`##Listener## => event_payload:${event_payload}`);
                logger.debug('##Listener## => Successfully received the chaincode event on block number '+ block_num);
                
                json_payload = JSON.parse(event_payload); //string => json object로 변환 
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
                    if(json_payload[0].refundData.companyCode === '01') continue; 
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
                    const atest = await makeRequest(process.env.LEGACY_URL, 'POST', requestData)
                    const test = JSON.parse(atest);    
                    if(test.resultCode == 0) {
                        // console.log('checkpoit:'+checkpoint)
                        // console.log('save:'+checkpoint.save())
                       
                        if(useCheckpoint) await checkpoint.save(tx_id, block_num, events.length);   
                        logger.info('##Listener## => Successfully saved the checkpoint !!');
                      
                    } else {
                        logger.error(`get HTTPresponseCode ${test.resultCode} by AdminServer`);
                      
                    }
                } catch(error) {
                    logger.error(`##Listener## => 레거시 디비 호출이 안됨. ${error}`);
                }

             


                // makeRequest(process.env.LEGACY_URL, 'POST', requestData)
                // .then( async (result) => {
                   
                //     // console.log('result:'+result)
                //     // console.log('바디파서:'+JSON.parse(result))
                //     const resData = JSON.parse(result);
                //     if(resData.resultCode == 0) { //레거시DB의 응답이 성공이 아니면 재시작

                //         if(useCheckpoint)  {
                //             await savepoint(tx_id, block_num)
                //             // await checkpoint.save(tx_id, block_num);   
                //             logger.info('##Listener## => Successfully saved the checkpoint !!');
                //         }
                        
                //     } else { //레거시DB의 성공응답을 받으면 TX, 블럭넘버 저장 
                //         // 이벤트로 수신받은 트랜잭션과 블럭넘버를 파일에 저장.
                //         logger.error(`get HTTPresponseCode ${result} by AdminServer`);

                //     }
                // })
                // .catch((error) => {
                //     logger.error(`##Listener## => 레거시 디비 호출이 안됨. ${error}`);
                //     // return;
                //     // throw error; 
                // })     


            // }catch(err) {
            //     logger.error(`에러발생 제발좀:${err}`)
            //     return;
            // }

           
            } //for문 끝 

    }, (error)=> {
        //여기로오는경우 피어다운, 이벤트허브연결해제, disconnect() 
        //피어연결 끊자마자 Failed to receive the chaincode event ::Error: 2 UNKNOWN: Stream removed
        logger.error('##Listener## => regid : ' + regid)
        logger.error('##Listener## => Failed to receive the chaincode event ::'+error);
        // q = [];
        eventhub.unregisterChaincodeEvent(regid); //이벤트리스너 등록 해제 
        //1~2초로 하면 피어의 헬스체크를 다시 할 때 0번이 살았다고 판단된 때가 있음.
        //restartContractListener(재시도까지의 간격(초), 재시도 횟수)
        //ex)restartContractListener(5,5) =>> 5초간격으로 5번 시도 
        restartContractListener(process.env.DELAY,process.env.RETRYCOUNT);
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
function savepoint (tx_id, block_num) {
    return new Promise((resolve) => {
      setTimeout(() => {
        checkpoint.save(tx_id, block_num);   
        resolve();
      }, 0)
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
                logger.error(`##Listener## => LEGACY API CALL ERROR : ${error}`);
                reject(error);
            } else {
                logger.info('##Listener## => status code: %s, body: %s',  response.statusCode, body);
                // checkpoint.save(tx_id, block_num);
                resolve(body);
            }           
        })

    })
       
}

exports.getEventhub = getEventhub;
exports.ContractListener = ContractListener;