/* ========================
||  LOAD THE DEPENDENCIES ||
==========================*/
require('./utils/env').readEnv();
const express           = require('express');
const app               = express(); 
const bodyParser        = require("body-parser");
const path              = require("path");
// const logger            = require('./utils/logger').logger;
const fs                = require('fs');
const addContractListener          = require('./services/block/addContractListener');
const PORT = process.env.PORT;



/**********************  LOG4JS 추가 부분  **********************/
// Create the log directory if it does not exist
if (!fs.existsSync(process.env.LOGDIR)) {
	fs.mkdirSync(process.env.LOGDIR)
}
// Create the log directory if it does not exist
if (!fs.existsSync(process.env.LISTENERLOGDIR)) {
	fs.mkdirSync(process.env.LISTENERLOGDIR)
}
const log4js = require('log4js');
log4js.configure(__dirname + '/utils/log4js.json');
const logger = log4js.getLogger('app');
/**********************  LOG4JS 추가 부분  **********************/


logger.info("Server Environment => "+ process.profile);
logger.debug("DEBUG DEBUGDEBUG DEBUGDEBUG DEBUGDEBUG DEBUGDEBUG DEBUGDEBUG DEBUGDEBUG DEBUG")
logger.debug("DEBUG DEBUGDEBUG DEBUGDEBUG DEBUGDEBUG DEBUGDEBUG DEBUGDEBUG DEBUGDEBUG DEBUG")
logger.debug("DEBUG DEBUGDEBUG DEBUGDEBUG DEBUGDEBUG DEBUGDEBUG DEBUGDEBUG DEBUGDEBUG DEBUG")
logger.debug("DEBUG DEBUGDEBUG DEBUGDEBUG DEBUGDEBUG DEBUGDEBUG DEBUGDEBUG DEBUGDEBUG DEBUG")
logger.debug("DEBUG DEBUGDEBUG DEBUGDEBUG DEBUGDEBUG DEBUGDEBUG DEBUGDEBUG DEBUGDEBUG DEBUG")
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
        addContractListener.ContractListener()
        .then( (eventhub) => {
            eventHub = eventhub; 
        })
        .catch((error) => {
            process.exit(1);
        })
    }
})

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

const gracefulCleanJob = function() {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        server.close();
        if(eventHub)  eventHub.disconnect();
        resolve();
      }, 3000);  
    })
};