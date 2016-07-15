
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
    primary key (userid),
    index key1 (value),
    index key2 (total)
)
COLLATE='utf8_unicode_ci';

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


