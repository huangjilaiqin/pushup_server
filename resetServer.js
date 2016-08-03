
var mysql = require('mysql');
var dbConfig = require('./db.json');
var db = require('./DBPool.js');
var util = require('./util.js');
var async = require('async');
var mail = require('./mail.js');
var schedule = require('node-schedule');

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

var resetServer=function(){
    query('update t_pushup_user set todayamount=0,remainhp=5,maxwin=0',[],function(err, rows){
        if(err){
            log.info('resetServer err',err);
        }else{
            log.info('reset todayamount remainhp ok', new Date());
        }
    });
};


var channels = {
    1:'蒲公英',
    2:'360手机助手',
    4:'百度手机助手',
    5:'91',
    6:'安卓市场',
    7:'木蚂蚁',
    8:'应用宝',
    9:'小米',
}

function statisticsData(){
    
    async.parallel(
        [
            //今日新增
            function(cb){
                var sql = 'select count(userid),registerFrom as newNum from t_pushup_user where registerTime>=? group by registerFrom';
                db.query(sql,[util.dayOfBegin(new Date())],function(err,rows){
                    console.log(rows);
                    var msg = '';
                    for(var i in rows){
                        var row = rows[i];
                        var channel = channels[row['registerFrom']];
                        if(!channel)
                            channel=row['registerFrom'];
                        msg +=  '\t'+channel+':'+row['newNum']+'\n';
                    }
                    if(msg==='')
                        msg = '\t无\n'
                    cb(err,'今日新增:\n'+msg);
                });
            },
            //日活
            function(cb){
                sql = 'select count(userid) as activeNum from t_pushup_user where lastfighttime>=?';
                db.query(sql, [util.dayOfBegin(new Date())], function(err, rows){
                    var activeNum=0;
                    if(rows.length>0)
                        activeNum=rows[0]['activeNum'];
                    cb(err,'日活:\n\t'+activeNum+'\n');
                });
            },
        ],
        function(err, results){
            if(err){
                log.info('statisticsData error:',err);
                mail.send('天天俯卧撑数据统计--异常',err);
            }else{
                var rows = results[0].concat(results[1]);
                var mailMsg = results.join('');
                log.info('statisticsData ok',new Date());
                mail.send('天天俯卧撑数据统计',mailMsg);
            }
        } 
    );
}

function ticktack(){
    var rule = new schedule.RecurrenceRule();
    rule.hour=23;
    rule.minute=55;
    rule.second=0;
    schedule.scheduleJob(rule,statisticsData);

    rule = new schedule.RecurrenceRule();
    rule.hour=0;
    rule.minute=0;
    rule.second=0;
    schedule.scheduleJob(rule,resetServer);

}
ticktack();
