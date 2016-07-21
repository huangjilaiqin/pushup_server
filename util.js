
module.exports  = {

    CycleQueue:function(size){
        var base = [];
        var front = 0;
        var tail = 0;
        var maxSize = size?size+1:51;
        
        CycleQueue.prototype.push = function(data){
            if( (tail+1)%maxSize === front ){
                throw new Error('queue is full!');
            }
            base[tail] = data;
            tail = (tail+1) % maxSize;
        }
        CycleQueue.prototype.pop = function(data){
            if( front === tail ){
                throw new Error('queue is empty!');
            }
            var element = base[front];
            front = (front+1)%maxSize;
            return element;
        };
        CycleQueue.prototype.display = function(){
            var newBase = [];
            var f = front,t = tail;
            var i = 0;
            while( f!=t ){
                newBase[i++] = base[f++];    
            }
            return newBase;
        };
    },

    NewestQueue:function(size){
        var base = [];
        var front = 0;
        var tail = 0;
        var maxSize = size?size+1:51;
        
        NewestQueue.prototype.push = function(data){
            base[tail] = data;
            tail = (tail+1) % maxSize;
            if( tail===front )
                front = (front+1) % maxSize;
        }
        
        NewestQueue.prototype.display = function(){
            var newBase = [];
            var f = front,t = tail;
            var i = 0;
            console.log(maxSize);
            while( f!=t ){
                newBase[i++] = base[f];    
                f = (f+1)%maxSize;
            }
            return newBase;
        };
        NewestQueue.prototype.forEach= function(cb){
            if(typeof(cb) !== 'function'){
                //throw Error
                return;    
            }
            var f = front,t = tail;
            var i = 0;
            while( f!=t ){
                cb(base[f]);    
                f = (f+1)%maxSize;
            }
        };
    },

    DateFormat:function(format, time){
        if(typeof(format) === 'undefined')
            return undefined;
        var date = time?new Date(time):new Date();
        var o={
            "M+":date.getMonth()+1,//month
            "d+":date.getDate(),//day
            "h+":date.getHours(),//hour
            "m+":date.getMinutes(),//minute
            "s+":date.getSeconds(),//second
            "q+":Math.floor((date.getMonth()+3)/3),//quarter
            "S":date.getMilliseconds()//millisecond
        };
        if(/(y+)/.test(format))
            format = format.replace(RegExp.$1, (date.getFullYear()+"").substr(4-RegExp.$1.length));

        for(var k in o)
            if(new RegExp("("+k+")").test(format))
                format = format.replace(RegExp.$1,RegExp.$1.length==1?o[k]:("00"+o[k]).substr((""+o[k]).length));

        return format;
    },

    //增加或减少一个时间差
    timedelta:function(baseTime,opt){
        var microsecond = 0;
        if(opt.microseconds!=undefined)
            microsecond+=opt.microseconds;
        if(opt.seconds!=undefined)
            microsecond+=opt.seconds*1000;
        if(opt.minutes!=undefined)
            microsecond+=opt.minutes*60000;
        if(opt.hours!=undefined)
            microsecond+=opt.hours*3600000;
        if(opt.days!=undefined)
            microsecond+=opt.days*86400000;
        return new Date(baseTime.getTime()+microsecond);
    },

    dayOfBegin:function(baseTime){
        return new Date(baseTime.getYear()+1900,baseTime.getMonth(),baseTime.getDate());
    },

    dayOfEnd:function(baseTime){
        var dayOfBegin = this.dayOfBegin(baseTime);
        return this.timedelta(dayOfBegin,{days:1});
    },

    parseData:function(data){
        var obj = JSON.parse(data);
        return obj;
    },
};

/*
var parseData = parseDataByJSON;



exports.NewestQueue = NewestQueue;
exports.CycleQueue = CycleQueue;
exports.DateFormat = DateFormat;
exports.parseData = parseData;
*/

/*
var q = new CycleQueue(10);
q.push('test');
q.push(5);
q.push(8);
console.log(q.pop());
q.push(9);
q.push(0);
console.log(q.display());
//*/

/*
var n = new NewestQueue(3);
console.log(n);
n.push(0);
n.push(1);
n.push(2);
console.log(n.display());
n.push(3);
console.log(n.display());
n.push(4);
console.log(n.display());
n.push(5);
console.log(n.display());
//*/

