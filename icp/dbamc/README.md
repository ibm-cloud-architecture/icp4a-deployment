# IBM Cloud Pak for Automation scripted install
Follow the steps below for a scripted install (or uninstall) of the IBM Cloud Pak for Automation (ICPK4A) on your existing Ubuntu or RedHat ICP cluster.

## Prerequisites
Before starting, you must have the ICPK4A archive (e.g. `DBAMC-18.0.2.tgz`) downloaded on your boot node.

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
172.16.52.200

# the NFS node
[nfs]
172.16.52.211

# one of the master node
[master]
172.16.52.201

[worker]
172.16.52.208
172.16.52.209
172.16.52.210
```
## Testing connections
Run the following command to make sure you can access all the hosts from your Ansible server:
```
ansible all -m ping -i inventory
```
You should get a `SUCCESS` response for all hosts, like the following:
```
172.16.52.200 | SUCCESS => {
    "ansible_facts": {
        "discovered_interpreter_python": "/usr/bin/python"
    },
    "changed": false,
    "ping": "pong"
}
```

## Configuring install parameters
Open the `./inventories/group_vars/all.yaml` file and provide the values for the different install parameters.


## Installing
The install playbook is composed of: 
- `init_nfs`
- `install_cli`
- `test_helm_chart`
- `load_dbamc`
- `create_namespace`
- `create_secret`
- `create_pv`
- `deploy_dbamc`
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
- `purge_dbamc`
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

### ErrImagePull when run ODM deployment
Error:
```
2019-06-24 09:48:52.664 - The container with image dbamc.icp:8500/default/odm-ibacc-job:18.0.2 within pod odm-cfg-provision-container is pending, the restart count is 0 and is not ready
2019-06-24 09:48:52.664 - The container with image dbamc.icp:8500/default/odm-ibacc-job:18.0.2 within pod odm-cfg-provision-container is waiting due to reason ErrImagePull (rpc error: code = Unknown desc = Error response from daemon: Get https://dbamc.icp:8500/v2/default/odm-ibacc-job/manifests/18.0.2: unauthorized: authentication required)
```
The docker pull secret "admin.registrykey" in odm deployment file is not created.
The workaround is create secret "admin.registrykey" manually.
```
kubectl create secret docker-registry admin.registrykey --docker-server=dbamc.icp:8500 --docker-username=admin --docker-password=admin -n dbamc-test1
```

### tls bad certification
```
TASK [Install Helm chart] ******************************************************
changed: [localhost] => {"changed": true, "cmd": "helm install /opt/ibm/icp/product-helm-charts/ibm-odm-prod-2.1.0.tgz --values /opt/ibm/ibacc/cfg/myvalues.yml --name dbamc-odm --namespace dbamc-test1   --tls", "delta": "0:00:00.573170", "end": "2019-06-24 10:54:32.621381", "failed_when_result": false, "msg": "non-zero return code", "rc": 1, "start": "2019-06-24 10:54:32.048211", "stderr": "Error: remote error: tls: bad certificate", "stderr_lines": ["Error: remote error: tls: bad certificate"], "stdout": "", "stdout_lines": []}

TASK [debug] *******************************************************************
ok: [localhost] => {
    "msg": "stdout: []"
}

TASK [debug] *******************************************************************
ok: [localhost] => {
    "msg": "stderr: [u'Error: remote error: tls: bad certificate']"
}
```

It is because the cluster name in /opt/ibm/ibacc/dbamc_staging_deploy/cfg/jobs.yml is wrong.
```
# find the worker node ip then ssh to the worker node
kubectl get pods -n dbamc-test1 -o wide

docker cp k8s_ibm-dba-multicloud-prod_dbamc-test1-ibm-dba-multicloud-prod-676b9bcc94-264jb_dbamc-test1_6340d3e1-9707-11e9-88c4-005056a5a56c_0:/opt/ibm/ibacc/dbamc_staging_deploy/cfg/jobs.yml ./
# edit the jobs.yml, change
# SC_K8S_CLUSTER_NAME: "mycluster.icp"
# to 
# SC_K8S_CLUSTER_NAME: "dbamc.icp"
# Then it back the the container
docker cp jobs.yml k8s_ibm-dba-multicloud-prod_dbamc-test1-ibm-dba-multicloud-prod-676b9bcc94-264jb_dbamc-test1_6340d3e1-9707-11e9-88c4-005056a5a56c_0:/opt/ibm/ibacc/dbamc_staging_deploy/cfg/jobs.yml
```

### Secrets dbamc-odm-kafka and dbamc-odm-ldap already exists if rerun the same deployment
Error:
```
2019-06-25 05:17:54,111 p=28 u=odm-user |  TASK [fail] ********************************************************************
2019-06-25 05:17:54,154 p=28 u=odm-user |  fatal: [localhost]: FAILED! => {"changed": false, "msg": "Secret dbamc-odm-kafka already exists, please remove it manually before attempting re-run!"}
2019-06-25 05:17:54,188 p=28 u=odm-user |  TASK [set_fact] ****************************************************************
2019-06-25 05:17:54,214 p=28 u=odm-user |  ok: [localhost] => {"ansible_facts": {"testResult": "FAIL - Deploy Product"}, "changed": false}

2019-06-25 05:21:27,873 p=26 u=odm-user |  TASK [fail] ********************************************************************
2019-06-25 05:21:27,919 p=26 u=odm-user |  fatal: [localhost]: FAILED! => {"changed": false, "msg": "Secret dbamc-odm-ldap already exists, please remove it manually before attempting re-run!"}
2019-06-25 05:21:27,945 p=26 u=odm-user |  TASK [set_fact] ****************************************************************
2019-06-25 05:21:27,971 p=26 u=odm-user |  ok: [localhost] => {"ansible_facts": {"testResult": "FAIL - Deploy Product"}, "changed": false}
```

Fix the issue  by delete the secrets dbamc-odm-kafka and dbamc-odm-ldap
```
kubectl delete secret dbamc-odm-kafka -n dbamc-test1
kubectl delete secret dbamc-odm-ldap -n dbamc-test1
```