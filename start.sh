PORT=8080 PITHY_TIMEOUT=60 node server.js&
PORT=8081 node shower.js&
if [ $1 = jupyter ]
then
    jupyterlab --port 8888 --host 0.0.0.0
fi


sleep infinity
