# Base Docker File
#
# VERSION       1.0

# use the ubuntu base image provided by dotCloud
FROM ubuntu:latest
MAINTAINER Alex Steingart, alexsteingart@gmail.com

# make sure the package repository is up to date
RUN echo "deb http://archive.ubuntu.com/ubuntu precise main universe" > /etc/apt/sources.list
RUN apt-get update


RUN apt-get install -y nodejs-dev npm git vim libexpat1-dev libssl-dev libc6-dev python2.7-dev python-pip python-numpy python-scipy libgtk2.0-0 python-glade2 python-matplotlib

RUN easy_install -U distribute

RUN pip install pil

RUN git clone -b move_build_output_to_server https://github.com/alexsteingart/pithy /root/pithy/

EXPOSE 8001

#ENTRYPOINT ["node", "index.js", "8001"]

WORKDIR /root/pithy/
