require('./utils/env').readEnv();
const cluster = require('cluster');
const os = require('os');
const uuid = require('uuid');
//키생성 - 서버 확인용
var instance_id = uuid.v4();
// var instance_id = (Math.random()*1000).toString().substring(0,2)
const fs = require('fs');
/**********************  LOG4JS 추가 부분  **********************/
// Create the log directory if it does not exist
if (!fs.existsSync(process.env.LOGDIR)) {
    fs.mkdirSync(process.env.LOGDIR)
}
// Create the log directory if it does not exist
if (!fs.existsSync(process.env.LISTENERLOGDIR)) {
    fs.mkdirSync(process.env.LISTENERLOGDIR)
}
/**********************  LOG4JS 추가 부분  **********************/
    //log4js 모듈 
    const log4js = require('log4js');
    log4js.configure(__dirname + '/utils/log4js.json');

/**
 * 워커 생성
 */
var cpuCount = os.cpus().length; //CPU 수
var workerCount = cpuCount/2; //2개의 컨테이너에 돌릴 예정 CPU수 / 2
 
//마스터일 경우
if (cluster.isMaster) {
    //마스터 프로세스가 필요한 모듈 
    const addContractListener = require('./services/block/addContractListener');
    console.log('서버 ID : '+instance_id);
    console.log('서버 CPU 수 : ' + cpuCount);
    console.log('생성할 워커 수 : ' + workerCount);
    console.log(workerCount + '개의 워커가 생성됩니다\n');

    addContractListener.ContractListener()
    .then( (eventhub) => {
        eventHub = eventhub; 
    })
    .catch((error) => {
        process.exit(1);
    })
    
    //워커 메시지 리스너
    var workerMsgListener = function(msg){
       
            var worker_id = msg.worker_id;
           
            //마스터 아이디 요청
            if (msg.cmd === 'MASTER_ID') {
                cluster.workers[worker_id].send({cmd:'MASTER_ID',master_id: instance_id});
            }
    }
   
    //CPU 수 만큼 워커 생성
    for (var i = 0; i < workerCount; i++) {
        console.log("워커 생성 [" + (i + 1) + "/" + workerCount + "]");
        var worker = cluster.fork();
        
        //워커의 요청메시지 리스너
        worker.on('message', workerMsgListener);
    }
   
    //워커가 online상태가 되었을때
    cluster.on('online', function(worker) {
        console.log('워커 온라인 - 워커 ID : [' + worker.process.pid + ']');
    });
   
    //워커가 죽었을 경우 다시 살림
    cluster.on('exit', function(worker) {
        console.log('워커 사망 - 사망한 워커 ID : [' + worker.process.pid + ']');
        console.log('다른 워커를 생성합니다.');
       
        var worker = cluster.fork();
        //워커의 요청메시지 리스너
        worker.on('message', workerMsgListener);
    });
 
//워커일 경우
} else if(cluster.isWorker) {
        /* ========================
    ||  LOAD THE DEPENDENCIES ||
    ==========================*/
    const express           = require('express');
    const app               = express(); 
    const bodyParser        = require("body-parser");
    // const logger            = require('./utils/logger').logger;
    // const addContractListener          = require('./services/block/addContractListener');
    const PORT = process.env.PORT;
    var worker_id = cluster.worker.id;
    var master_id;
    const logger = log4js.getLogger('app'+worker_id);
    logger.info("Server Environment => "+ process.profile);

    /* ========================
    ||       MIDDLEWARE      ||
    ==========================*/
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({extended : true}));

    let eventHub;
    /* ========================
    ||       ROUTE           ||
    ==========================*/
    app.use('/refund', require('./router/refund'));

    /* ========================
    ||     SERVER LISTEN      ||
    ==========================*/
    const server=app.listen(PORT, err =>{
        if(err) {
            logger.error(err);
        } else {
            logger.info("HCC dapp server is listening on port " + PORT);

        }
    })

        //마스터에게 master_id 요청
        process.send({worker_id: worker_id, cmd:'MASTER_ID'});
        process.on('message', function (msg){
            if (msg.cmd === 'MASTER_ID') {
                master_id = msg.master_id;
            }
        });
    
        app.get('/', function (req, res) {
            res.send('안녕하세요 저는<br>['+master_id+']서버의<br>워커 ['+ cluster.worker.id+'] 입니다.');
        });
        
    //프로세스 시그널 종류 
    //SIGTERM(nomally exit), SIGINT(Ctrl+c), SIGQUIT(sigint랑 비슷)
    //SIGKILL(), SIGHUP(user's terminal is disconnected, network,tele connection broken) 
    process.on('SIGINT', function () {
        logger.info('DAPP SERVER IS CLOSED BY <Ctrl + c> !! ');
        gracefulCleanJob().then(() => {
            process.exit();
        })
    });

    process.on('SIGTERM', function () {
        logger.info('DAPP SERVER IS NOMALLY CLOSED!! ');
        gracefulCleanJob().then(() => {
            process.exit();
        })
    });

    process.on('exit', function (code) {
        logger.info(`DAPP SERVER IS COMPLETELY CLOSED WITH CODE:${code}`)
    });

}


const gracefulCleanJob = function() {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        server.close();
        if(eventHub)  eventHub.disconnect();
        resolve();
      }, 3000);  
    })
};