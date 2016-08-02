#! /bin/sh

proNames=('main' 'resetServer' 'monitor')
start(){
    for proName in ${proNames[@]}  
    do
        echo "start ${proName} ..."
        DAEMON="node ${proName}.js" 
        nohup $DAEMON > /dev/null &
        PIDFILE="${proName}.pid"
        echo $! > $PIDFILE
        echo "start success, pid: $!"
    done
}

stop(){
    for proName in ${proNames[@]}  
    do
        echo "stop ${proName} ..."
        PIDFILE="${proName}.pid"
        pid=`cat $PIDFILE`
        kill $pid
        rm $PIDFILE
        echo "stop success" 
    done
}

restart(){
    stop
    start
}

if [ -z $1 ]
then
    echo 'Usage:  server.sh start|stop|restart'
fi

case $1 in
    start)
        start
            ;;
    stop)
        stop
            ;;
    restart)
        restart
            ;;
esac
exit 0

