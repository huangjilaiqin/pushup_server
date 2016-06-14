

var db = require('./DBPool.js');
var log = require('./log.js').log;
var logPerformance = require('./log.js').logPerformance;
var parseData = require('./util.js').parseData;
var DateFormat = require('./util.js').DateFormat;
var fs = require('fs');
var md5 = require('md5');


var protocols = {
    'register':onRegister,
    'login':onLogin,
    'logout':onLogout,
    'verifyToken':onVerifyToken,
    'testMessage':onTestMessage,
    'searchOpponent':onSearchOpponent,
    'uploadRecord':onUploadRecord,
    'rank':onRank,
    'beFightRecords':onBeFightRecords,
    'fightRecords':onFightRecords,

};



var mailReg = /^\w+@\w+\.\w+$/;
var REGISTER_MAIL = 1;
var REGISTER_WEIXIN = 2;
var registerTypes = [REGISTER_MAIL, REGISTER_WEIXIN];

function checkRegister(data){
    var obj = JSON.parse(data);
    var username = obj['username'];
    var passwd = obj['passwd'];
    if(!username || !passwd){
        return {'error':'error args'};
    }
    return obj;
}

function onRegister(data){
    console.log('register', data);
    var obj = checkRegister(data);
    var username = obj['username'];
    var passwd = obj['passwd'];
    log.trace('register', obj);
    var emitter = this;
    if(obj['error']){
        log.trace('register error', obj['error']);
        emitter.emit('register', JSON.stringify(obj));
    }else{
        log.trace('register', 'register no error');
        db.query('select 1 from t_pushup_user where username= ?', [username], function(err, rows){
            if(err){
                emitter.emit('register', JSON.stringify({'error':err}));
            }else if(rows.length!=0){
                emitter.emit('register', JSON.stringify({'error':'用户名已存在'}));
            }else{
                log.trace('register mail insert');
                db.query('insert into t_pushup_user(username, passwd) values (?,?)', [username,passwd], function(err, rows){
                    if(err){
                        emitter.emit('register', JSON.stringify({'error':err}));
                    }else{
                        var userId = rows.insertId;
                        log.info('register userid:'+userId);
                        emitter.emit('register', JSON.stringify({'userid':userId,'username':username}));
                    }
                });
            }
        });
                
    }
}



function checkLogin(data){
    var obj = JSON.parse(data);
    var username = obj['username'];
    var passwd = obj['passwd'];
    if(!username || !passwd){
        return {'error':'error args'};
    }
    return obj;
}



var USER_STATUS_ONLINE = 1;
var USER_STATUS_OFFLINE = 2;
var USER_STATUS_BUSY = 3;

function onVerifyToken(data){
    log.debug('onVerifyToken:', data);
    var obj = checkVerifyToken(data);
    console.log('onVerifyToken:', obj);
    var userid = obj['userid'];
    var token = obj['token'];
    var emitter = this;

    if(obj['error']){
        emitter.emit('verifyToken', JSON.stringify(obj));
        console.log('verifyToken',obj['error']);
    }else{
        if(verifyToken(userid,token)){
            console.log('verifyToken success');
            //token有效
            sql = 'select * from t_pushup_user where userid=?';
            db.query(sql,[userid],function(err, rows){
                if(err){
                    emitter.emit('verifyToken', JSON.stringify({'error':err}));
                }else{
                    var data = rows[0];
                    var responseObj = {
                        userid:userid,
                        total:data['total'],
                        win:data['win'],
                        lost:data['lost'],
                        draw:data['draw'],
                        value:data['value'],
                    };
                    console.log('verifyToken success:',responseObj);
                    emitter.emit('verifyToken', JSON.stringify(responseObj));
                }
            });
        }else{
            //需要登录
            emitter.emit('verifyToken', JSON.stringify({'error':'token is expire', 'errno':401}));
            console.log('verifyToken expire');
        }
    }
}

function verifyToken(userid,token){
    oldToken=getToken(userid);
    if(token==oldToken){
        //token有效
        return 1;
    }else{
        //需要登录
        return 0;
    }
}

function checkVerifyToken(data){
    var obj = JSON.parse(data);
    var userid = obj['userid'];
    var token = obj['token'];
    if(!userid || !token){
        return {'error':'error argument'};
    }
    return obj;
}

function getToken(key){
    return tokens[key];
}

function generateToken(userid){
    return md5(userid+new Date().getTime());    
}



function loadInitData(userid){
    return {};
}

function onLogin(data){
    log.debug('onLogin:', data);
    console.log('onLogin:', data);
    var emitter = this;
    var obj = checkLogin(data);
    var username = obj['username'];
    var passwd = obj['passwd'];
    if(obj['error']){
        emitter.emit('login', JSON.stringify(obj));
    }else{
        db.query('select * from t_pushup_user where username=? and passwd=?', [username, passwd], function(err, rows){
            if(err){
                emitter.emit('login', JSON.stringify({'error':err}));
            }else{
                if(rows.length == 0){
                    emitter.emit('login', JSON.stringify({'error':'用户名不存在或密码错误'}));
                }else{
                    var data = rows[0];
                    var userid = rows[0]['userid'];
                    token = generateToken(userid);
                    //tokens存储在内存中
                    tokens[userid] = token;
                    console.log('login success');

                    var responseObj = {
                        userid:userid,
                        token:token,
                        username:data['username'],
                        total:data['total'],
                        win:data['win'],
                        lost:data['lost'],
                        draw:data['draw'],
                        value:data['value'],
                    };

                    console.log(JSON.stringify({'userid':userid,'token':token}));
                    emitter.emit('login', JSON.stringify(responseObj));
                }
            }        
        });
    }
}

function checkSearchOpponent(data){
    var obj = JSON.parse(data);
    var userid = obj['userid'];
    var token = obj['token'];
    if(!userid || !token){
        return {'error':'error args'};
    }
    return obj;
}



function onSearchOpponent(data){
    log.debug('onSearchOpponent:', data);
    var emitter = this;
    console.log('onSearchOpponent:', data);
    var obj = checkSearchOpponent(data);
    if(obj['error']){
        emitter.emit('searchOpponent', JSON.stringify(obj));
        return;
    }
    var userid = obj['userid'];
    var token = obj['token'];
    if(verifyToken(userid,token)){
        //token有效
        //查找自己的实力
        sql = 'select * from t_pushup_user where userid=?'
        console.log('userid type:',userid,typeof(userid));
        db.query(sql, [userid], function(err, rows){
            if(err){
                emitter.emit('searchOpponent', JSON.stringify({'error':err}));
                return;
            }
            console.log(rows);
            console.log(rows.length);
            if(rows.length==1){
                myvalue = rows[0]['value'];
                if(myvalue==0)
                    myvalue=1
                maxvalue = myvalue*1.2;
                minvalue = myvalue*0.8;
                console.log('myvalue:',myvalue);
                //查找实力相当的对手
                opponentSql = 'select * from t_pushup_user where value>=? and value<=? and userid!=? order by rand() limit 1';
                db.query(opponentSql, [minvalue,maxvalue,userid], function(err, rows){
                    if(err){
                        emitter.emit('searchOpponent', JSON.stringify({'error':err}));
                        return;    
                    }
                    console.log('equal opponent',rows.length);
                    //没有实力相当的选手,查找有实力(即有记录)的选手不需要实力相当
                    if(rows.length==0){
                        opponentSql = 'select * from t_pushup_user where value>0 and userid!=? order by rand() limit 1'
                        db.query(opponentSql, [userid], function(err, rows){
                            if(err){
                                emitter.emit('searchOpponent', JSON.stringify({'error':err}));
                                return;    
                            }
                            //服务器是根本没有运动记录
                            if(rows.length==0){
                                console.log('no equal opponent');
                                //伪造一个机器人
                                records = [];
                                times = 20+Math.floor(Math.random()*3);
                                for(var i=0;i<times;i++){
                                    var positive = Math.random()<0.5?1:-1;
                                    records.push(1*(1+0.2*positive));
                                }
                                console.log(records);
                                responseData = {
                                    id:-1,
                                    username:'扫地生',
                                    userid:-1,
                                    records:records,
                                    sporttime:new Date(),
                                };
                                console.log(responseData);
                                emitter.emit('searchOpponent', JSON.stringify(responseData));
                            }else{
                                opponentData = rows[0];
                                console.log('opponent value:',opponentData['value']);
                                console.log(opponentData);
                                var opponentId = opponentData['userid'];
                                var opponentName = opponentData['username'],

                                recordSql = 'select * from t_pushup_record where userid=? order by sporttime desc limit 10'
                                db.query(recordSql, [opponentId], function(err, rows){
                                    if(err){
                                        emitter.emit('searchOpponent', JSON.stringify({'error':err}));
                                        console.log('not equal opponent error:',err);
                                    }else{
                                        size = rows.length;
                                        
                                        //随机一场
                                        index = Math.floor(Math.random()*size);
                                        
                                        console.log('not equal opponent data size:',size,',index:',index);
                                        recordData = rows[index];
                                        responseData = {
                                            id:recordData['id'],
                                            userid:opponentId,
                                            username:opponentName,
                                            records:JSON.parse(recordData['record']),
                                            sporttime:recordData['sporttime'],
                                        };
                                        console.log('not equal opponent responseData,',responseData);
                                        emitter.emit('searchOpponent', JSON.stringify(responseData));
                                    }
                                });
                            }
                        });
                    }else{
                        opponentData = rows[0];
                        var opponentId = opponentData['userid'];
                        var opponentName = opponentData['username'];

                        //取对手最近10场比赛中的任意一场
                        recordSql = 'select * from t_pushup_record where userid=? order by sporttime desc limit 10'
                        db.query(recordSql, [opponentId], function(err, rows){
                            if(err){
                                emitter.emit('searchOpponent', JSON.stringify({'error':err}));
                            }else{
                                size = rows.length;
                                
                                //随机一场
                                index = Math.floor(Math.random()*size);
                                var recordData = rows[index];
                                responseData = {
                                    id:recordData['id'],
                                    username:opponentName,
                                    userid:opponentId,
                                    records:JSON.parse(recordData['record']),
                                    sporttime:recordData['sporttime'],
                                };
                                emitter.emit('searchOpponent', JSON.stringify(responseData));
                            }
                        });
                    }
                });
            }else{
                emitter.emit('searchOpponent', JSON.stringify({'error':'you are not exist'}));
            }
        });
    }else{
        //需要登录
        emitter.emit('verifyToken', JSON.stringify({'error':'token is expire', 'errno':401}));
    }
}
function checkUploadRecord(data){
    var obj = JSON.parse(data);
    var userid = obj['userid'];
    var token = obj['token'];
    var opponentId = obj['opponentId'];
    var oRecordId = obj['oRecordId'];
    var oRecordSize = obj['oRecordSize'];
    var records = obj['records'];
    if(!userid || !token || !opponentId || !records || !oRecordId || !oRecordSize){
        return {'error':'error args'};
    }
    return obj;
}
function onUploadRecord(data){
    var emitter = this;
    console.log('onUploadRecord:', data);
    var obj = checkUploadRecord(data);
    if(obj['error']){
        emitter.emit('uploadRecord', JSON.stringify(obj));
        return;
    }
    var userid = obj['userid'];
    var token = obj['token'];
    var opponentId = obj['opponentId'];
    var oRecordId = obj['oRecordId'];
    var oRecordSize = obj['oRecordSize'];
    var records = obj['records'];
    var mRecordSize = records.length;

    if(verifyToken(userid,token)){
        emitter.emit('uploadRecord', JSON.stringify('uploadRecord is ok'));
        //token有效
        //*
        sql = 'insert into t_pushup_record (userid,record,costtime,sporttime)values(?,?,?,?)'
        console.log('userid type:',userid,typeof(userid));
        console.log([userid,JSON.stringify(records),20,new Date()]);
        db.query(sql, [userid,JSON.stringify(records),20,new Date()], function(err, rows){
            if(err){
                emitter.emit('uploadRecord', JSON.stringify({'error':err}));
                console.log(err);
                return;
            }else{
                var id = rows.insertId;
                sql = 'insert into t_pushup_fight (userid,opponentid,urecordid,orecordid,uscore,oscore)values(?,?,?,?,?,?)';
                db.query(sql,[userid,opponentId,id,oRecordId,mRecordSize,oRecordSize],function(err, rows){
                    if(err){
                        emitter.emit('uploadRecord', JSON.stringify({'error':err}));
                        console.log(err);
                        return;
                    }else{
                        //计算用户的平均值
                        sql = 'select `value` from t_pushup_user where userid=?';
                        db.query(sql,[userid],function(err, rows){
                            if(err){
                                emitter.emit('uploadRecord', JSON.stringify({'error':err}));
                                return;
                            }else{
                                if(rows.length>0){
                                    var oldValue = rows[0]['value'];
                                    var currentValue = 0;
                                    var recordSize = records.length;
                                    for(var i=0;i<recordSize;i++){
                                        currentValue+=records[i]; 
                                    }
                                    console.log('times:',currentValue);
                                    //单位: 个/秒
                                    currentValue=recordSize/currentValue;
                                    console.log('speed:',currentValue);
                                    //耐力值: 总个数/标准个数
                                    endurance=recordSize/20;
                                    console.log('endurance:',endurance);
                                    //能力值=速度*耐力值
                                    currentValue*=endurance

                                    console.log('currentValue:',currentValue,'oldValue:',oldValue);
                                    if(oldValue!=0){
                                        currentValue = (oldValue+currentValue)/2;
                                    }

                                    winSql = 'update t_pushup_user set value=?,total=total+?,win=win+1 where userid=?';
                                    drawSql = 'update t_pushup_user set value=?,total=total+?,draw=draw+1 where userid=?';
                                    lostSql = 'update t_pushup_user set value=?,total=total+?,lost=lost+1 where userid=?';
                                    if(mRecordSize>oRecordSize)
                                        sql = winSql;
                                    else if(mRecordSize<oRecordSize)
                                        sql = lostSql;
                                    else
                                        sql = drawSql;

                                    db.query(sql,[currentValue,mRecordSize,userid],function(err, rows){
                                        if(err){
                                            emitter.emit('uploadRecord', JSON.stringify({'error':err}));
                                            console.log('uploadRecord',err);
                                            return;
                                        }else{
                                            sql = 'select * from t_pushup_user where userid=?';
                                            db.query(sql,[userid],function(err, rows){
                                                console.log(err,rows);
                                                if(err){
                                                    console.log(err);
                                                    emitter.emit('uploadRecord', JSON.stringify({'error':err}));
                                                }else{
                                                    var data = rows[0];
                                                    var responseObj = {
                                                        userid:userid,
                                                        total:data['total'],
                                                        win:data['win'],
                                                        lost:data['lost'],
                                                        draw:data['draw'],
                                                        value:data['value'],
                                                    };
                                                    emitter.emit('uploadRecord', JSON.stringify(responseObj));
                                                }
                                            });
                                        }
                                    });
                                }
                            }
                        });
                    }
                });
            }
        });
        //*/
    }else{
        emitter.emit('verifyToken', JSON.stringify({'error':'token is expire', 'errno':401}));
    }
}

function checkRank(data){
    var obj = JSON.parse(data);
    var userid = obj['userid'];
    var token = obj['token'];
    if(!userid || !token){
        return {'error':'error args'};
    }
    return obj;
}

function onRank(data){
    var emitter = this;
    console.log('rank',data);
    var obj = checkRank(data);

    if(obj['error']){
        console.log('rank',err);
        emitter.emit('rank', JSON.stringify(obj));
        return;
    }
    var userid = obj['userid'];
    var token = obj['token'];

    if(verifyToken(userid,token)){
        sql = 'select userid,username,total,win,draw,lost,value from t_pushup_user order by total desc,win desc,lost,draw,userid';
        console.log('verifyToken success');
        db.query(sql, [], function(err, rows){
            if(err){
                emitter.emit('rank', JSON.stringify({'error':err}));
                console.log(err);
            }else{
                emitter.emit('rank', JSON.stringify({'rank':rows}));
                console.log('rank:',rows);
            }
        });
    }else{
        emitter.emit('verifyToken', JSON.stringify({'error':'token is expire', 'errno':401}));
        console.log('rank',err);
    }
}

function checkFightRecords(data){
    var obj = JSON.parse(data);
    var userid = obj['userid'];
    var token = obj['token'];
    if(!userid || !token){
        return {'error':'error args'};
    }
    return obj;
}

function onFightRecords(data){
    var emitter = this;
    console.log('fightRecords',data);
    var obj = checkRank(data);

    if(obj['error']){
        console.log('fightRecords',err);
        emitter.emit('fightRecords', JSON.stringify(obj));
        return;
    }
    var userid = obj['userid'];
    var token = obj['token'];

    if(verifyToken(userid,token)){
        sql = 'select f.*,u.username from t_pushup_fight as f inner join t_pushup_user as u on (f.opponentid=u.userid) where f.userid=? order by fighttime desc';
        db.query(sql, [userid], function(err, rows){
            if(err){
                emitter.emit('fightRecords', JSON.stringify({'error':err}));
                console.log(err);
            }else{
                emitter.emit('fightRecords', JSON.stringify({'datas':rows}));
                console.log('fightRecords:',rows);
            }
        });
    }else{
        emitter.emit('verifyToken', JSON.stringify({'error':'token is expire', 'errno':401}));
        console.log('fightRecords',err);
    }
}

function checkBeFightRecords(data){
    var obj = JSON.parse(data);
    var userid = obj['userid'];
    var token = obj['token'];
    if(!userid || !token){
        return {'error':'error args'};
    }
    return obj;
}

function onBeFightRecords(data){
    var emitter = this;
    console.log('beFightRecords',data);
    var obj = checkRank(data);

    if(obj['error']){
        console.log('beFightRecords',err);
        emitter.emit('beFightRecords', JSON.stringify(obj));
        return;
    }
    var userid = obj['userid'];
    var token = obj['token'];

    if(verifyToken(userid,token)){
        sql = 'select f.*,u.username from t_pushup_fight as f inner join t_pushup_user as u on (f.userid=u.userid) where f.opponentid=? order by fighttime desc';
        db.query(sql, [userid], function(err, rows){
            if(err){
                emitter.emit('beFightRecords', JSON.stringify({'error':err}));
                console.log(err);
            }else{
                emitter.emit('beFightRecords', JSON.stringify({'datas':rows}));
                console.log('beFightRecords:',rows);
            }
        });
    }else{
        emitter.emit('verifyToken', JSON.stringify({'error':'token is expire', 'errno':401}));
        console.log('beFightRecords',err);
    }
}

function onLogout(data){

}

function onTestMessage(data){
    log.debug('onTestMessage:', data);
    console.log('onTestMessage:', data)
    this.emit('testMessage',JSON.stringify({name:'testMessage success'}));
}

module.exports = protocols;
