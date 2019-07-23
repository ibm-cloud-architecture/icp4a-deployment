# IBM Cloud Private scripted install
Follow the steps below for a scripted install (or uninstall) of the IBM Cloud Private (ICP) on your existing set of VMs.

## Prerequisites
Before starting, you must download the following archives on your boot node:
- The Docker install archive (e.g. icp-docker-18.03.1_x86_64.bin)
- The ICP install archive (e.g. ibm-cloud-private-x86_64-3.1.2.tar.gz)

## Disabling host check
Open the ansible configuration file `~/.ansible.cfg` and add the following content:
```
[defaults]
host_key_checking = False
```

## Configuring IPs
Open the `./inventories/{ubuntu, redhat}/hosts` file and provide the IP address for your cluster nodes:
```
[nfs]
172.16.52.211

[boot]
172.16.52.200

[master]
172.16.52.201
172.16.52.202
172.16.52.203

[worker]
172.16.52.208
172.16.52.209
172.16.52.210

[proxy]
172.16.52.206
172.16.52.207

[management]
172.16.52.204
172.16.52.205
```

## Testing connection
Run the following command to make sure you can access all the hosts from your Ansible server:
```
ansible all -m ping -i inventories/{ubuntu, redhat}
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

## Configuring hosts parameters
Open the `./conf/{ubuntu, redhat}/hosts` file and associate the appropriate name and role for each host:

```
127.0.0.1 localhost

172.16.52.211 dbamc-icp-worker4.csplab.local dbamc-icp-worker4 nfs
172.16.52.200 dbamc-icp-boot.csplab.local dbamc-icp-boot boot

172.16.52.201 dbamc-icp-master1.csplab.local dbamc-icp-master1 master1
172.16.52.202 dbamc-icp-master2.csplab.local dbamc-icp-master2 master2
172.16.52.203 dbamc-icp-master3.csplab.local dbamc-icp-master3 master3

172.16.52.208 dbamc-icp-worker1.csplab.local dbamc-icp-worker1 worker1
172.16.52.209 dbamc-icp-worker2.csplab.local dbamc-icp-worker2 worker2
172.16.52.210 dbamc-icp-worker3.csplab.local dbamc-icp-worker3 worker3

172.16.52.206 dbamc-icp-proxy1.csplab.local dbamc-icp-proxy1 proxy1
172.16.52.207 dbamc-icp-proxy2.csplab.local dbamc-icp-proxy2 proxy2

172.16.52.204 dbamc-icp-mgmt1.csplab.local dbamc-icp-mgmt1 mgmt1
172.16.52.205 dbamc-icp-mgmt2.csplab.local dbamc-icp-mgmt2 mgmt2
```

## Configuring install parameters
Open the `./inventories/{ubuntu, redhat}/group_vars/all.yaml` file and provide the values for the different install parameters.
In particular, update the `config_yaml` variable to match the version of ICP you want to install.
Different files are available for different version under the `./conf/{ubuntu, redhat}` directory.

## Update the ICP configuration file
Depending on the ICP version you want to install, update the appropriate `./conf/{ubuntu, redhat}/config.xyz.yaml` file.
In particular, provide values for the `cluster_vip` and `proxy_vip` variables.

## Preparing the install
The prepare playbook covers a number of ancillary tasks: 
- `setup_yum`
- `setup_ip`
- `stop_firewall`
- `install_dependent_packages`
- `update_hosts`

```
ansible-playbook prepare.yaml -i inventories/{ubuntu, redhat}
```

## Installing
To install, run the following tasks from the install playbook in sequence:

- Setup the NFS server and mount the NFS folders
```
ansible-playbook install.yaml -i inventories/{ubuntu, redhat} --tags "mount_nfs"
```
- Install Docker
```
ansible-playbook install.yaml -i inventories/{ubuntu, redhat} --tags "install_docker"
```
- Load the ICP installation images on the boot node. This will take a while, so please be patient.
```
ansible-playbook install.yaml -i inventories/{ubuntu, redhat} --tags "load_icp_images"
```
- Load the ICP configuration to the ICP install folder
```
ansible-playbook install.yaml -i inventories/{ubuntu, redhat} --tags "load_icp_conf"
```
- Start the ICP Installation. Please note that this step may take more than an hour to complete. If you want to check the installation log, please login the boot node, and use `docker logs` to check the running container logs.
```
ansible-playbook install.yaml -i inventories/{ubuntu, redhat} --tags "install_icp"
```

## Adding or removing LDAP
You can optionally associate an LDAP directory to ICP cluster.
-  To on-board LDAP, run:
```
ansible-playbook ldap.yaml -i inventories/{ubuntu, redhat} --tags "on_board"
```
- To off-board LDAP, run:
```
ansible-playbook ldap.yaml -i inventories/{ubuntu, redhat} --tags "off_board"
```

## Uninstalling
The uninstall playbook is composed of: 
- `uninstall_icp` 
- `unmount_nfs`
- `remove_docker`
```
ansible-playbook uninstall.yaml -i inventories/{ubuntu, redhat}
```
