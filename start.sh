PORT=8080 PITHY_TIMEOUT=60 node server.js&
PORT=8081 node shower.js&
if [ $1 = jupyter ]
then
    jupyter-lab --allow-root --ip=0.0.0.0 --port=8888 --ServerApp.token="61812022" --ServerApp.notebook_dir="notebook"
fi

sleep infinity
