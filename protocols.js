

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
    'record':onRecord,
    'bonus':onBonus,
    'receiveBonus':onReceiveBonus,
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
                    var responseObj = rows[0];
                    /*
                    var responseObj = {
                        userid:userid,
                        total:data['total'],
                        win:data['win'],
                        lost:data['lost'],
                        draw:data['draw'],
                        value:data['value'],
                        hp:data['hp'],
                        remainhp:data['remainhp'],
                        todaytask:data['todaytask'],
                        todayamount:data['todayamount'],
                        level:data['level'],
                        star:data['star'],
                    };
                    */
                    delete responseObj.passwd;
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
                    var responseObj = rows[0];
                    delete responseObj.passwd;
                    var userid = responseObj.userid;
                    token = generateToken(userid);
                    //tokens存储在内存中
                    tokens[userid] = token;
                    console.log('login success');
                    responseObj['token']=token;

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


function queryUserValue(userid,callback){
    sql = 'select * from t_pushup_user where userid=?'
    console.log('userid type:',userid,typeof(userid));
    db.query(sql, [userid], function(err, rows){
        if(err){
            callback({'errno':-1,'error':err.msg});
        }else{
            console.log(rows);
            console.log(rows.length);
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
            reduceHp(userid,1);
        }
    });
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
    var userid = obj.userid;
    var token = obj.token;
    var versionCode = obj.versionCode;
    if(verifyToken(userid,token)){
        //token有效
        canReduceHp(userid,1,versionCode,function(err,canReduce){
            console.log('canReduce callback');
            if(err){
                emitter.emit('searchOpponent', JSON.stringify({'error':err}));
                return; 
            }
            if(canReduce==false){
                emitter.emit('searchOpponent', JSON.stringify({'errno':100,'error':'体力值不够'}));
                return;
            }
            //查找自己的实力
            queryUserValue(userid,function(err,myvalue){
                if(err){
                    emitter.emit('searchOpponent', JSON.stringify({'error':err}));
                    return;
                }
                maxValue = myvalue*1.2;
                minValue = myvalue*0.8;
                console.log('myvalue:',myvalue);

                //查找实力相当的对手
                getOpponentByValue(userid,minValue,maxValue,function(err,rows){
                    if(err){
                        emitter.emit('searchOpponent', JSON.stringify({'error':err}));
                        console.log(err);
                        return;    
                    }
                    console.log('equal opponent',rows.length);
                    //没有实力相当的选手,查找有实力(即有记录)的选手不需要实力相当
                    if(rows.length==0){
                        getOpponentByValue(userid,0,100,function(err,rows){
                            if(err){
                                emitter.emit('searchOpponent', JSON.stringify({'error':err}));
                                console.log(err);
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
                                reduceHp(userid,1);
                            }else{
                                opponentData = rows[0];
                                console.log('opponent value:',opponentData['value']);
                                console.log(opponentData);
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
        emitter.emit('verifyToken', JSON.stringify({'error':'token is expire', 'errno':401}));
    }
}

function canReduceHp(userid,hpsize,versionCode,callback){
    console.log('canReduceHp',hpsize,versionCode);
    //低版本没有versionCode字段的
    if(!versionCode)
        callback(undefined,true);
    sql = 'select remainhp,hp from t_pushup_user where userid=?';
    db.query(sql, [userid], function(err,rows){
        console.log(rows);
        if(err){
            console.log(err);
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
            console.log('reduceHp error:', err);
        }
    });
}

function handoutEveryDayBonus(emitter,userid,bonusid){
    sql = 'select * from t_pushup_bonus_record where userid=? and bonusid=? order by receivetime desc limit 1';
    db.query(sql,[userid,bonusid],function(err, rows){
        if(err){
            console.log('handoutEveryDayBonus',err);
        }else{
            var data = rows[0];
            var receivetime = data['receivetime'];
            var now = new Date();
            if(receivetime.getYear()!==now.getYear() || receivetime.getMonth()!==now.getMonth() || receivetime.getDate()!==now.getDate()){
                handoutBonus(emitter,userid,bonusid);
            }
        }
    });
}

function handoutBonus(emitter,userid,bonusid){
    sql = 'insert into t_pushup_bonus_record (userid,bonusid,receivetime) values (?,?,now())'; 
    db.query(sql,[userid,bonusid],function(err, rows){
        if(err){
            console.log('handoutBonus', err); 
        }else{
            var bonusRecordId = rows.insertId;
            sql = 'select r.id,b.id as bonusid,b.name as bonusname,b.reason,g.name as goodname,b.num from t_pushup_bonus_record as r inner join t_pushup_bonus as b on (r.bonusid=b.id) inner join t_pushup_goods as g on(b.goodid=g.id) where r.userid=? and r.status=0 and r.id=?' 
            db.query(sql,[userid,bonusRecordId],function(err, rows){
                if(err){
                    console.log('handoutBonus', err); 
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
                    console.log('handoutBonus',JSON.stringify(datas));
                    emitter.emit('bonus', JSON.stringify(datas));
                }
            });
        }
    });
}


function getBonusContent(userid,bonusRecordId,callback){
    console.log('getBonusContent',userid,bonusRecordId);
    sql = 'select r.id,b.id as bonusid,b.name as bonusname,b.reason,g.name as goodname,b.num from t_pushup_bonus_record as r inner join t_pushup_bonus as b on (r.bonusid=b.id) inner join t_pushup_goods as g on(b.goodid=g.id) where r.userid=? and r.id=?' 
    db.query(sql,[userid,bonusRecordId],function(err, rows){
        if(err){
            console.log(err);
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
            console.log(bonusData)
            if(callback!==undefined)
                callback(undefined,bonusData);
        }
    });
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

                                    winSql = 'update t_pushup_user set value=?,total=total+?,todayamount=todayamount+?,win=win+1 where userid=?';
                                    drawSql = 'update t_pushup_user set value=?,total=total+?,todayamount=todayamount+?,draw=draw+1 where userid=?';
                                    lostSql = 'update t_pushup_user set value=?,total=total+?,todayamount=todayamount+?,lost=lost+1 where userid=?';
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
                                            emitter.emit('uploadRecord', JSON.stringify({'error':err}));
                                            console.log('uploadRecord',err);
                                            return;
                                        }else{
                                            sql = 'select * from t_pushup_user where userid=?';
                                            db.query(sql,[userid],function(err, rows){
                                                if(err){
                                                    console.log(err);
                                                    emitter.emit('uploadRecord', JSON.stringify({'error':err}));
                                                }else{
                                                    var responseData = rows[0];
                                                    delete responseData.passwd;
                                                    //判断是否发放每日任务奖励
                                                    console.log('todayamount:',responseData['todayamount']);
                                                    console.log('todaytask:',responseData['todaytask']);
                                                    if(responseData['todayamount']>=responseData['todaytask']){
                                                        (function(emitter,userid){
                                                            handoutEveryDayBonus(emitter,userid,1);
                                                        })(emitter,userid);
                                                    }

                                                    if(pkResult==3){
                                                        (function(emitter,userid){
                                                            handoutBonus(emitter,userid,2);
                                                        })(emitter,userid);
                                                    }
                                                    console.log('uploadRecord',responseData);
                                                    emitter.emit('uploadRecord', JSON.stringify(responseData));
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


//获取没有领取的奖励id
function onBonus(data){
    var emitter = this;
    console.log('onBonus',data);
    var obj = checkBaseRequestInfo(data);

    if(obj['error']){
        console.log('onBonus',obj['error']);
        emitter.emit('onBonus', JSON.stringify(obj));
        return;
    }
    var userid = obj['userid'];
    var token = obj['token'];

    if(verifyToken(userid,token)){
        sql = 'select r.id,b.id as bonusid,b.name as bonusname,b.reason,g.name as goodname,b.num from t_pushup_bonus_record as r inner join t_pushup_bonus as b on (r.bonusid=b.id) inner join t_pushup_goods as g on(b.goodid=g.id) where r.userid=? and r.status=0' 
        db.query(sql,[userid],function(err, rows){
            if(err){
                console.log('onBonus error',err);  
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
                emitter.emit('bonus', JSON.stringify(datas));
            }
        });
    }else{
    
    }
}

function checkReceiveBonus(data){
    var obj = JSON.parse(data);
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
    console.log('receiveBonus',data);
    var emitter=this;
    var obj = checkReceiveBonus(data);
    if(obj['error']){
        console.log('onReceiveBonus',obj['error']);
        emitter.emit('receiveBonus', JSON.stringify(obj));
        return;
    }
    var userid = obj['userid'];
    var token = obj['token'];
    var bonusRecordId = obj['bonusRecordId'];

    if(verifyToken(userid,token)){
        console.log('verifyToken ok', bonusRecordId);
        sql = 'update t_pushup_bonus_record set status=1,receivetime=now() where id=?'
        db.query(sql,[bonusRecordId],function(err, rows){
            if(err){
                console.log(err);
                emitter.emit('receiveBonus', JSON.stringify({error:err}));
            }else{
                //todo 根据bonusid发放奖励物品
                getBonusContent(userid,bonusRecordId,function(err,bonus){
                    console.log('getBonusContent callback',bonus);
                    if(err){
                        emitter.emit('receiveBonus', JSON.stringify({error:err}));
                    }else{
                        var addHp = bonus.items[0].num;
                        console.log('getBonusContent callback', addHp);
                        sql = 'update t_pushup_user set remainhp=remainhp+? where userid=?'
                        db.query(sql,[addHp,userid],function(err, rows){
                            if(err){
                                console.log(err);
                                emitter.emit('receiveBonus', JSON.stringify({error:err}));
                            }else{
                                console.log('receiveBonus over');
                                emitter.emit('receiveBonus', JSON.stringify({'bonusRecordId':bonusRecordId}));
                            }
                        });
                    }
                });
                
            }
        });
        

    }else{
        emitter.emit('verifyToken', JSON.stringify({'error':'token is expire', 'errno':401}));
        console.log('rank',err);
    }
    
}

function checkBaseRequestInfo(data){
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
    console.log('onRank',data);
    var obj = checkBaseRequestInfo(data);

    if(obj['error']){
        console.log('rank',obj['error']);
        emitter.emit('rank', JSON.stringify(obj));
        return;
    }
    var userid = obj['userid'];
    var token = obj['token'];

    if(verifyToken(userid,token)){
        sql = 'select userid,username,total,win,draw,lost,value from t_pushup_user where total>0 order by total desc,win desc,lost,draw,userid';
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
    var obj = checkFightRecords(data);

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
    var obj = checkBaseRequestInfo(data);

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

function checkRecords(data){
    var obj = JSON.parse(data);
    var userid = obj['userid'];
    var recordid= obj['recordid'];
    if(!userid || !recordid){
        return {'error':'error args'};
    }
    return obj;
}

function onRecord(data){
    var emitter = this;
    console.log('record',data);
    var obj = checkRecords(data);

    if(obj['error']){
        console.log('record',err);
        emitter.emit('record', JSON.stringify(obj));
        return;
    }
    var userid = obj['userid'];
    var recordid = obj['recordid'];

    sql = 'select f.*,u.username from t_pushup_record as f inner join t_pushup_user as u on (f.userid=u.userid) where f.userid=? and id=?';
    db.query(sql, [userid,recordid], function(err, rows){
        if(err){
            emitter.emit('record', JSON.stringify({'error':err}));
            console.log(err);
        }else{
            rows[0]['record']=JSON.parse(rows[0]['record']);
            emitter.emit('record', JSON.stringify(rows[0]));
            console.log('record:',rows);
        }
    });
    
}

function onLogout(data){

}

function onTestMessage(data){
    log.debug('onTestMessage:', data);
    console.log('onTestMessage:', data)
    this.emit('testMessage',JSON.stringify({name:'testMessage success'}));
}

module.exports = protocols;
