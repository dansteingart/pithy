node index.js 8080 --runtimeout=true&
node raw_shower.js 8081&
cd notebook; jupyter lab --ip=* --no-browser
