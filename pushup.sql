
drop table t_pushup_user;
create table `t_pushup_user`(
    userid int not null auto_increment,
    username varchar(20),
    passwd varchar(50),
    win int not null default 0,
    draw int not null default 0,
    lost int not null default 0,
    total int not null default 0 comment '总个数',
    value float default 0 comment '个人能力评估值,俯卧撑的平均时长',
    primary key (userid),
    index key1 (value),
    index key2 (total)
)
COLLATE='utf8_unicode_ci';

drop table t_pushup_record;
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
drop table t_pushup_fight;
create table `t_pushup_fight`(
    userid int not null,
    opponentid int not null,
    urecordid int not null,
    uscore int not null,
    orecordid int not null,
    oscore int not null,
    fighttime datetime not null,
    index key1 (userid),
    index key2 (opponentid)
)
COLLATE='utf8_unicode_ci';



