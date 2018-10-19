node index.js 8080 --runtimeout=true&
node raw_shower.js 8081&
jupyter notebook --notebook-dir=$1 --ip=* --no-browser --allow-root
