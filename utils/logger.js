require('./env.js').readEnv();
const { createLogger, format, transports } = require('winston');
require('winston-daily-rotate-file');
const moment = require('moment');
const fs = require('fs');

// Create the log directory if it does not exist
if (!fs.existsSync(process.env.LOGDIR)) {
	fs.mkdirSync(process.env.LOGDIR)
}
// Create the log directory if it does not exist
if (!fs.existsSync(process.env.LISTENERLOGDIR)) {
	fs.mkdirSync(process.env.LISTENERLOGDIR)
}

var obj1 = new transports.DailyRotateFile({
    dirname : process.env.LOGDIR,
    filename : process.env.LOGFILENAME, // log 폴더에 system.log 이름으로 저장
    zippedArchive: false, // 압축여부
    format: format.combine(
        format.errors({ stack: true }),
        format.splat(),
        format.json(),
        format.printf(
        info => `${moment().format('YYYY-MM-DD HH:mm:ss')} [${info.level.toUpperCase()}] - ${info.message}`)
    ),
    datePattern: "YYYY-MM-DD",
    maxSize: process.env.LOGFILESIZE, //파일최대크대 50MB
    maxFiles: process.env.LOGKEEPDAY //보관주기 14일
})

var obj2 = new transports.DailyRotateFile({
    dirname : process.env.LISTENERLOGDIR,
    filename : process.env.LISTENERLOGFILENAME, // log 폴더에 system.log 이름으로 저장
    zippedArchive: false, // 압축여부
    format: format.combine(
        format.errors({ stack: true }),
        format.splat(),
        format.json(),
        format.printf(
        info => `${moment().format('YYYY-MM-DD HH:mm:ss')} [${info.level.toUpperCase()}] - ${info.message}`)
    ),
    datePattern: "YYYY-MM-DD",
    maxSize: process.env.LISTENERLOGFILESIZE, //파일최대크대 50MB
    maxFiles: process.env.LISTENERLOGKEEPDAY //보관주기 14일
})

exports.logger = createLogger({
    level: process.env.LOGLEVEL, // 최소 레벨
    // 파일저장 
    transports: [
        obj1,
        new transports.File({ 
            dirname : process.env.LOGDIR,
            filename : process.env.LOGFILENAME, // log 폴더에 system.log 이름으로 저장
            format: format.combine(
                format.errors({ stack: true }),
                format.splat(),
                format.json(),
                format.printf(
                info => `${moment().format('YYYY-MM-DD HH:mm:ss')} [${info.level.toUpperCase()}] - ${info.message}`)
            ),
            maxsize: process.env.LOGFILESIZE,
            tailable: true,
            maxFiles: 5
        }),
        // 콘솔 출력
        new transports.Console({
            format: format.combine(
                format.errors({ stack: true }),
                format.splat(),
                format.json(),
                format.printf(
                info => `${moment().format('YYYY-MM-DD HH:mm:ss')} [${info.level.toUpperCase()}] - ${info.message}`)
            )
        })    
    ]
});



exports.listenerLogger = createLogger({
    level: process.env.LISTENERLOGLEVEL, // 최소 레벨
    // 파일저장 
    transports: [
        obj2,
        new transports.File({ 
            dirname : process.env.LISTENERLOGDIR,
            filename : process.env.LISTENERLOGFILENAME, // log 폴더에 system.log 이름으로 저장
            format: format.combine(
                format.errors({ stack: true }),
                format.splat(),
                format.json(),
                format.printf(
                info => `${moment().format('YYYY-MM-DD HH:mm:ss')} [${info.level.toUpperCase()}] - ${info.message}`)
            ),
            maxsize: 500000000,
            tailable: true,
            maxFiles: 5
        }),
        // 콘솔 출력
        new transports.Console({
            format: format.combine(
                format.errors({ stack: true }),
                format.splat(),
                format.json(),
                format.printf(
                info => `${moment().format('YYYY-MM-DD HH:mm:ss')} [${info.level.toUpperCase()}] - ${info.message}`)
            )
        })
    ]
});


