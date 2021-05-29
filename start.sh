#!/bin/bash

# Update on flag UPDATE=true
if [ "$UPDATE" = true ] ; then
    git pull origin master
fi

node index.js 8080 --runtimeout=true&
node raw_shower.js 8081
