

var db = require('./DBPool.js');
var log = require('./log.js');
var parseData = require('./util.js').parseData;
var DateFormat = require('./util.js').DateFormat;
var util = require('./util.js');
var fs = require('fs');
var md5 = require('md5');
var async = require('async');

var global = require('./global.js');
var userSockets = global.userSockets;

var protocols = {
    'beat':onBeat,
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
    'record':onRecord,
    'bonus':onBonus,
    'receiveBonus':onReceiveBonus,
    'worldMessageHistory':onWorldMessageHistory,
    'worldMessage':onWorldMessage,
    'baseInfo':onBaseInfo,
};

var mailReg = /^\w+@\w+\.\w+$/;
var REGISTER_MAIL = 1;
var REGISTER_WEIXIN = 2;
var registerTypes = [REGISTER_MAIL, REGISTER_WEIXIN];

function checkRegister(obj){
    //var obj = JSON.parse(data);
    var username = obj['username'];
    var passwd = obj['passwd'];
    if(!username || !passwd){
        return {'error':'error args'};
    }
    return obj;
}

function onRegister(data){
    var obj = checkRegister(data);
    var username = obj['username'];
    var passwd = obj['passwd'];
    var registerFrom=0;
    if(obj['registerFrom'])
        registerFrom=obj['registerFrom'];
    log.trace('register', obj);
    var emitter = this;
    if(obj['error']){
        log.trace('register error', obj['error']);
        emit.call(emitter,'register', obj);
    }else{
        log.trace('register', 'register no error');
        db.query('select 1 from t_pushup_user where username= ?', [username], function(err, rows){
            if(err){
                emit.call(emitter,'register', {'error':err});
            }else if(rows.length!=0){
                emit.call(emitter,'register', {'error':'用户名已存在'});
            }else{
                log.trace('register mail insert');
                db.query('insert into t_pushup_user(username, passwd,registerFrom,registerTime) values (?,?,?,now())', [username,passwd,registerFrom], function(err, rows){
                    if(err){
                        emit.call(emitter,'register', {'error':err});
                    }else{
                        var userId = rows.insertId;
                        log.info('register userid:'+userId);
                        emit.call(emitter,'register', {'userid':userId,'username':username});
                    }
                });
            }
        });
                
    }
}

function onBeat(){
    var emitter = this;
    emit.call(emitter,'beat', {'msg':'ok'});
}


function checkLogin(obj){
    var username = obj['username'];
    var passwd = obj['passwd'];
    if(!username || !passwd){
        obj.error='error args';
    }
    return obj;
}

var emit=function(eventName,obj){
    obj.eventName=eventName;
    this.send(JSON.stringify(obj));
};

var USER_STATUS_ONLINE = 1;
var USER_STATUS_OFFLINE = 2;
var USER_STATUS_BUSY = 3;

function onVerifyToken(obj){
    checkVerifyToken(obj);

    var userid = obj['userid'];
    var token = obj['token'];
    var emitter = this;

    emitter.send('args is ok');
    if(obj['error']){
        log.info('verifyToken',obj['error']);
        emit.call(emitter,'verifyToken', obj);
    }else{
        if(verifyToken(userid,token)){
            log.info('verifyToken success');
            //token有效
            sql = 'select * from t_pushup_user where userid=?';
            db.query(sql,[userid],function(err, rows){
                if(err){
                    emit.call(emitter,'verifyToken', {'error':err});
                }else{
                    var responseObj = rows[0];
                    var userid = responseObj.userid;
                    delete responseObj.passwd;

                    emitter.userid = userid;
                    log.info('onVerifyToken', typeof(userid));
                    userSockets[userid]=emitter;

                    emit.call(emitter,'verifyToken', responseObj);
                }
            });
        }else{
            //需要登录
            log.info('verifyToken expire');
            emit.call(emitter,'verifyToken', {'error':'token is expire', 'errno':401});
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

function checkVerifyToken(obj){
    var userid = obj['userid'];
    var token = obj['token'];
    if(!userid || !token){
        obj['error']='error argument';
    }
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

function onLogin(obj){
    var emitter = this;
    var obj = checkLogin(obj);
    var username = obj['username'];
    var passwd = obj['passwd'];
    if(obj['error']){
        emit.call(emitter,'login', obj);
        log.info('login error',obj);
    }else{
        db.query('select * from t_pushup_user where username=? and passwd=?', [username, passwd], function(err, rows){
            if(err){
                emit.call(emitter,'login', {'error':err});
                log.info('login error',err);
            }else{
                if(rows.length == 0){
                    emit.call(emitter,'login', {'error':'用户名不存在或密码错误'});
                    log.info('login error username or passwd');
                }else{
                    var responseObj = rows[0];
                    delete responseObj.passwd;
                    var userid = responseObj.userid;
                    token = generateToken(userid);
                    //tokens存储在内存中
                    tokens[userid] = token;
                    log.info('login success');
                    responseObj['token']=token;

                    emitter.userid = userid;
                    log.info('onLogin', typeof(userid));
                    userSockets[userid]=emitter;

                    emit.call(emitter,'login', responseObj);
                    log.info('login ok');

                    
                }
            }        
        });
    }
}

function checkSearchOpponent(obj){
    //var obj = JSON.parse(data);
    var userid = obj['userid'];
    var token = obj['token'];
    if(!userid || !token){
        return {'error':'error args'};
    }
    return obj;
}


function queryUserValue(userid,callback){
    sql = 'select * from t_pushup_user where userid=?'
    db.query(sql, [userid], function(err, rows){
        if(err){
            callback({'errno':-1,'error':err.msg});
        }else{
            if(rows.length==1){
                myvalue = rows[0]['value'];
                if(myvalue==0)
                    myvalue=1
                callback(undefined,myvalue);
            }else{
                callback({'errno':-1,'error':'user is not exist'});
            }
        }
    });
}

function getOpponentByValue(userid,minValue,maxValue,callback){
    opponentSql = 'select * from t_pushup_user where value>? and value<=? and userid!=? order by rand() limit 1';
    db.query(opponentSql, [minValue,maxValue,userid], function(err, rows){
        if(err){
            callback({'errno':-1,'error':err});
            return;    
        }else{
            callback(undefined,rows);
        }
    });
}

function sendOpponentRecord(emitter,opponentId,opponentName,callback){

    recordSql = 'select * from t_pushup_record where userid=? and record!="[]" order by sporttime desc limit 10'
    db.query(recordSql, [opponentId], function(err, rows){
        if(err){
            emit.call(emitter,'searchOpponent', {'error':err});
            log.info('not equal opponent error:',err);
        }else{
            size = rows.length;
            
            //随机一场
            index = Math.floor(Math.random()*size);
            
            log.info('not equal opponent data size:',size,',index:',index);
            recordData = rows[index];
            records='';
            try{
                records=JSON.parse(recordData['record']);
            }catch(e){
                log.info('sendOpponentRecord error:',e, opponentId,index);
                emit.call(emitter,'searchOpponent', {'error':e});
                return;
            }
            responseData = {
                id:recordData['id'],
                userid:opponentId,
                username:opponentName,
                records:records,
                sporttime:recordData['sporttime'],
            };
            log.info('not equal opponent responseData,',responseData);
            emit.call(emitter,'searchOpponent', responseData);
            //reduceHp(userid,1);
        }
    });
}

function onSearchOpponent(data){
    var emitter = this;
    var obj = checkSearchOpponent(data);
    if(obj['error']){
        emit.call(emitter,'searchOpponent', obj);
        return;
    }
    var userid = obj.userid;
    var token = obj.token;
    var versionCode = obj.versionCode;
    if(verifyToken(userid,token)){
        //token有效
        canReduceHp(userid,1,versionCode,function(err,canReduce){
            log.info('canReduce callback');
            if(err){
                emit.call(emitter,'searchOpponent', {'error':err});
                return; 
            }
            if(canReduce==false){
                emit.call(emitter,'searchOpponent', {'errno':100,'error':'体力值不够'});
                return;
            }
            //查找自己的实力
            queryUserValue(userid,function(err,myvalue){
                if(err){
                    emit.call(emitter,'searchOpponent', {'error':err});
                    return;
                }
                maxValue = myvalue*1.2;
                minValue = myvalue*0.8;
                log.info('myvalue:',myvalue);

                //查找实力相当的对手
                getOpponentByValue(userid,minValue,maxValue,function(err,rows){
                    if(err){
                        emit.call(emitter,'searchOpponent', {'error':err});
                        log.info(err);
                        return;    
                    }
                    log.info('equal opponent',rows.length);
                    //没有实力相当的选手,查找有实力(即有记录)的选手不需要实力相当
                    if(rows.length==0){
                        getOpponentByValue(userid,0,100,function(err,rows){
                            if(err){
                                emit.call(emitter,'searchOpponent', {'error':err});
                                log.info(err);
                                return;    
                            }
                            //服务器是根本没有运动记录
                            if(rows.length==0){
                                log.info('no equal opponent');
                                //伪造一个机器人
                                records = [];
                                times = 20+Math.floor(Math.random()*3);
                                for(var i=0;i<times;i++){
                                    var positive = Math.random()<0.5?1:-1;
                                    records.push(1*(1+0.2*positive));
                                }
                                log.info(records);
                                responseData = {
                                    id:-1,
                                    username:'扫地生',
                                    userid:-1,
                                    records:records,
                                    sporttime:new Date(),
                                };
                                log.info(responseData);
                                emit.call(emitter,'searchOpponent', responseData);
                                reduceHp(userid,1);
                            }else{
                                opponentData = rows[0];
                                log.info('opponent value:',opponentData['value']);
                                log.info(opponentData);
                                var opponentId = opponentData['userid'];
                                var opponentName = opponentData['username'];
                                sendOpponentRecord(emitter,opponentId,opponentName);
                                reduceHp(userid,1);
                            }
                        });
                    }else{
                        opponentData = rows[0];
                        var opponentId = opponentData['userid'];
                        var opponentName = opponentData['username'];
                        sendOpponentRecord(emitter,opponentId,opponentName);
                        reduceHp(userid,1);
                    }
                });
            });
        });
    }else{
        //需要登录
        log.info('verifyToken expire');
        emit.call(emitter,'verifyToken', {'error':'token is expire', 'errno':401});
    }
}

function canReduceHp(userid,hpsize,versionCode,callback){
    log.info('canReduceHp',hpsize,versionCode);
    //低版本没有versionCode字段的
    if(!versionCode)
        callback(undefined,true);
    sql = 'select remainhp,hp from t_pushup_user where userid=?';
    db.query(sql, [userid], function(err,rows){
        log.info(rows);
        if(err){
            log.info(err);
            callback({errno:-1,error:err.msg});
        }else{
            if(rows.length==1){
                var data = rows[0];
                var remainhp = data['remainhp'];
                var canReduce=false;
                if(remainhp>=hpsize)
                    canReduce=true; 
                callback(undefined,canReduce);
            }else{
                callback({errno:-1,error:'user is not exist'});
            }
        }
    });
}

function reduceHp(userid,hpsize){
    sql = 'update t_pushup_user set remainhp=remainhp-? where userid=?'
    db.query(sql, [hpsize,userid], function(err){
        if(err){
            log.info('reduceHp error:', err);
        }
    });
}

function handoutEveryDayBonus(emitter,userid,username,bonusid){
    log.info('handoutEveryDayBonus',userid);
    sql = 'select * from t_pushup_bonus_record where userid=? and bonusid=? and receivetime>=?';
    db.query(sql,[userid,bonusid,util.dayOfBegin(new Date())],function(err, rows){
        if(err){
            log.info('handoutEveryDayBonus',err);
        }else{
            if(rows.length==0){
                handoutBonus(emitter,userid,bonusid);
                var now = new Date();
                var worldMsg = {
                    msg:"恭喜"+username+"完成了今日任务",
                    userid:userid,
                    type:3,
                    isshow:1,
                    showtimes:-1, 
                    addtime:now, 
                    stime:now, 
                    etime:util.dayOfEnd(now), 
                };
                sendWorldMessage(worldMsg);
            }
        }
    });
}

function handoutBonus(emitter,userid,bonusid){
    sql = 'insert into t_pushup_bonus_record (userid,bonusid,receivetime) values (?,?,now())'; 
    db.query(sql,[userid,bonusid],function(err, rows){
        if(err){
            log.info('handoutBonus', err); 
        }else{
            var bonusRecordId = rows.insertId;
            sql = 'select r.id,b.id as bonusid,b.name as bonusname,b.reason,g.name as goodname,b.num from t_pushup_bonus_record as r inner join t_pushup_bonus as b on (r.bonusid=b.id) inner join t_pushup_goods as g on(b.goodid=g.id) where r.userid=? and r.status=0 and r.id=?' 
            db.query(sql,[userid,bonusRecordId],function(err, rows){
                if(err){
                    log.info('handoutBonus', err); 
                }else{
                    var datas = {};
                    var size = rows.length;
                    for(var i=0;i<size;i++){
                        data = rows[i];
                        var bonusRecordId = data.id;
                        if(!(bonusRecordId in datas)) 
                            datas[bonusRecordId]={
                                bonusname:data.bonusname,
                                bonusid:data.bonusid,
                                reason:data.reason,
                                items:[],
                            };
                        var bonusData = datas[bonusRecordId]
                        bonusData.items.push({
                            goodname:data.goodname, 
                            num:data.num,
                        });
                    }
                    log.info('handoutBonus',JSON.stringify(datas));
                    emit.call(emitter,'bonus', datas);
                }
            });
        }
    });
}


function getBonusContent(userid,bonusRecordId,callback){
    log.info('getBonusContent',userid,bonusRecordId);
    sql = 'select r.id,b.id as bonusid,b.name as bonusname,b.reason,g.name as goodname,b.num from t_pushup_bonus_record as r inner join t_pushup_bonus as b on (r.bonusid=b.id) inner join t_pushup_goods as g on(b.goodid=g.id) where r.userid=? and r.id=?' 
    db.query(sql,[userid,bonusRecordId],function(err, rows){
        if(err){
            log.info(err);
            if(callback!==undefined)
                callback(err,undefined);
        }else{
            var bonusData = {};
            var size = rows.length;
            for(var i=0;i<size;i++){
                var data = rows[i];
                if(bonusData.bonusid===undefined){
                    bonusData.bonusname=data.bonusname;
                    bonusData.bonusid=data.bonusid;
                    bonusData.reason=data.reason;
                    bonusData.items=[];
                }
                bonusData.items.push({
                    goodname:data.goodname, 
                    num:data.num,
                });
            }
            log.info(bonusData)
            if(callback!==undefined)
                callback(undefined,bonusData);
        }
    });
}


function checkUploadRecord(obj){
    //var obj = JSON.parse(data);
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
    var obj = checkUploadRecord(data);
    if(obj['error']){
        emit.call(emitter,'uploadRecord', obj);
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
        //token有效
        //*
        sql = 'insert into t_pushup_record (userid,record,costtime,sporttime)values(?,?,?,?)'
        db.query(sql, [userid,JSON.stringify(records),20,new Date()], function(err, rows){
            if(err){
                emit.call(emitter,'uploadRecord', {'error':err});
                log.info(err);
                return;
            }else{
                var id = rows.insertId;
                sql = 'insert into t_pushup_fight (userid,opponentid,urecordid,orecordid,uscore,oscore)values(?,?,?,?,?,?)';
                db.query(sql,[userid,opponentId,id,oRecordId,mRecordSize,oRecordSize],function(err, rows){
                    if(err){
                        emit.call(emitter,'uploadRecord', {'error':err});
                        log.info(err);
                        return;
                    }else{
                        log.info('uploadRecord insert');
                        //计算用户的平均值
                        sql = 'select `value`,maxwin,bestrecord from t_pushup_user where userid=?';
                        db.query(sql,[userid],function(err, rows){
                            if(err){
                                emit.call(emitter,'uploadRecord', {'error':err});
                                return;
                            }else{
                                if(rows.length>0){
                                    var row = rows[0];
                                    var oldValue = row['value'];
                                    var oldMaxwin = row['maxwin'];
                                    var bestrecord = row['bestrecord'];

                                    var currentValue = 0;
                                    var recordSize = records.length;
                                    for(var i=0;i<recordSize;i++){
                                        currentValue+=records[i]; 
                                    }
                                    log.info('times:',currentValue);
                                    //单位: 个/秒
                                    currentValue=recordSize/currentValue;
                                    log.info('speed:',currentValue);
                                    //耐力值: 总个数/标准个数
                                    endurance=recordSize/20;
                                    log.info('endurance:',endurance);
                                    //能力值=速度*耐力值
                                    currentValue*=endurance

                                    log.info('currentValue:',currentValue,'oldValue:',oldValue);
                                    if(oldValue!=0){
                                        currentValue = (oldValue+currentValue)/2;
                                    }
                                    if(recordSize>bestrecord)

                                    winSql = 'update t_pushup_user set value=?,total=total+?,todayamount=todayamount+?,win=win+1,maxwin=maxwin+1,lastfighttime=now() where userid=?';
                                    drawSql = 'update t_pushup_user set value=?,total=total+?,todayamount=todayamount+?,draw=draw+1,maxwin=0,lastfighttime=now() where userid=?';
                                    lostSql = 'update t_pushup_user set value=?,total=total+?,todayamount=todayamount+?,lost=lost+1,maxwin=0,lastfighttime=now() where userid=?';
                                    //3:胜,2:平,1:负
                                    var pkResult=0;
                                    if(mRecordSize>oRecordSize){
                                        sql = winSql;
                                        pkResult=3;
                                    }else if(mRecordSize<oRecordSize){
                                        sql = lostSql;
                                        pkResult=1;
                                    }else{
                                        sql = drawSql;
                                        pkResult=2;
                                    }

                                    db.query(sql,[currentValue,mRecordSize,mRecordSize,userid],function(err, rows){
                                        if(err){
                                            emit.call(emitter,'uploadRecord', {'error':err});
                                            log.info('uploadRecord',err);
                                            return;
                                        }else{
                                            log.info('uploadRecord udpate user');
                                            sql = 'select * from t_pushup_user where userid=?';
                                            db.query(sql,[userid],function(err, rows){
                                                if(err){
                                                    log.info(err);
                                                    emit.call(emitter,'uploadRecord', {'error':err});
                                                }else{
                                                    var responseData = rows[0];
                                                    delete responseData.passwd;
                                                    var username = responseData.username;
                                                    var userid = responseData.userid;
                                                    var maxwin = responseData.maxwin;

                                                    if(recordSize>bestrecord)
                                                        updatePersonalNewRecord(userid,username,recordSize,bestrecord)

                                                    //判断是否发放每日任务奖励
                                                    log.info('todayamount:',responseData['todayamount']);
                                                    log.info('todaytask:',responseData['todaytask']);
                                                    if(responseData['todayamount']>=responseData['todaytask']){
                                                        handoutEveryDayBonus(emitter,userid,username,1);
                                                    }
                                                    log.info('pkResult:',pkResult);
                                                    
                                                    if(pkResult==3){
                                                        handoutBonus(emitter,userid,2);
                                                    }

                                                    getUserInfo(db,opponentId,function(err,rows){
                                                        if(err){
                                                            log.info('getUserInfo',err);
                                                            emit.call(emitter,'uploadRecord', {'error':err});
                                                        }else{
                                                            var opponentData = rows[0];
                                                            var opponentName = opponentData['username'];
                                                            var msg = '';
                                                            var type = 0;
                                                            if(pkResult==3){
                                                                msg = getWinBroadcastMsg(maxwin,username,opponentName,mRecordSize,oRecordSize);
                                                                type=4;
                                                            }else if(maxwin>=3){
                                                                msg = username+oldMaxwin+'连杀后,'+'被'+opponentName+oRecordSize+':'+mRecordSize+'终结'; 
                                                                type=6
                                                            }else{
                                                                return;
                                                            }
                                                            var now = new Date();
                                                            var worldMsg = {
                                                                msg:msg,
                                                                userid:userid,
                                                                type:type,
                                                                isshow:1,
                                                                showtimes:-1,
                                                                addtime:now,
                                                                stime:now,
                                                                etime:util.dayOfEnd(now),
                                                            };
                                                            sendWorldMessage(worldMsg);
                                                        }
                                                    });

                                                    getEncourageMsg(db,mRecordSize,oRecordSize,function(err,rows){
                                                        if(err){
                                                            log.info('getEncourageMsg',err);
                                                            emit.call(emitter,'uploadRecord', {'error':err});
                                                        }else{
                                                            var msg = '';
                                                            if(rows.length>0)
                                                                msg = rows[0].msg
                                                            responseData.encourageMsg = msg;
                                                            emit.call(emitter,'uploadRecord', responseData);
                                                            log.info('uploadRecord handoutBonus');
                                                        }
                                                    });
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
        log.info('verifyToken expire');
        emit.call(emitter,'verifyToken', {'error':'token is expire', 'errno':401});
    }
}


//获取没有领取的奖励id
function onBonus(data){
    var emitter = this;
    var obj = checkBaseRequestInfo(data);

    if(obj['error']){
        log.info('onBonus',obj['error']);
        emit.call(emitter,'onBonus', obj);
        return;
    }
    var userid = obj['userid'];
    var token = obj['token'];

    if(verifyToken(userid,token)){
        sql = 'select r.id,b.id as bonusid,b.name as bonusname,b.reason,g.name as goodname,b.num from t_pushup_bonus_record as r inner join t_pushup_bonus as b on (r.bonusid=b.id) inner join t_pushup_goods as g on(b.goodid=g.id) where r.userid=? and r.status=0' 
        db.query(sql,[userid],function(err, rows){
            if(err){
                log.info('onBonus error',err);  
            }else{
                var datas = {};
                var size = rows.length;
                for(var i=0;i<size;i++){
                    data = rows[i];
                    var bonusRecordId = data.id;
                    var bonusName = data.bonusName;
                    if(!(bonusRecordId in datas)) 
                        datas[bonusRecordId]={
                            bonusname:data.bonusname,
                            bonusid:data.bonusid,
                            reason:data.reason,
                            items:[],
                        };
                    var bonusData = datas[bonusRecordId]
                    bonusData.items.push({
                        goodname:data.goodname, 
                        num:data.num,
                    });
                }
                emit.call(emitter,'bonus', {'datas':datas});
            }
        });
    }else{
    
    }
}

function checkReceiveBonus(obj){
    //var obj = JSON.parse(data);
    var userid = obj['userid'];
    var token = obj['token'];
    var bonusRecordId = obj['bonusRecordId'];
    if(!userid || !token || !bonusRecordId){
        return {'error':'error args'};
    }
    return obj;
}

//领取奖励
function onReceiveBonus(data){
    var emitter=this;
    var obj = checkReceiveBonus(data);
    if(obj['error']){
        log.info('onReceiveBonus',obj['error']);
        emit.call(emitter,'receiveBonus', obj);
        return;
    }
    var userid = obj['userid'];
    var token = obj['token'];
    var bonusRecordId = obj['bonusRecordId'];

    if(verifyToken(userid,token)){
        log.info('verifyToken ok', bonusRecordId);
        sql = 'update t_pushup_bonus_record set status=1,receivetime=now() where id=?'
        db.query(sql,[bonusRecordId],function(err, rows){
            if(err){
                log.info(err);
                emit.call(emitter,'receiveBonus', {error:err});
            }else{
                //todo 根据bonusid发放奖励物品
                getBonusContent(userid,bonusRecordId,function(err,bonus){
                    log.info('getBonusContent callback',bonus);
                    if(err){
                        emit.call(emitter,'receiveBonus', {error:err});
                    }else{
                        var addHp = bonus.items[0].num;
                        log.info('getBonusContent callback', addHp);
                        sql = 'update t_pushup_user set remainhp=remainhp+? where userid=?'
                        db.query(sql,[addHp,userid],function(err, rows){
                            if(err){
                                log.info(err);
                                emit.call(emitter,'receiveBonus', {error:err});
                            }else{
                                log.info('receiveBonus over');
                                emit.call(emitter,'receiveBonus', {'bonusRecordId':bonusRecordId});
                            }
                        });
                    }
                });
                
            }
        });
        

    }else{
        log.info('verifyToken expire');
        emit.call(emitter,'verifyToken', {'error':'token is expire', 'errno':401});
    }
    
}

function checkBaseRequestInfo(obj){
    //var obj = JSON.parse(data);
    var userid = obj['userid'];
    var token = obj['token'];
    if(!userid || !token){
        return {'error':'error args'};
    }
    return obj;
}

function onRank(data){
    var emitter = this;
    var obj = checkBaseRequestInfo(data);

    if(obj['error']){
        log.info('rank',obj['error']);
        emit.call(emitter,'rank', obj);
        return;
    }
    var userid = obj['userid'];
    var token = obj['token'];

    if(verifyToken(userid,token)){
        sql = 'select userid,username,total,win,draw,lost,value from t_pushup_user where total>0 order by total desc,win desc,lost,draw,userid';
        log.info('verifyToken success');
        db.query(sql, [], function(err, rows){
            if(err){
                emit.call(emitter,'rank', {'error':err});
                log.info(err);
            }else{
                emit.call(emitter,'rank', {'rank':rows});
                log.info('rank:',rows);
            }
        });
    }else{
        log.info('verifyToken expire');
        emit.call(emitter,'verifyToken', {'error':'token is expire', 'errno':401});
    }
}

function checkFightRecords(obj){
    //var obj = JSON.parse(data);
    var userid = obj['userid'];
    var token = obj['token'];
    if(!userid || !token){
        return {'error':'error args'};
    }
    return obj;
}

function onFightRecords(data){
    var emitter = this;
    var obj = checkFightRecords(data);

    if(obj['error']){
        log.info('fightRecords',err);
        emit.call(emitter,'fightRecords', obj);
        return;
    }
    var userid = obj['userid'];
    var token = obj['token'];

    if(verifyToken(userid,token)){
        sql = 'select f.*,u.username from t_pushup_fight as f inner join t_pushup_user as u on (f.opponentid=u.userid) where f.userid=? order by fighttime desc';
        db.query(sql, [userid], function(err, rows){
            if(err){
                emit.call(emitter,'fightRecords', {'error':err});
                log.info(err);
            }else{
                log.info('fightRecords:'+rows.length);
                emit.call(emitter,'fightRecords', {'datas':rows});
            }
        });
    }else{
        log.info('verifyToken expire');
        emit.call(emitter,'verifyToken', {'error':'token is expire', 'errno':401});
    }
}

function checkBeFightRecords(obj){
    //var obj = JSON.parse(data);
    var userid = obj['userid'];
    var token = obj['token'];
    if(!userid || !token){
        return {'error':'error args'};
    }
    return obj;
}

function onBeFightRecords(data){
    var emitter = this;
    var obj = checkBaseRequestInfo(data);

    if(obj['error']){
        log.info('beFightRecords',err);
        emit.call(emitter,'beFightRecords', obj);
        return;
    }
    var userid = obj['userid'];
    var token = obj['token'];

    if(verifyToken(userid,token)){
        sql = 'select f.*,u.username from t_pushup_fight as f inner join t_pushup_user as u on (f.userid=u.userid) where f.opponentid=? order by fighttime desc';
        db.query(sql, [userid], function(err, rows){
            if(err){
                emit.call(emitter,'beFightRecords', {'error':err});
                log.info(err);
            }else{
                log.info('beFightRecords:'+rows.length);
                emit.call(emitter,'beFightRecords', {'datas':rows});
            }
        });
    }else{
        log.info('verifyToken expire');
        emit.call(emitter,'verifyToken', {'error':'token is expire', 'errno':401});
    }
}

function checkRecords(obj){
    //var obj = JSON.parse(data);
    var userid = obj['userid'];
    var recordid= obj['recordid'];
    if(!userid || !recordid){
        return {'error':'error args'};
    }
    return obj;
}

function onRecord(data){
    var emitter = this;
    var obj = checkRecords(data);

    if(obj['error']){
        log.info('record',err);
        emit.call(emitter,'record', obj);
        return;
    }
    var userid = obj['userid'];
    var recordid = obj['recordid'];

    sql = 'select f.*,u.username from t_pushup_record as f inner join t_pushup_user as u on (f.userid=u.userid) where f.userid=? and id=?';
    db.query(sql, [userid,recordid], function(err, rows){
        if(err){
            emit.call(emitter,'record', {'error':err});
            log.info(err);
        }else{
            rows[0]['record']=JSON.parse(rows[0]['record']);
            emit.call(emitter,'record', rows[0]);
            log.info('record:',rows);

            
        }
    });
    
}

function onLogout(data){

}

function onTestMessage(data){
    this.emit('testMessage',JSON.stringify({name:'testMessage success'}));
}

function checkWorldMessge(){

}
function onWorldMessageHistory(data){
    var emitter = this;
    checkWorldMessge(data);

    if(data['error']){
        log.info('rank',data['error']);
        emit.call(emitter,'worldMessageHistory', data);
        return;
    }
    var userid = data['userid'];
    var token = data['token'];

    if(verifyToken(userid,token)){
        log.info('verifyToken success');
        async.parallel(
            [
                //公告
                function(cb){
                    sql = 'select * from t_pushup_world_broadcast where etime>now() and type in (1,2) order by addtime desc';
                    db.query(sql, [], function(err, rows){
                        cb(err,rows);
                    });
                
                },
                //用户广播
                function(cb){
                    sql = 'select * from (select * from t_pushup_world_broadcast where etime>now() and type not in (1,2) order by addtime desc) as a group by userid,type';
                    db.query(sql, [], function(err, rows){
                        cb(err,rows);
                    });
                
                },
            ],
            function(err, results){
                if(err){
                    emit.call(emitter,'worldMessageHistory', {'error':err});
                    log.info(err);
                }else{
                    var rows = results[0].concat(results[1]);
                    //log.info(err,rows);
                    //log.info('worldMessageHistory',typeof(rows[0].etime),rows[0].etime);
                    emit.call(emitter,'worldMessageHistory', {msgs:rows});
                }
            } 
        );
    }else{
        log.info('verifyToken expire');
        emit.call(emitter,'verifyToken', {'error':'token is expire', 'errno':401});
    }
}

function onWorldMessage(data){

}

function sendWorldMessage(msg){
    log.info('sendWorldMessage',msg.userid,msg.msg);
    //入库
    insertTable(db,'t_pushup_world_broadcast',msg);

    for(var userid in userSockets){
        var emiter = userSockets[userid];
        emit.call(emiter,'worldMessage', {msg:msg});
    }
}

function insertTable(dbInstance,tableName,datas,cb){
    var sql = 'insert into '+tableName+'(';
    var keys = [];
    var wenhaos = [];
    var values = [];
    for(var key in datas){
        keys.push(key);  
        wenhaos.push('?');
        values.push(datas[key]);
    }
    sql+=keys.join(',')+')values('+wenhaos.join(',')+')';
    
    dbInstance.query(sql,values,cb); 
}

function getUserInfo(dbInstance,userid,cb){
    var sql = 'select username from t_pushup_user where userid=?';
    dbInstance.query(sql,[userid],cb); 
}

function getWinBroadcastMsg(maxwin,username,opponentName,uscore,oscore){
    var msg=username+' '+uscore+':'+oscore+'干掉了'+opponentName+',';
    switch(maxwin){
        case 1:
            msg+='拿下了第一滴血';
            break;
        case 2:
            msg+="完成了双杀";
            break;
        case 3:
            msg+="完成了三杀";
            break;
        case 4:
            msg+="完成了四杀";
            break;
        case 5:
            msg+="完成了五杀";
            break;
        case 6:
            msg+="大杀特杀";
            break;
        case 7:
            msg+="已经暴走";
            break;
        case 8:
            msg+="无人能挡";
            break;
        case 9:
            msg+="主宰了比赛";
            break;
        case 10:
            msg+="接近超神";
            break;
        case 11:
            msg+="已经超神";
            break;
        case 12:
            msg+="成为了终结者";
            break;
        default:
            msg+="成为了终结者";
            break;
    }
    return msg;
}

function getEncourageMsg(dbInstance,myScore,opponentScore,cb){
    var delta = myScore-opponentScore; 
    var type=0;
    if(delta>=10)
        //完胜
        type=2
    else if(delta>0){
        //胜
        type=1;
    }else if(delta===0){
        //平
        type=0;
    }else if(delta>=-10){
        //败
        type=-1;
    }else if(delta<-10){
        //惨败
        type=-2;
    }
    var sql = 'select msg from t_pushup_encourage where type=? order by rand() limit 1';
    dbInstance.query(sql,[type],cb);
}

function updatePersonalNewRecord(userid,username,bestrecord,oldRecord){
    sql = 'update t_pushup_user set bestrecord=? where userid=?';
    db.query(sql,[bestrecord,userid],function(err,rows){
        if(err){
            log.error('updatePersonalNewRecord',err); 
        }else{
            if(oldRecord>0)
                broadcastNewRecord(userid,username,bestrecord,oldRecord);  
        }
    });
}

function broadcastNewRecord(userid,username,bestrecord,oldRecord){
    var now = new Date();
    var msg = username+'再次突破自己30秒最好记录:'+bestrecord+'个,原记录:'+oldRecord;
    var worldMsg = {
        msg:msg,
        userid:userid,
        type:5,
        isshow:1,
        showtimes:-1,
        addtime:now,
        stime:now,
        etime:util.timedelta(now,{days:2}),
    };
    sendWorldMessage(worldMsg);
}

function onBaseInfo(data){
    var emitter = this;
    var userid = data.userid;
    var token = data.token;
    var os = data.os;
    var isBrowser=data.isBrowser;
    var isMobile=data.isMobile;
    var isNative=data.isNative;
    var platform=data.platform;
    var browserType=data.browserType;
    var browserVersion=data.browserVersion;
    var comefrom=data.comefrom;
    var versionCode=0;
    if(data.versionCode)
        versionCode=data.versionCode;
    if(data['error']){
        emit.call(emitter,'baseInfo', data);
    }else{
        var values=[os,comefrom,isNative,browserType,versionCode,userid];
        db.query('update t_pushup_user set os=?,comefrom=?,isNative=?,browserType=?,versionCode=? where userid=?',values, function(err, rows){
            if(err){
                emit.call(emitter,'baseInfo', {'error':err});
            }else{
                log.info('baseInfo',values);
            }
        });
    }
}

module.exports = protocols;
