
var log4js = require('log4js');
log4js.configure('log.json');
var logServer = log4js.getLogger('server');
var logPerformance = log4js.getLogger('performance');
var logHttpProtocol = log4js.getLogger('httpprotocol');

var getOutputStr=function(datas){
    for(var i=0;i<datas.length;i++)
        if(typeof(datas[i])==='object')
            datas[i]=JSON.stringify(datas[i]);
    var outputStr = Array.prototype.slice.call(datas).join(' ');
    //console.log('outputStr ',outputStr);
    return outputStr;
};

module.exports = {
    logServer: logServer,
    logPerformance: logPerformance,    
    logHttpProtocol: logHttpProtocol, 
    trace:function(){
        var outputStr = getOutputStr(arguments);
        console.log(outputStr);
        logServer.trace(outputStr);
    },
    info:function(){
        var outputStr = getOutputStr(arguments);
        console.log(outputStr);
        logServer.info(outputStr);
    },
    debug:function(){
        var outputStr = getOutputStr(arguments);
        console.log(outputStr);
        logServer.debug(outputStr);
    },
    error:function(){
        var outputStr = getOutputStr(arguments);
        console.log(outputStr);
        logServer.error(outputStr);
    },
    fatal:function(){
        var outputStr = getOutputStr(arguments);
        console.log(outputStr);
        logServer.fatal(outputStr);
    },

};

