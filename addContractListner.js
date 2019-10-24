/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const fs                            = require('fs');
const Long                          = require('long');
const path                          = require('path');
const logger2                       = require('../../utils/logger2')
const request                       = require('request');
const helper                        = require('./helper');
const FilesystemCheckpoint          = require('fabric-network/lib/impl/event/filesystemcheckpointer')

// //채널명 : hcc-channel , 체인코드명 : refund-cc, 이벤트명 refundEvt 
const checkpoint = new FilesystemCheckpoint(process.env.CHANNEL_NAME, process.env.LISTENER_NAME, {basePath: process.env.CHECKPOINT_PATH} );
//                                             //('채널명', '리스너이름')

//댑이 내리면 리스너가 DISCONNECT 하고 UNREGISTER로 하나?  



async function ContractListener() {

    try {
        const gateway = await helper.load_network_config(
            process.env.WALLETNAME, process.env.HCCADMIN);
        const channel_eventhub = await getEventhub(gateway); //이용가능한 이벤트허브 얻기 
      
        const channel  = channel_eventhub.get('channel');
        const eventhub = channel_eventhub.get("eventhub");
        const peerName = channel_eventhub.get("peerName");           
    
        await eventhub_connect(eventhub, channel, peerName); //이벤트허브를 피어에 연결 
        await registerChaincodeEvent(eventhub); //이벤트허브에 리스너 등록 
       
        return eventhub; 
    } catch (error) { 
      
        logger2.error('메인 쪽 에러 : ' + error);
        restartContractListener(10000);
    }

}


//연결 가능한 피어의 이벤트허브 가져오기 
async function getEventhub (gateway) {

    try {
        const client = await gateway.getClient('');
        const channel = client.getChannel();
        //1. 먼저 해당 msp? 아니면 채널? 기반에 속한 피어들을 전부 가져옴.
        const peerList = channel.getPeersForOrg(process.env.MSP); // MSP기반으로 해당 조직에 속한 피어들을 전부 가져옴

        const FirstPeer = peerList.shift();
        const SecondPeer = peerList.shift();

        if(await helper.checkAvailablePeer(FirstPeer)) {
            logger2.info(`##Listener## => 첫번째 피어가 리턴됨 => ${FirstPeer}`);
            return helper.getEventhubFromPeer(channel,FirstPeer);
        }else if(await helper.checkAvailablePeer(SecondPeer)) {
            logger2.info(`##Listener## => 두번째 피어가 리턴됨 => ${SecondPeer}`)
            return helper.getEventhubFromPeer(channel, SecondPeer);
        } else {
            throw new Error('##Listener## => All peers are not available');
        }

    } catch(error) {
        logger2.error(`##Listener## => getEventhub() error: ${error}`); 
        // ##Listener## => getEventhub() error: Error: ##Listener## => All peers is not available
        throw error; 
    }

}

async function eventhub_connect(eventhub, channel, peerName) {

    try {
        const check = await checkpoint.load();
        let my_start = null;
        logger2.info('##Listener## => check.blockNumber : ' + check.blockNumber);
        const blockchainInfo = await channel.queryInfo(peerName);
        logger2.info('##Listener## => blockchainInfo.height : ' + blockchainInfo.height);
        
        //현재 채널의 블럭의 -1 보다 체크포인트의 블럭이 작다면 if문 실행 
        if(check && check.blockNumber && blockchainInfo.height -1 > Number(check.blockNumber)) {
            logger2.info(`##Listener## => Requested Block Number: ${Number(check.blockNumber) + 1} Latest Block Number: ${blockchainInfo.height - 1}`);
            my_start =  Long.fromInt(Number(check.blockNumber) + 1);
        }

        logger2.info('##Listener## => *** my_start *** :' + my_start);
        eventhub.connect( { full_block : true , startBlock : my_start}, (err, status) => {
                if(err) {
                    // (이벤트허브를 피어에 연결하지 못했을 시 에러)
                    logger2.error('##Listener## => test_connect()함수 이벤트허브 연결중 에러 발생!! :'+err);
                    throw new Error(err);
                } else {      
                    logger2.info('##Listener## => EVENTHUB CONNECT SUCCESS !!');
                }
            });
       
    } catch(error) {
        logger2.error(`##Listener## => eventhub_connect() error: ${error}`);
        throw error;
        // restartContractListener(10000);
    }
        
}

async function registerChaincodeEvent(eventhub) {

    let regid = null;
    let json_payload;
    const check = await checkpoint.load();
    //채널명 : hcc-channel , 체인코드명 : refund-cc, 이벤트명 refundEvt 
    //registerChaincodeEvent('체인코드명','발행이벤트명'
    
    regid = eventhub.registerChaincodeEvent('hcc-cc-many', 'refund',
    (event, block_num, txnid, status) => {
        logger2.info('##Listener## => Successfully got a chaincode event with transid:'+ txnid + ' with status:'+status);
    
        const useCheckpoint = Number(check.blockNumber || 0) <= Number(block_num); 
        if (check && check.transactionIds && check.transactionIds.includes(txnid)) {
            logger2.info('##Listener## => _onEvent skipped transaction: %s', txnid);
            return;
        }

        if (status === 'INVALID') {
            // 이벤트로 수신받은 트랜잭션과 블럭넘버를 파일에 저장.
            if(useCheckpoint) checkpoint.save(txnid, block_num);
            logger2.info('##Listener## => Block status is INVALID, blockNumber is %s', block_num);
            return;
        }


        let event_payload = JSON.parse(event.payload.toString('utf8'));
        // logger2.info('###############################')
        // logger2.info(typeof(event_payload));
        // logger2.info(typeof(event_payload));
        // logger2.info(typeof(event_payload));
        // logger2.info('###############################')


        logger2.info(`##Listener## => event_payload:${event_payload}`);
        logger2.info('##Listener## => Successfully received the chaincode event on block number '+ block_num);
        // 이벤트로 수신받은 트랜잭션과 블럭넘버를 파일에 저장.
        // if(useCheckpoint) checkpoint.save(txnid, block_num);
        /*
        0.자신이 받아야 데이터인지 환불상태코드로 판단 후 받아야 한다면 아래순서를 진행. 
        받아야 하는 F2(수거접수),F3(수거완료),F5(입고완료),F7(수거실패) F2빼고 그냥 환불상태 업데이트 
        F2는 송장번호+환불상태 업데이트 
        1.이벤트를 수신.
        2.수신받은 이벤트의 페이로드에서 조회할 키 추출
        3.페이로드에서 추출한 키를 가지고 갯수만큼 조회. 
        4.조회결과를 admin(legacy 페이지)로 post api 호출.
        5.결과값 로그로 출력. 
	QuickRefundAcceptance   = "F1" //빠른환불접수
	CollectionReceipt       = "F2" //수거접수
	CollectionCompletion    = "F3" //수거완료
	QuickRefundCompletion   = "F4" //빠른환불완료
	ReceivingCompletion     = "F5" //입고완료
	ExaminationCompletion   = "F6" //검수완료
	CollectionFailed        = "F7" //수거실패
	QuickRefundCancellation = "F8" //빠른환불취소
	ObjectionAppeal         = "F9" //이의제기
        =================테스트 시나리오====================
        1.자기자신에게 이벤트 수신 후 
        2.받은거 조회 => insert 된거를 update 변경은 환불상태코드 
        3.조회와 legacy에 post한 결과로그가 insert한만큼 찍히는지? 확인. 
        4.조회 실패시/ 저장콜 실패시 에러처리 필요함. 
        5.조회,저장 실패시 로그만? 아니면 재시도? 재시도라면 몇번? 
        */
        //환불상태가 수거접수오면 priv조회해서 송장번호, 환불상태 가져와서 admin에 던짐 . 
        // 이벤트가 캐치 후 후처리내용.
        //먼저 환불상태를 다가져옴 
        if(typeof(event_payload) === 'string') {
            json_payload = JSON.parse(event_payload); //다건으로 올때
        } else {
            //  json_payload = event_payload; //단건으로 올때 
            json_payload = new Array();
            json_payload.push(event_payload);
            logger2.info('단건일때 json_payload 값:'+json_payload)
            logger2.info('단건일때 json_payload 길이:'+json_payload.length)
            logger2.info('단건일때 json_payload 값 refstatcd:'+json_payload[0].refStatCd)

        }
        // let json_payload = JSON.parse(event_payload);
        // logger2.log('event_payload.length:'+json_payload.length);
        // logger2.log('event_payload[0]:'+json_payload[0]);
        // logger2.log('event_payload[1]:'+json_payload[1]);
        // logger2.log('event_payload[0].refStatCd:'+json_payload.refStatCd);
        // logger2.log('event_payload[1].refStatCd:'+json_payload.refStatCd);

        for(let i=0; i<json_payload.length; i++) {
            if(json_payload[i].refStatCd === 'F3' || json_payload[i].refStatCd === 'F5' || json_payload[i].refStatCd === 'F7') {
                //makeRequest(url,method,data)
                let data = [{
                    ordCd : json_payload[i].ordCd,
                    gdCd : json_payload[i].gdCd,
                    refStatCd : '이벤트리스너가변경한상태'//event_payload[i].refStatCd
                }]
                 makeRequest("http://10.0.2.15:8888/refund/"+json_payload[i].ordCd, 'PUT', data)
                 .then((result) => {
                    logger2.info('makeresult:'+result)
                    logger2.info('result status:'+result.statusCode)
                    //응답이 성공적이라면 체크포인트 저장 
                     if(result.statusCode === 200) {
                        // 이벤트로 수신받은 트랜잭션과 블럭넘버를 파일에 저장.
                        if(useCheckpoint) checkpoint.save(txnid, block_num);
                     }
                 })
                 .catch((error) =>{
                    logger2.error('KKKKKKKKAAAAAA '+error)
                    // return error;
                 }) 
            }else if(json_payload[i].refStatCd === 'F2') {

                logger2.info('http://10.0.2.15:8888/refund/'+json_payload[i].ordCd+'/private?rfdmSq='+json_payload[i].rfdmSq)
                makeRequest('http://10.0.2.15:8888/refund/'+json_payload[i].ordCd+'/private?rfdmSq='+json_payload[i].rfdmSq,'GET')
                .then((result) => {
                    //makeresult:{"resultCode":"OK","resultMsg":"Success"}
                    logger2.info('이벤트 수신 후 조회한다음 의 결과값 : '+ result);
                    let queryData = JSON.parse(result);
                    logger2.info('이벤트 수신한거 제이슨파싱 데이터:'+queryData);
                    logger2.info('result.invcNm:'+queryData.invcNm); //반품송장번호
                    logger2.info('result.ordCd:'+queryData.ordCd);
                    logger2.info('result.gdCd:'+queryData.gdCd);
                    logger2.info('result.refStatCd:'+queryData.refStatCd);
                    return queryData.invcNm;
                  
                })
                .catch((error) => {
                    logger2.error('KKKKKKKKAAAAAA '+error)
                    // return error;
                })
                .then((invcNm) => {
                    logger2.info('마지막 then 의 invcNm 값:'+invcNm);
                    //TO DO ..프라이빗업데이트 체인코드가 만들어지면 주석풀고 테스트 . 
                    // let data = [{
                    //     ordCd : json_payload[i].ordCd,
                    //     gdCd : json_payload[i].gdCd,
                    //     refStatCd : '이벤트리스너가변경한상태'//event_payload[i].refStatCd
                    //     invcNm : invcNm
                    // }]
                    // makeRequest("http://10.0.2.15:8888/refund/"+json_payload[i].ordCd, 'PUT', data)
                    // 이벤트로 수신받은 트랜잭션과 블럭넘버를 파일에 저장.
                    if(useCheckpoint) checkpoint.save(txnid, block_num);
                })
                .catch((error) => {
                    logger2.error('KKKKKKKKAAAAAA '+error)
                    // return error;
                })
                
            }else {
                logger2.info('여기는 환불상태코드가 F2,F3,F5,F7이 아닌거다');
                logger2.info('마지막 else의 상태값:'+json_payload[i].refStatCd)
                 // 이벤트로 수신받은 트랜잭션과 블럭넘버를 파일에 저장.
                if(useCheckpoint) checkpoint.save(txnid, block_num);
            }
        }

    }, (error)=> {
        //여기로오는경우 피어다운, 이벤트허브연결해제, disconnect() 
        //피어연결 끊자마자 Failed to receive the chaincode event ::Error: 2 UNKNOWN: Stream removed
        logger2.error('regid : ' + regid)
        logger2.error('Failed to receive the chaincode event ::'+error);
        eventhub.unregisterChaincodeEvent(regid); //이벤트리스너 등록 해제 
        //1~2초로 하면 피어의 헬스체크를 다시 할 때 0번이 살았다고 판단된 때가 있음. 
         restartContractListener(10000);
        }   

    );  
     
}
function restartContractListener(sec) {
    setTimeout(() => {
        ContractListener();
        }, sec); 
}
async function makeRequest(url, method, data) {
    return new Promise((resolve,reject) => {
        const headers = {
            "Content-Type":     "application/json"
        };
        
        const req = {
            url: url,  //레거시 url 
            timeout : 10000,
            method: method,
            headers: headers,
            form: {pub : data}
        };

        request(req, (error, response, body) => {
            if (error) {
                logger2.error(`LEGACY API CALL ERROR : ${error}`);
                reject(new Error(error));
            } else {
                logger2.info('status code: %s, body: %s',  response.statusCode, body);
                resolve(response);
            }           
        })

    })
       
}

exports.ContractListener = ContractListener;