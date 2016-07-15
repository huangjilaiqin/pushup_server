
var mysql = require('mysql');
var dbConfig = require('./db.json');
//var db = require('./DBPool.js');

var query=function(sql,args,cb){
    var conn = mysql.createConnection(dbConfig);
    conn.connect();
    conn.query(sql,args, function(err,rows) {
        if (err) throw err;
        cb(err,rows);
    });
    conn.end();
}

var resetRemainHp=function(){
    console.log(new Date());
};

var isReset=0;
var resetServer=function(){
    var now=new Date();
    var hour = now.getHours();
    var minute = now.getMinutes();//minute
    var second = now.getSeconds();//second
    //console.log(hour,minute,second);
    if(hour===0 && minute===0 && second===0 && isReset===0){
        query('update t_pushup_user set todayamount=0,remainhp=8',[],function(err, rows){
            if(err){
                console.log('resetServer err',err);
            }else{
                console.log('reset todayamount remainhp');
                isReset=1;
            }
        });
    }
    if(hour===0 && minute===0 && second>0 && isReset===1){
        isReset=0;
    }
};

setInterval(resetServer,500);
