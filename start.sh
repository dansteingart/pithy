node index.js 8080 --runtimeout=true&
node raw_shower.js 8081&
jupyter lab --notebook-dir=/notebooks --ip=* --no-browser --allow-root
