#!/bin/bash
node index.js 8080 --runtimeout=true&
node raw_shower.js 8081&
jupyter lab --notebook-dir=/ --ip=0.0.0.0 --no-browser --allow-root
