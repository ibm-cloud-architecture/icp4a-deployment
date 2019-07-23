## Prerequisites
Before starting, you must have the ICPK4A archive (e.g. `icp-cam-x86_64-3.1.2.1.tar.gz`) downloaded on your boot node.

## Disabling host check
Open the ansible configuration file `~/.ansible.cfg` and add the following content:
```
[defaults]
host_key_checking = False
```

## Configuring IPs
Open the `./inventory/hosts` file and
provide the IP address for the cluster boot node and the node which hosts the NFS server:
```
# the Boot node
[boot]
172.16.52.220

# the NFS node
[nfs]
172.16.52.212

# one of the master node
[master]
172.16.52.221

[worker]
172.16.52.228
172.16.52.229
172.16.52.230
172.16.52.231
```
## Testing connections
Run the following command to make sure you can access all the hosts from your Ansible server:
```
ansible all -m ping -i inventory
```
You should get a `SUCCESS` response for all hosts, like the following:
```
172.16.52.220 | SUCCESS => {
    "ansible_facts": {
        "discovered_interpreter_python": "/usr/bin/python"
    },
    "changed": false,
    "ping": "pong"
}
```

## Configuring install parameters
- Generate API Key
```
export serviceIDName='service-deploy'
export serviceApiKeyName='service-deploy-api-key'
cloudctl login -a https://dbamc.icp:8443 --skip-ssl-validation -u admin -p admin -n services
cloudctl iam service-id-create ${serviceIDName} -d 'Service ID for service-deploy'
cloudctl iam service-policy-create ${serviceIDName} -r Administrator,ClusterAdministrator --service-name 'idmgmt'
cloudctl iam service-policy-create ${serviceIDName} -r Administrator,ClusterAdministrator --service-name 'identity'
cloudctl iam service-api-key-create ${serviceApiKeyName} ${serviceIDName} -d 'Api key for service-deploy'
```
- The output is:
```
Please preserve the API key! It cannot be retrieved after it's created.
                 
Name          service-deploy-api-key   
Description   Api key for service-deploy   
Bound To      crn:v1:icp:private:iam-identity:dbamc:n/services::serviceid:ServiceId-09f5dde5-26b4-4f52-b229-c1598d20da0c   
Created At    2019-06-21T02:40+0000   
API Key       7yX5-BZ3pLvywkTyWjjUG7QwBGt80MCw5ckOBzhtiwvM  
```
- Open the `./inventories/group_vars/all.yaml` file and provide the values for the different install parameters, the api_key is from the above script.


## Installing
The install playbook is composed of: 
- `init_nfs`
- `install_cli`
- `test_helm_chart`
- `load_cam`
- `create_secret`
- `create_pv`
- `deploy_cam`

They can be run all at once:

```
ansible-playbook install.yaml -i inventory
```

Or they can be run one at a time, using a specific task name:
```
ansible-playbook install.yaml -i inventory --tags "<task_name>"
```

## Uninstalling
The uninstall playbook is composed of: 
- `purge_cam`
- `delete_pv`
- `delete_nfs`

They can be run all at once:
```
ansible-playbook uninstall.yaml -i inventory
```
Or they can be run one at a time, using a specific task name:
```
ansible-playbook uninstall.yaml -i inventory --tags "<task_name>"
```

  
## Troubleshooting

### Cloud Connection timeout
The csplab vSphere Center performance is really poor, so that the cloud connection in CAM always timeout.
The workaround is increase the connection timeout setting in the cam-iaas deployment, the steps are:
- Run the command to create a patched image named **"dbamc.icp:8500/services/icam-iaas:3.1.2.1-x86_64-fix-timeout"**
```
ansible-playbook patch.yaml -i inventory
```
- Open ICP console -> Workloads -> Deployments -> Edit "cam-iaas", change the line 60 from **"image": "dbamc.icp:8500/services/icam-iaas:3.1.2.1-x86_64",** to **"image": "dbamc.icp:8500/services/icam-iaas:3.1.2.1-x86_64-fix-timeout",**

### `cam-bpd-ui` not available
https://www.ibm.com/support/knowledgecenter/en/SS2L37_3.1.2.1/ts_cam_install.html

```
# Get into the MariaDB pod
kubectl exec -it -n services cam-bpd-mariadb-d84b5b9d8-lpdg7 -- bash

#  Get the MariaDB root password
env | grep MYSQL_ROOT_PASSWORD

# Run the mysql command line tool
mysql -u root -p <password_found_above>  
# for example: mysql -u root -pbcb19ee3dee0
# you might only need mysql without any credentials

# Show the databases
show databases;

# Verify database ibm_ucdp exists. If it does, then
use ibm_ucdp;
show tables;

# Verify there are many tables (should show around 61)

# Verify the user "ucdpadmin" exists
SELECT User,Host FROM mysql.user;

drop database ibm_ucdp;

CREATE DATABASE ibm_ucdp;
CREATE USER 'ucdpadmin'@'%' IDENTIFIED BY 'bcb19ee3dee0';
GRANT ALL ON ibm_ucdp.* TO 'ucdpadmin'@'%' ;
FLUSH PRIVILEGES;

kubectl delete pod cam-bpd-ui-77dd68957f-jxvb8 -n services
```