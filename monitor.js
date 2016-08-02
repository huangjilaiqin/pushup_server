

var nodemailer = require('nodemailer');
var db = require('./DBPool.js');
var http=require('http'); 
var WebSocket= require('ws');

var smtpConfig = {
    host: 'smtp.qq.com',
    port: 465,
    secure: true, // use SSL
    auth: {
        user: '1577594730@qq.com',
        pass: '19910803huangji'
    }
};

var mailOption = {
    from :'"天天俯卧撑" <1577594730@qq.com>',
    to:'huangji_gd@163.com',
    subject:'test',
    text:'hello mail',
};

var transporter = nodemailer.createTransport(smtpConfig);

function send(subject,text){
    mailOption.subject = subject;
    mailOption.text = text;
    transporter.sendMail(mailOption, function(error, info){
        if(error){
            console.error(error,info);
        }
    });
}

function sendHtml(subject,html){
    mailOption.subject = subject;
    mailOption.html = html;
    transporter.sendMail(mailOption, function(error, info){
        if(error){
            console.error(error,info);
        }
    });
}

function beat(){
    var ws = new WebSocket('ws://localhost:5002');
    //*
    ws.onopen = function() {
        var info ={eventName:'beat'};
        var intervalId = setInterval(function(){
            //var info ={eventName:'beat'};
            try{
                ws.send(JSON.stringify(info));
            }catch(e){
                console.log(e);
                send('天天俯卧撑服务器异常','error:'+e+'\ntime:'+new Date());
                clearInterval(intervalId);
                monitor();
            }
        },1000);
        send('天天俯卧撑服务器开通','time:'+new Date());
    };

    ws.onmessage = function(msg) {
        console.log('Received message from server: ' + msg.data);
    }
    ws.onerror = function(msg){
        console.log('onerror: ' + msg);
        send('天天俯卧撑服务器异常','error:'+msg+'\ntime:'+new Date());
    }
    //*/
}

function monitor(){
    console.log('monitor');
    var ws = new WebSocket('ws://localhost:5002');
    ws.onopen = function() {
        beat();
        ws.close();
    };
    ws.onerror = function(msg){
        setTimeout(monitor,1000);
    }
}

monitor();


