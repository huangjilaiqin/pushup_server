
-- drop table t_pushup_user;
create table `t_pushup_user`(
    userid int not null auto_increment,
    username varchar(20),
    passwd varchar(50),
    win int not null default 0,
    draw int not null default 0,
    lost int not null default 0,
    total int not null default 0 comment '总个数',
    value float default 0 comment '个人能力评估值,俯卧撑的平均时长',
    hp int not null default 8,
    remainhp int not null default 8,
    todaytask int not null default 100,
    todayamount int not null default 0,
    level int not null default 1,
    star int not null default 0,
    lastfighttime timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    maxwin tinyint not null default 0 comment '几连赢',
    bestrecord int not null default 0 comment '个人最好成绩',
    os varchar(50) default '',
    comefrom tinyint default 0,
    isNative tinyint default 0,
    browserType varchar(50) default '',
    primary key (userid),
    index key1 (value),
    index key2 (total)
)
COLLATE='utf8_unicode_ci';

alter table t_pushup_user add column maxwin tinyint not null default 0;
alter table t_pushup_user add column bestrecord int not null default 0;
alter table t_pushup_user add column os varchar(50) default '';
alter table t_pushup_user add column comefrom tinyint default 0;
alter table t_pushup_user add column isNative tinyint default 0;
alter table t_pushup_user add column browserType varchar(50) default '';

-- drop table t_pushup_record;
create table `t_pushup_record`(
    id int not null auto_increment,
    userid int not null,
    record varchar(500),
    costtime int comment '本次运动的限制时长(秒)',
    sporttime datetime not null,
    primary key (id),
    index key1 (userid,sporttime)
)
COLLATE='utf8_unicode_ci';

-- 挑战表
-- drop table t_pushup_fight;
create table `t_pushup_fight`(
    userid int not null,
    opponentid int not null,
    urecordid int not null,
    uscore int not null,
    orecordid int not null,
    oscore int not null,
    fighttime timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    index key1 (userid),
    index key2 (opponentid)
)
COLLATE='utf8_unicode_ci';
alter table t_pushup_fight MODIFY fighttime timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- 物品表
-- drop table t_pushup_goods;
create table `t_pushup_goods`(
    id int not null auto_increment,
    name varchar(200),
    primary key (id)
)
COLLATE='utf8_unicode_ci';
insert into t_pushup_goods (id,name) values (1,'体力值');

-- 奖励表
-- drop table t_pushup_bonus;
create table `t_pushup_bonus`(
    id int not null,
    goodid varchar(200) not null,
    name varchar(100) not null comment '奖励名称',
    num int  not null comment '物品数量',
    reason varchar(200) not null comment '奖励说明',
    primary key (id,goodid)
)
COLLATE='utf8_unicode_ci';
insert into t_pushup_bonus (id,goodid,name,reason,num)values(1,1,'每日任务奖励','完成每日任务',5);
insert into t_pushup_bonus (id,goodid,name,reason,num)values(2,1,'PK胜出奖励','PK中胜出',2);


-- 奖励记录表
-- drop table t_pushup_bonus_record;
create table `t_pushup_bonus_record`(
    id int not null auto_increment,
    userid int not null,
    bonusid int not null,
    status tinyint not null default 0 comment '0:未领取,1:已领取',
    receivetime timestamp not null,
    primary key (id),
    index key1 (userid),
    index key2 (bonusid)
)
COLLATE='utf8_unicode_ci';


-- 广播表
-- drop table t_pushup_world_broadcast;
create table `t_pushup_world_broadcast`(
    id int not null auto_increment,
    userid int not null default -1,
    msg varchar(300) not null,
    type int not null comment '类型 1:普通公告,2:可点击跳转公告,3:完成每日任务,4:几连杀,终止几连杀,5:个人最好成绩,6:终结杀戮',
    isshow tinyint not null default 1 comment '是否显示',
    showtimes int not null default -1 comment '显示次数,如果为-1则在以下时间段内显示,无次数限制',
    stime datetime not null comment '开始显示时间',
    etime datetime not null comment '结束显示时间',
    addtime timestamp not NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    primary key (id),
    index key1 (type,addtime)
)
COLLATE='utf8_unicode_ci';

-- 战后激励语言
-- drop table t_pushup_encourage;
create table `t_pushup_encourage`(
    id int not null auto_increment,
    msg varchar(300) not null,
    type int not null comment '完勝:2,胜:1,平:0,败:-1,惨败:-2',
    primary key (id),
    index key1 (type)
)
COLLATE='utf8_unicode_ci';

-- 完勝
insert into t_pushup_encourage(id,msg,type)values(1,'太棒了,你竟然变得这么强大了',2);
insert into t_pushup_encourage(id,msg,type)values(2,'您已经超过了80%的人',2);
insert into t_pushup_encourage(id,msg,type)values(3,'完美的胸肌配得上您',2);
insert into t_pushup_encourage(id,msg,type)values(4,'别人总是羡慕你,却看不到你流的汗',2);
insert into t_pushup_encourage(id,msg,type)values(5,'前面有高手在等你',2);
-- 胜
insert into t_pushup_encourage(id,msg,type)values(11,'相信自己,你就一定能做到',1);
insert into t_pushup_encourage(id,msg,type)values(12,'狭路相逢勇者胜',1);
insert into t_pushup_encourage(id,msg,type)values(13,'让赢成为一种习惯',1);
insert into t_pushup_encourage(id,msg,type)values(14,'完美的胸肌即将属于你',1);
insert into t_pushup_encourage(id,msg,type)values(15,'肌肉是男人最好的外衣',1);
-- 平
insert into t_pushup_encourage(id,msg,type)values(21,'再用力一点就不是这个结果了',0);
insert into t_pushup_encourage(id,msg,type)values(22,'下一刻相遇谁能赢呢?',0);
insert into t_pushup_encourage(id,msg,type)values(23,'世间唯对手最珍贵',0);
insert into t_pushup_encourage(id,msg,type)values(24,'成大事者必定耐得住寂寞',0);
insert into t_pushup_encourage(id,msg,type)values(25,'此局虽平,但你已经变厉害了',0);
-- 败
insert into t_pushup_encourage(id,msg,type)values(31,'你的能量超乎你想像',-1);
insert into t_pushup_encourage(id,msg,type)values(32,'感谢你,你会让我变得更厉害',-1);
insert into t_pushup_encourage(id,msg,type)values(33,'输!让我愈发渴望赢',-1);
insert into t_pushup_encourage(id,msg,type)values(34,'输得起的人,才赢得起',-1);
insert into t_pushup_encourage(id,msg,type)values(35,'好像姿势不对,换个再来一次',-1);
-- 惨败
insert into t_pushup_encourage(id,msg,type)values(41,'虽败,但你已在变强的路上',-2);
insert into t_pushup_encourage(id,msg,type)values(42,'人生就应该大起大落',-2);
insert into t_pushup_encourage(id,msg,type)values(43,'没惨败过的人生才是不完整的',-2);
insert into t_pushup_encourage(id,msg,type)values(44,'这就能打败我吗?笑话!',-2);
insert into t_pushup_encourage(id,msg,type)values(45,'我是冲着赢去的,这都不是事!',-2);



