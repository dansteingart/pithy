#!/bin/bash

#Get Latest Version of Pithy
docker pull steingart/pithy

#Kill Local Container
docker rm -f pithy

#Startup Container
docker run  \
-p 8001:8080 \
-p 8888:8888 \
-p 8004:8081 \
-v $PWD:/pithy \
-dit --name pithy steingart/pithy
