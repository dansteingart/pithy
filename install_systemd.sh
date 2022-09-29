#! /bin/bash
#first make start sh's 

NODE=$(which node)
echo $NODE

PYTHON=$(which python)
echo $PYTHON

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
Environment=PITHY_BIN=$PYTHON
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
Environment=PITHY_BIN=$PYTHON
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
