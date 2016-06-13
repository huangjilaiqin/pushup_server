var fs = require('fs');
var mysql = require('mysql');
var async = require('async');
var os = require('os');


var DateFormat = require('./util.js').DateFormat;
var protocols = require('./protocols.js');
var db = require('./DBPool.js');
var log = require('./log.js').log;
var logPerformance = require('./log.js').logPerformance;

var global = require('./global.js');
var parseData = require('./util.js').parseData;


var io = require('socket.io')(5002);

//暂时处理没有捕获的错误,记录错误日志
process.on('uncaughtException', function (err) {
    log.fatal('uncaughtException:', err);
    log.fatal('uncaughtException code:', err.code);
    log.fatal('uncaughtException:', err.stack);
    // async throw出来的异常 [Error: Callback was already called.]
});


function onDownLine(){
    
}

function afterLoadInfo(err, results){
    if(err){
        log.error('afterLoadInfo err:', err);
        return;
    } 

    //启动监听端口
    //SocketIO.path('/ws');
    //var io = new SocketIO(http, serverConfig.listenPort);
    log.trace('listen on:', serverConfig.listenPort); 
    console.log('listen on:', serverConfig.listenPort); 

    /*
    io.on('connection', function(socket){
        log.trace('io.on onConnect:', socket.id);
    });
    */

    
    io.on('connection', function(socket){
        log.trace('onConnect:', socket.id);
        console.log('onConnect:', socket.id);
        for(var protocolName in protocols)
        {
            var protocolFun = protocols[protocolName];
            socket.on(protocolName, protocolFun);
        }
        
        socket.on('disconnect', function(){
            log.trace('onDisconnect:', socket.id);
        });
    });
}

function init(){
    async.parallel(
        [
            //加载历史记录
            //loadHistory,
            //加载房间数据
            //loadRoomsInfo,
        ],
        //启动监听服务
        afterLoadInfo
    );
}

function exit(){

}

init();
