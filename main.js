var fs = require('fs');
var mysql = require('mysql');
var async = require('async');
var os = require('os');


var DateFormat = require('./util.js').DateFormat;
var protocols = require('./protocols.js');
var db = require('./DBPool.js');
var log = require('./log.js');

var global = require('./global.js');
var userSockets = global.userSockets;
var parseData = require('./util.js').parseData;


//var io = require('socket.io')(5002);
var WebSocketServer = require('ws').Server;

//*
//暂时处理没有捕获的错误,记录错误日志
process.on('uncaughtException', function (err) {
    //log.fatal('uncaughtException:', err);
    //log.fatal('uncaughtException code:', err.code);
    log.fatal('uncaughtException:', err.stack);
    // async throw出来的异常 [Error: Callback was already called.]
});
//*/


function onDownLine(){
    
}

function afterLoadInfo(err, results){
    if(err){
        log.error('afterLoadInfo err:', err);
        return;
    } 

    var wss = new WebSocketServer({port: 5002});
    wss.on('connection', function(ws) {
        //.headers
        log.info('user-agent:',ws.upgradeReq.headers['user-agent']);
        log.info('onConnect sec-websocket-key:',ws.upgradeReq.headers['sec-websocket-key']);

        ws.on('message', function(message) {
            //log.info('received:', message);
            //*
            try{
                var msg = JSON.parse(message);
            }catch(e){
                log.info(e);
                return;
            }
            //ws.send(JSON.stringify({eventName:'test',name:'server has recv your msg'}));
            if(msg.eventName && protocols[msg.eventName])
                protocols[msg.eventName].call(ws,msg);
            else
                log.error('onmessage error format');
            //*/
        });

        //ws.send(JSON.stringify({eventName:'test',name:'from server'}));

        ws.on('error', function(){
            log.info('error:',arguments);
        });
        ws.on('close', function(errno,reason) {
            log.info('onClose sec-websocket-key:',this.upgradeReq.headers['sec-websocket-key']);

            var userid = this.userid;
            if(userid!==undefined){
                delete userSockets[userid];
            }
        });
    });
    log.info('listen on 5002');

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
