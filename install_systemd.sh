Last login: Tue Aug 16 22:51:36 on ttys004
You have new mail.
dan@black √ ~ % ssh pi@judy.local
pi@judy.local's password: 
Linux judy 5.10.103-v7l+ #1529 SMP Tue Mar 8 12:24:00 GMT 2022 armv7l

The programs included with the Debian GNU/Linux system are free software;
the exact distribution terms for each program are described in the
individual files in /usr/share/doc/*/copyright.

Debian GNU/Linux comes with ABSOLUTELY NO WARRANTY, to the extent
permitted by applicable law.
Last login: Tue Aug 16 22:51:50 2022 from 10.243.161.59
lpi@judy:~ $ cd pithy/
pi@judy:~/pithy $ nano in
index.html                 install_systemd.sh.save
install_systemd.sh         install_systemd.sh.save.1
pi@judy:~/pithy $ nano install_systemd.sh
pi@judy:~/pithy $ nano install_systemd.sh.save

























pi@judy:~/pithy $ less sstart.sh 
pi@judy:~/pithy $ less pstart.sh 
pi@judy:~/pithy $ which node
/home/pi/.nvm/versions/node/v16.17.0/bin/node
pi@judy:~/pithy $ nano install_systemd.sh
pi@judy:~/pithy $ nano install_systemd.sh
pi@judy:~/pithy $ bash install_systemd.sh
/home/pi/.nvm/versions/node/v16.17.0/bin/node
pi@judy:~/pithy $ nano install_systemd.sh
pi@judy:~/pithy $ bash install_systemd.sh
/home/pi/.nvm/versions/node/v16.17.0/bin/node
pi@judy:~/pithy $ ls
assets        install_systemd.sh         package-lock.json  settings.json
code          install_systemd.sh.save    persist            shower.js
code_stamped  install_systemd.sh.save.1  post_payload       sstart.sh
dist          libs                       pstart.sh          start.sh
files         lprint-1.1.0.tar.gz        README.md          static
fonts         monaco.js                  results            temp_results
images        node_modules               runs.db            webpack.config.js
index.html    package.json               server.js
pi@judy:~/pithy $ rm install_systemd.sh.save*
pi@judy:~/pithy $ ls
assets        images               node_modules       README.md      sstart.sh
code          index.html           package.json       results        start.sh
code_stamped  install_systemd.sh   package-lock.json  runs.db        static
dist          libs                 persist            server.js      temp_results
files         lprint-1.1.0.tar.gz  post_payload       settings.json  webpack.config.js
fonts         monaco.js            pstart.sh          shower.js
pi@judy:~/pithy $ nano install_systemd.sh 

  GNU nano 3.2                         install_systemd.sh                                   

#first make start sh's 

NODE=$(which node)
echo $NODE

#pithy
echo "#!/bin/bash
PORT=8001 $NODE server.js" > pstart.sh

#shower
echo "#!/bin/bash
PORT=8004 $NODE shower.js" > sstart.sh

#now making system file

echo "[Unit]
Description=pithy
After=network.target
StartLimitIntervalSec=0

[Service]
Type=simple
Restart=always
RestartSec=1
User=$USER
WorkingDirectory=$PWD
ExecStart=/bin/bash $PWD/pstart.sh

[Install]
WantedBy=multi-user.target
" > pithy.service

echo "[Unit]
Description=pithy shower
After=network.target
StartLimitIntervalSec=0

[Service]
Type=simple
Restart=always
RestartSec=1
User=$USER
WorkingDirectory=$PWD
ExecStart=/bin/bash $PWD/sstart.sh

[Install]
WantedBy=multi-user.target
" > shower.service

sudo mv pithy.service /etc/systemd/system/pithy.service
sudo mv shower.service /etc/systemd/system/shower.service

sudo systemctl daemon-reload

sudo systemctl enable pithy
sudo systemctl enable shower

sudo systemctl start pithy
sudo systemctl start shower
