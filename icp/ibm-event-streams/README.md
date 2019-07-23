## Prerequisites
Before starting, you must have the ICP4A archive (e.g. `eventstreams.2019.1.1.z_x86.pak.tar.gz`) downloaded on your boot node.

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

## Installing
The install playbook is composed of: 
- `init_nfs`
- `install_cli`
- `test_helm_chart`
- `load_event_streams`
- `create_namespace`
- `create_secrect`
- `apply_image_policy`
- `create_pv`
- `deploy_event_streams`

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
- `purge_event_streams`
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

### Failed to pull image

`rpc error: code = 2 desc = net/http: request canceled`

```
# ssh to each worker node

vi /etc/systemd/system/kubelet.service

# add the parameter image-pull-progress-deadline in kubelet.service file
--image-pull-progress-deadline=10m

# restart kubelet
systemctl daemon-reload
systemctl restart kubelet

# verify the kubelet is started
ps -ef | grep kubelet
```

### Network Authentication Required when login to the event streams UI
Get [these shell commands](https://github.com/IBM/charts/tree/master/stable/ibm-eventstreams-dev/ibm_cloud_pak/pak_extensions/support) to perform some diagnostic.

Check the logs of `ibm-es-ui-deploy`, it will show the error:
```
{"ibm_datetime":"2019-06-25T08:11:33.475Z","logLevel":"ERROR","module":"[auth generateOAuthAccessToken]","ibm_messageId":"IES","message":"Failed to generate token: StatusCodeError: 400 - \"Invalid token response, missing expiry in token response\""}
```

The workaround is to restart the `auth-idp` pods.
```
kubectl -n kube-system delete pod -l k8s-app=auth-idp
```