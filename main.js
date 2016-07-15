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


//var io = require('socket.io')(5002);
var WebSocketServer = require('ws').Server;

//暂时处理没有捕获的错误,记录错误日志
process.on('uncaughtException', function (err) {
    log.fatal('uncaughtException:', err);
    log.fatal('uncaughtException code:', err.code);
    log.fatal('uncaughtException:', err.stack);
    // async throw出来的异常 [Error: Callback was already called.]
});


function onDownLine(){
    
}

var emitCb = function(eventName,obj){
    console.log('emitCb');
};

function afterLoadInfo(err, results){
    if(err){
        log.error('afterLoadInfo err:', err);
        return;
    } 

    var wss = new WebSocketServer({port: 5002});
    wss.on('connection', function(ws) {
        //.headers
        console.log('user-agent:',ws.upgradeReq.headers['user-agent']);
        console.log('cookie:',ws.upgradeReq.headers.cookie);
        console.log('sec-websocket-key:',ws.upgradeReq.headers['sec-websocket-key']);

        ws.on('message', function(message) {
            console.log('received: %s', message);
            //*
            try{
                var msg = JSON.parse(message);
            }catch(e){
                console.log(e);
                return;
            }
            ws.send(JSON.stringify({eventName:'test',name:'server has recv your msg'}));
            if(msg.eventName && protocols[msg.eventName])
                protocols[msg.eventName].call(ws,msg);
            else
                console.log('error format');
            //*/
        });


        ws.send(JSON.stringify({eventName:'test',name:'from server'}));

        ws.on('error', function(){
            console.log('error');
        });
        ws.on('close', function() {
            console.log('stopping client interval');
            //clearInterval(id);
        });
    });
    console.log('listen on 5002');

    /*
    //启动监听端口
    //SocketIO.path('/ws');
    //var io = new SocketIO(http, serverConfig.listenPort);
    log.trace('listen on:', serverConfig.listenPort); 
    console.log('listen on:', serverConfig.listenPort); 

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
            console.log('onDisconnect:', socket.id);
            socket.close();
        });
    });
    */
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
