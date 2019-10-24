const { FileSystemWallet, Gateway } = require('fabric-network');
const fs = require('fs');
const path = require('path');
// const logger = require('../../utils/logger.js').logger;
const logger = require('log4js').getLogger('helper')
const {resultCode} = require('../../resultCode');
const EventStrategies               = require('fabric-network/lib/impl/event/defaulteventhandlerstrategies');
const isPortReachable               = require('is-port-reachable');
const ccpPath = path.resolve(__dirname, process.env.NETWORK_CONFIG_FILE);
const ccpJSON = fs.readFileSync(ccpPath, 'utf8');
const ccp     = JSON.parse(ccpJSON);
const moment = require('moment');
let obj = { contract: null, gateway: null }; 

async function load_network_config(walletName, identity) {
    try {
        var err; 
        const walletPath = path.join(__dirname, walletName);
        const wallet = new FileSystemWallet(walletPath);
        const userExists = await wallet.exists(identity);
        if(!userExists) {
            logger.error(`An identity for the user ${identity} does not exist in the wallet`);
            logger.error('Run the enrollhccAdmin.js application before retrying');
            // err = resultCode.FABRIC_IDENTITY_ERROR.code + '|' + resultCode.FABRIC_IDENTITY_ERROR.message;
            throw new Error();
        }

        const connectionOptions = {
            identity: identity,
            wallet,
            eventHandlerOptions: {
                commitTimeout: 300, //커밋타임아웃 설정
            //    strategy: EventStrategies.NETWORK_SCOPE_ALLFORTX //채널내의 모든 피어에게 이벤트 청취 
                strategy: null
              },
            // checkpointer: {
			// 	factory: CheckpointFactories.FILE_SYSTEM_CHECKPOINTER,
            //     channelName: process.env.CHANNEL_NAME,
            //     listenerName: process.env.LISTENER_NAME,
            //     options: {basePath: process.env.CHECKPOINT_PATH}
			// },
            discovery : { enabled : false, asLocalhost : false},
            clientTlsIdentity : identity 
          };
        
        const gateway = new Gateway();
        await gateway.connect(ccp, connectionOptions);

        return gateway; 
        
    } catch(error) {
        logger.error(`load_network_config() error : ${error}`);
        err =  resultCode.FABRIC_GATEWAY_CONNECT_ERROR.code + '|' +  resultCode.FABRIC_GATEWAY_CONNECT_ERROR.message;
        throw new Error(err);
    }

}

async function get_contract() {
    try {
        var err; 
        const gateway = await load_network_config(
            process.env.WALLETNAME, process.env.ADMIN);
        const network = await gateway.getNetwork(process.env.CHANNEL_NAME);
        const contract = network.getContract(process.env.CHAINCODE_NAME);
        return {contract, gateway};
    } catch (error) {
        logger.error(`Failed to get_contract(): ${error}`);
        err = resultCode.FABRIC_GET_CONTRACT_ERROR.code + '|' + resultCode.FABRIC_GET_CONTRACT_ERROR.message; 
        throw new Error(err);
    }
}
//디스커버리 안쓸 때 에러 파싱 처리 
function setErrorMsg(errMessage) {
    if (errMessage.indexOf('|') !== -1) {
        if(errMessage.indexOf('message') !== -1) {  
            //query 에러 처리 
            let strArr = errMessage.split('message');
            for(var i =0; i<strArr.length; i++){
                console.log(strArr[i])
            }
             let test = strArr[1].split('"');
            let strArr2 = test[2].split('|');
            return [strArr2[0], strArr2[1]];
        } else {
            let strArr = errMessage.split('\n');
            let strArr2 = strArr[1].split('|');
            return [strArr2[0].trim(), strArr2[1]];
        }

    } else {
        return [resultCode.FABRIC_ETC_ERROR.code, resultCode.FABRIC_ETC_ERROR.message];
    }
}
// function setErrorMsg(err) {
//     if(err.toString().indexOf(',') != -1) {
//         const errArr = err.toString().split(',')
//         return parseError(errArr[0]);
//     }else {
//         return parseError(err);
//     }
// }

function parseError(errMessage) {
    if(errMessage.toString().indexOf('|') != -1) {
        const aa = errMessage.toString().split('Error: ');      
        const resultErr = aa[1].split('|');
        return [resultErr[0], resultErr[1]];
    } else {
        return [resultCode.FABRIC_ETC_ERROR.code, resultCode.FABRIC_ETC_ERROR.message];
    }
}

async function checkAvailablePeer(peer) {
    try {
        
        const ipAddress = peer.getUrl().split("//")[1];
        const peer_ip_port = ipAddress.split(":");  
        const availity =await isPortReachable(peer_ip_port[1], {host: peer_ip_port[0]});
        return availity;   
    } catch(error) {
        logger.error(`checkAvailablePeer error:${error}`)
        throw new Error(error);
    }

}

function getEventhubFromPeer(channel, peer) {
    let map = new Map();
    const peerName = peer.getName();
    const event_hub = channel.getChannelEventHub(peerName);
    map.set('channel', channel);
    map.set('eventhub', event_hub);
    map.set('peerName', peerName);
    return map;
}

async function deleteUserData(pubData) {

    let BufferedPubData = Buffer.from(JSON.stringify(pubData));
    let deleteData = {
        privPersonal : BufferedPubData
    }
    try{
        if(obj.contract === null || obj.gateway === null) obj = await get_contract(); 
        await obj.contract.createTransaction('deleteUserData')
        .setTransient(deleteData)
        .submit('');
        return Promise.resolve(); 
    } catch(error) {
        if(error.endorsements) logger.error(`deleteUserData error: ${error.endorsements}`);
        else logger.error(`deleteUserData error : ${error}`);
        return Promise.reject(error);
    } 

}

async function submitTransaction(funcName, pubData, privData) {
    try{
        if(obj.contract === null || obj.gateway === null) obj = await get_contract(); 
        transaction = await obj.contract.createTransaction(funcName);
        await transaction.setTransient(privData);
        await transaction.submit(JSON.stringify(pubData));    
        await addTxListener(transaction); 
        return Promise.resolve();
    } catch(error) {
        logger.error(`submitTransaction error: ${error}`)
        return Promise.reject(error);
    }

}

function addTxListener(transaction) {
    return new Promise((resolve, reject) => {
        transaction.addCommitListener((err, transactionId, status, blockNumber) => {
            logger.info(`Transaction ID: ${transactionId}, Status: ${status}, Block number: ${blockNumber}`);
            if (err) {
                logger.error(err);
                reject(err);
            } else {
                if(status != 'VALID') {
                    logger.error(`Transaction ID: ${transactionId}, Status: ${status}, Block number: ${blockNumber}`)
                    reject(new Error(`Transaction Status is not VAILD`));
                } else {
                    resolve();
                }
            }
        });
    })
}

exports.load_network_config = load_network_config;
exports.get_contract = get_contract;
exports.setErrorMsg = setErrorMsg;
exports.checkAvailablePeer = checkAvailablePeer;
exports.getEventhubFromPeer = getEventhubFromPeer;
exports.deleteUserData = deleteUserData;
exports.submitTransaction = submitTransaction;