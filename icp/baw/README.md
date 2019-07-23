## Software downloads
**BAW 18.0.0.1**
```
wget https://ak-dsw-mul.dhe.ibm.com/sdfdl/v2/fulfill/CNTA0ML/Xa.2/Xb.htcOMovxHCAgZGSLFFFrixSwz6EdHBwX/Xc.CNTA0ML/BAW_18_0_0_1_Linux_x86_1_of_3.tar.gz/Xd./Xf.lPr.A6VR/Xg.10254441/Xi./XY.knac/XZ.NmgCNW7xHey_BNs4bvVyV8rO39k/BAW_18_0_0_1_Linux_x86_1_of_3.tar.gz#anchor
wget https://ak-dsw-mul.dhe.ibm.com/sdfdl/v2/fulfill/CNTA1ML/Xa.2/Xb.htcOMovxHCAgZGSLFFFrixSwz6G_6yMX/Xc.CNTA1ML/BAW_18_0_0_1_Linux_x86_2_of_3.tar.gz/Xd./Xf.lPr.A6VR/Xg.10254442/Xi./XY.knac/XZ.UiESINHiDBQPr58rtNzXz1amTHM/BAW_18_0_0_1_Linux_x86_2_of_3.tar.gz#anchor
wget https://ak-dsw-mul.dhe.ibm.com/sdfdl/v2/fulfill/CNTA2ML/Xa.2/Xb.htcOMovxHCAgZGSLFFFrixSwz6FSVVVX/Xc.CNTA2ML/BAW_18_0_0_1_Linux_x86_3_of_3.tar.gz/Xd./Xf.lPr.A6VR/Xg.10254442/Xi./XY.knac/XZ.yYZ2Jd1GbagGGHvbG8eeFgo_NU0/BAW_18_0_0_1_Linux_x86_3_of_3.tar.gz#anchor
```

**BAW 19.0.0.1**
```
wget https://ak-delivery04-mul.dhe.ibm.com/sar/CMA/WSA/086lh/0/workflow.19001.delta.repository.zip
```

**WAS 8.5.5.15 fixpack**
```
wget https://ak-delivery04-mul.dhe.ibm.com/sar/CMA/WSA/0840l/0/8.5.5-WS-WAS-FP015-part1.zip
wget https://ak-delivery04-mul.dhe.ibm.com/sar/CMA/WSA/0840m/0/8.5.5-WS-WAS-FP015-part2.zip
wget https://ak-delivery04-mul.dhe.ibm.com/sar/CMA/WSA/0842m/0/8.5.5-WS-WAS-FP015-part3.zip
```

## Doc
Knowledge Center [install documentation](https://www.ibm.com/support/knowledgecenter/SS8JB4/com.ibm.wbpm.imuc.doc/topics/inst_nd_cust_lin.html)

## Linux settings
Add the following content in the file `/etc/security/limits.conf` on all servers.
```
# - stack - maximum stack size (KB)
root soft stack 32768
root hard stack 32768
# - nofile - maximum number of open files
root soft nofile 65536
root hard nofile 65536
# - nproc - maximum number of processes
root soft nproc 16384
root hard nproc 16384
# - fsize - maximum file size
root soft fsize 6291453
root hard fsize 6291453
```

Execute the scripts in all server.
```
echo 3000 > /proc/sys/net/core/netdev_max_backlog
echo 3000 > /proc/sys/net/core/somaxconn
echo 15 > /proc/sys/net/ipv4/tcp_keepalive_intvl
echo 5  > /proc/sys/net/ipv4/tcp_keepalive_probes
```

## Unpack Installation Files
```
gunzip BAW_18_0_0_1_Linux_x86_1_of_3.tar.gz
gunzip BAW_18_0_0_1_Linux_x86_2_of_3.tar.gz
gunzip BAW_18_0_0_1_Linux_x86_3_of_3.tar.gz

tar xvf BAW_18_0_0_1_Linux_x86_1_of_3.tar
tar xvf BAW_18_0_0_1_Linux_x86_2_of_3.tar
tar xvf BAW_18_0_0_1_Linux_x86_3_of_3.tar

unzip 8.5.5-WS-WAS-FP015-part1.zip
unzip 8.5.5-WS-WAS-FP015-part2.zip
unzip 8.5.5-WS-WAS-FP015-part3.zip
```

## Install IM
```
cd /downloads/BAW18001/IM64/tools
./imcl install com.ibm.cic.agent -repositories /downloads/BAW18001/IM64/repository.config -installationDirectory /opt/ibm/IM/eclipse -showVerboseProgress -log IM_Installation.log -acceptLicense
```

## Install BAW
```
cd /opt/ibm/IM/eclipse/tools/
# install BAW 18.0.0.1
./imcl install com.ibm.bpm.ADV.v85,WorkflowEnterprise.NonProduction com.ibm.websphere.ND.v85,core.feature,ejbdeploy,thinclient,embeddablecontainer,samples,com.ibm.sdk.6_64bit -acceptLicense -installationDirectory /opt/IBM/BPM -repositories /downloads/BAW18001/repository/repos_64bit -properties user.wasjava=java8 -showVerboseProgress -log silentinstall.log

# install BAW 19.0.0.1 and WAS 8.5.5.15 fix pack
./imcl install com.ibm.websphere.ND.v85 com.ibm.bpm.ADV.v85,WorkflowEnterprise.NonProduction -acceptLicense -installationDirectory /opt/IBM/BPM -repositories /downloads/WAS85515/repository.config,/downloads/BAW19001/workflow.19001.delta.repository.zip -properties user.wasjava=java8 -showVerboseProgress -log silent_update.txt

# check the installed packages
/opt/IBM/BPM/bin/versionInfo.sh -maintenancePackages
```

## Create share folder for Case Management in NFS server and mount it in all servers
```
# Expose the folder /data/casemanagement on NFS server.

# Mount the NFS folder in all servers.
mkdir -p /data/casemanagement
mount 172.16.52.212:/data/casemanagement /data/casemanagement
```

## Create Profiles
make sure the property "bpm.de.caseManager.networkSharedDirectory" has been set to the share folder "/data/casemanagement"

```
# login DE server
cd /opt/IBM/BPM/bin
./BPMConfig.sh -create -de Advanced-PC-ThreeClusters-DB2.properties 
/opt/IBM/BPM/profiles/DmgrProfile/bin/startManager.sh

# login node servers
cd /opt/IBM/BPM/bin
./BPMConfig.sh -create -de Advanced-PC-ThreeClusters-DB2.properties 
/opt/IBM/BPM/profiles/Node1Profile/bin/startNode.sh
/opt/IBM/BPM/profiles/Node2Profile/bin/startNode.sh
```

## Create DB
DB scripts can be found in `/opt/IBM/BPM/profiles/DmgrProfile/dbscripts`
```
db2 -stf CMNDB-Cell/createDatabase.sql

db2 connect to CMNDB
db2 -tvf CMNDB-Cell/createSchema_Advanced.sql
db2 -tvf CMNDB/createSchema_Advanced.sql
db2 -tvf CMNDB/createSchema_Messaging.sql
db2 connect reset


db2 -stf BPMDB/createDatabase.sql
db2 connect to BPMDB
db2 -tvf BPMDB/createSchema_Advanced.sql
db2 -tdGO -vf BPMDB/createProcedure_Advanced.sql
db2 connect reset


db2 -stf PDWDB/createDatabase.sql
db2 connect to PDWDB
db2 -tvf PDWDB/createSchema_Advanced.sql
db2 connect reset


mkdir -p /home/db2inst1/db2inst1/CPEDB/DOSSA/datafs1
mkdir -p /home/db2inst1/db2inst1/CPEDB/DOSSA/datafs2
mkdir -p /home/db2inst1/db2inst1/CPEDB/DOSSA/datafs3
mkdir -p /home/db2inst1/db2inst1/CPEDB/DOSSA/indexfs1
mkdir -p /home/db2inst1/db2inst1/CPEDB/DOSSA/indexfs2
mkdir -p /home/db2inst1/db2inst1/CPEDB/DOSSA/lobfs1
mkdir -p /home/db2inst1/db2inst1/CPEDB/TOSSA/datafs1
mkdir -p /home/db2inst1/db2inst1/CPEDB/TOSSA/datafs2
mkdir -p /home/db2inst1/db2inst1/CPEDB/TOSSA/datafs3
mkdir -p /home/db2inst1/db2inst1/CPEDB/TOSSA/indexfs1
mkdir -p /home/db2inst1/db2inst1/CPEDB/TOSSA/indexfs2
mkdir -p /home/db2inst1/db2inst1/CPEDB/TOSSA/lobfs1
mkdir -p /home/db2inst1/db2inst1/CPEDB/sys
mkdir -p /home/db2inst1/db2inst1/CPEDB/systmp
mkdir -p /home/db2inst1/db2inst1/CPEDB/usr
mkdir -p /home/db2inst1/db2inst1/CPEDB/log

chmod -R 777 /home/db2inst1/db2inst1/CPEDB

# replace @DB_DIR@ with /home/db2inst1/db2inst1 in CPEDB/createDatabase_ECM.sql and CPEDB/createTablespace_Advanced.sql
db2 -stf CPEDB/createDatabase_ECM.sql
db2 connect to CPEDB
db2 -tvf CPEDB/createTablespace_Advanced.sql
db2 connect reset
db2 connect to CPEDB
db2 -tvf CPEDB/createSchema_Advanced.sql
db2 connect reset
```

## Bootstrap Process Server Data
```
/opt/IBM/BPM/profiles/DmgrProfile/bin/bootstrapProcessServerData.sh -clusterName AppCluster
```

## Create Object Store for Case Management
create a group named "caseAdmin" in WAS console, and assign deadmin to the group, then execute the following script.
```
/opt/IBM/BPM/profiles/DmgrProfile/bin/wsadmin.sh -user deadmin -password deadmin -host dbamc-icp-ubuntu-baw3.csplab.local -port 8880 -lang jython
print AdminTask.createObjectStoreForContent(['-clusterName', 'AppCluster', '-PEWorkflowSystemAdminGroup', 'caseAdmin','-creationUser','deadmin','-password','deadmin'])
```

## Remote desktop to Ubuntu
Run the scripts on Ubuntu, then you can connect to Ubuntu by the `Remote Desktop Connection`
```
apt-get install xrdp
apt-get install xfce4
echo xfce4-session >~/.xsession

# Remove the line `. /etc/X11/Xsession` and add the line `startxfce4` in file `/etc/xrdp/startwm.sh`

service xrdp restart
```

## Case Management Configuration
Update the timeout setting to at least 600 seconds:
* Servers > Server Types > WebSphere application servers > Configuration tab > Container Settings > Container Services > Transaction service > Total transaction lifetime timeout
* Servers > Server Types > WebSphere application servers > Configuration tab > Container Settings > Container Services > Transaction service > Maximum transaction lifetime timeout
* Servers > Server Types > WebSphere application servers > Configuration tab > Container Settings > Container Services > ORB service > Request timeout
* Servers > Server Types > WebSphere application servers > Configuration tab > Container Settings > Container Services > ORB service > Locate request timeout
* Resources > JDBC > Data sources > [Content Engine or Case Manager data source name] > Connection Pool properties > Connection timeout
* Resources > JDBC > Data sources > [Content Engine or Case Manager XA data source name] > Connection Pool properties > Connection timeout

Run `/opt/IBM/BPM/CaseManagement/configure/configmgr` in Ubuntu Remote Desktop
Then run all tasks in sequence according to the doc https://www.ibm.com/support/knowledgecenter/SS8JB4/com.ibm.wbpm.imuc.doc/topics/acmin123.html
* Register the Administration Console for Content Platform Engine (ACCE) Plug-in
* Configure the Case Management Object Stores
* Define the Default Project Area
* Configure Case Integration with IBM Business Automation Workflow
* Deploy the Content Platform Engine Workflow Service
* Register the IBM Business Automation Workflow Plug-in
* Register the Case Management Services Plug-in
* Register the Case Widgets Package
* Register the IBM Business Automation Workflow Case Administration Client Plug-in
* Register Project Area
* Configure Business Rules
* Register the Case Monitor Widgets Package

## Uninstall
```
# drop databases
su - db2inst1
db2 drop database CMNDB;
db2 drop database BPMDB;
db2 drop database PDWDB;
rm -rf /home/db2inst1/db2inst1/CPEDB
db2 drop database CPEDB;

# Stop DE and Nodes
/opt/IBM/BPM/profiles/Node1Profile/bin/stopNode.sh -username deadmin -password deadmin
/opt/IBM/BPM/profiles/Node2Profile/bin/stopNode.sh -username deadmin -password deadmin
/opt/IBM/BPM/profiles/DmgrProfile/bin/stopManager.sh -username deadmin -password deadmin

# Delete profiles on all servers
cd /opt/IBM/BPM/bin
./BPMConfig.sh -delete -profiles Advanced-PC-ThreeClusters-DB2.properties
rm -rf /opt/IBM/BPM/profiles
```


## Error: The plug-in JAR file was not found at the specified location issue
It's because we forgot to set the case management folder to network directory. To fix it we can modify the configuration by below commands.
https://www.ibm.com/support/knowledgecenter/SS8JB4/com.ibm.casemgmt.design.doc/acmta062.html
```
cd /opt/IBM/BPM/bin
./BPMConfig.sh -export -profile DmgrProfile -de De1 -outputDir bawconfig/
./BPMConfig.sh -update -profile DmgrProfile -de De1 -component ContentNavigator -networkDirectory /data/casemanagement
./BPMConfig.sh -update -profile DmgrProfile -de De1 -component CaseManager -networkDirectory /data/casemanagement
```
