#!/bin/bash

git clone -b move_build_output_to_server https://github.com/alexsteingart/pithy /root/pithy/

docker build -t first_instance - < /root/pithy/docker/Dockerfile

docker run -d -p 49001:8001 -w /root/pithy -i -t first_instance nodejs index.js 8001 > id_file
data=$(cat id_file)
(crontab -l; echo "*/5 * * * * docker commit $data first_instance" ) | crontab -
