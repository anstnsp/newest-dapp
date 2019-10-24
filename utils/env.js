
const fs = require('fs');
const path = require('path');
const basePath = path.resolve(__dirname,'..');
/* ========================
||  환경설정 파일명 선택   ||
==========================*/
//환경별 참조 설정파일 
//운영 : .env-prod
//개발 : .env-dev
//로컬 : .env-local 
function readEnv() {
    let envFileName = '.env-local';
    if (process.argv.length >= 3 && (process.argv[2] === 'dev' || process.argv[2] === 'prod')) {
        envFileName = '.env-' + process.argv[2];
        process.profile = process.argv[2];
    } else {
        process.profile = 'local';
    }

    if(!fs.existsSync(basePath + '/' + envFileName)) {
        throw new Error('configFile is not exist ...');
    }
    /* ========================
    ||    LOAD THE CONFIG     ||
    ==========================*/
    require("dotenv").config({path:basePath + "/"+  envFileName});
    
}

module.exports.readEnv = readEnv
