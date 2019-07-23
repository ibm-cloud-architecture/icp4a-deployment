## NFS

```
mkdir -p /data/persistentvolumes/bai/bai-pv
sudo chown 9999:9999 /data/persistentvolumes/bai/bai-pv
sudo chmod 770 /data/persistentvolumes/bai/bai-pv

mkdir -p /data/persistentvolumes/bai/ek-pv-1
mkdir -p /data/persistentvolumes/bai/ek-pv-2
mkdir -p /data/persistentvolumes/bai/ek-pv-3
sudo chown 1000:1000 /data/persistentvolumes/bai/ek-pv-1
sudo chown 1000:1000 /data/persistentvolumes/bai/ek-pv-2
sudo chown 1000:1000 /data/persistentvolumes/bai/ek-pv-3
sudo chmod 770 /data/persistentvolumes/bai/ek-pv-1
sudo chmod 770 /data/persistentvolumes/bai/ek-pv-2
sudo chmod 770 /data/persistentvolumes/bai/ek-pv-3


mkdir /data/persistentvolumes/bai/es-snapshot-pv
sudo chown 1000:1000 /data/persistentvolumes/bai/es-snapshot-pv
sudo chmod 770 /data/persistentvolumes/bai/es-snapshot-pv

kubectl apply -f pv.yaml
kubectl delete -f pv.yaml
```

## IBM Event Streams topics
Once IBM Event Streams is up and running, got to the admin UI and create the three following topics:

- `event-streams-test1-ibm-bai-ingress`
- `event-streams-test1-ibm-bai-egress` (optional only used if you set egress settings to true in BAI installation)
- `event-streams-test1-ibm-bai-service`

## IBM Event Stream Certification

```
LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSURSakNDQWk2Z0F3SUJBZ0lJRmF0aHBOQlgwNlV3RFFZSktvWklodmNOQVFFTEJRQXdLakVNTUFvR0ExVUUKQ2hNRFNVSk5NUm93R0FZRFZRUUxFeEZKUWswZ1JYWmxiblFnVTNSeVpXRnRjekFlRncweE9UQTJNalV3TnpVdwpOVFphRncweU9UQTJNakl3TnpVd05UWmFNQ294RERBS0JnTlZCQW9UQTBsQ1RURWFNQmdHQTFVRUN4TVJTVUpOCklFVjJaVzUwSUZOMGNtVmhiWE13Z2dFaU1BMEdDU3FHU0liM0RRRUJBUVVBQTRJQkR3QXdnZ0VLQW9JQkFRQy8KNzlvZ3ozQmtGVlovWFRMMVgrY0N5ejZ0L21BQzZYYzV1NFZsbmNOL2RoNktEaVVBTWErZDI5RHFZYjVkQ0RFdgp6ZlNUTUJWaFFqQTR5REdmNFBTWFFuU1p0VE90eHZBWDAvMlpkNXNHRWludU9pc29hbktWU2dzaXJqbEdYakNSCk80TUhiUVhzUVdsM2M2bHlIRW9GV2NPODViWWU2VXg1WFlZL1dOWTdoS01JaUxvNXRFRGZjbTRFeFZTK1JnaHoKcXN5UmVMKzE3aTZZRzJyRUV5OEJodTIvWmlPSEsrR0ZNRk85WkZab2p4U3lBdXVwUno2VktiL3h5cjc2cndBNwplM014bk9ORzJXamlpakhuWUJ2c00vM1Fwd0dmUHlEKzdQM0p2Y2RLK3VxYVFsYUR1UnpLNFNudS9NQXM2cGwzCnhqaHBQdzJaOHA2VU5vUkxVa29IQWdNQkFBR2pjREJ1TUE0R0ExVWREd0VCL3dRRUF3SUJwakFQQmdOVkhSTUIKQWY4RUJUQURBUUgvTUVzR0ExVWRFUVJFTUVLQ0NXUmlZVzFqTG1samNJSXBaR0poYldNdWFXTndMbVYyWlc1MApMWE4wY21WaGJYTXVjM1pqTG1Oc2RYTjBaWEl1Ykc5allXeUhCS3dRTk5lSEJLd1FOTmd3RFFZSktvWklodmNOCkFRRUxCUUFEZ2dFQkFFZ3YyZmVZSVlVZ3RPSDlKeC9XQk94NXBxbGRBVmVlajd5aHUwbG5BZkFyY1dqc2JUd1kKMURlYjVicHAzV2hEOUpmVkZFcHA5UWZOd2xGNDFIZlN1SjkwTFd3YjFjTTF2MnhKaExYSkhPSlNkdklESExUVQpjNXh3cmZMcExHRFVFZkRmTzB5eUN3YzFRMkx4ZW9LT0ZUNzNOUVRudUgyMXRnS1QxdzFsZzFmWUVuVUVOMTRECk85VGlmc05RRmtINjRoczRNVHJ1VVN5alc1SUxzT0dIeW9jY0ZvRXFrbTlJSUJPR1Buc2gyWURJSGdDbnczdnEKZVN0TWFydFVPbHBrbVBDRnNqakVHUW5mczI0dnE3YkF4aVBNdXA2bW1UOGtZM2ZJazYyKzNZMmM2aG5JMGIzRAp4ZnhXaFNVTFNLenhrOEFkQ0V4TTNpdEJ5NE8weTlUeDIwbz0KLS0tLS1FTkQgQ0VSVElGSUNBVEUtLS0tLQo=
```

## IBM Event Streams Bootstrap servers

- bootstrap: 172.16.52.216:32254
- brk0: 172.16.52.216:31027
- brk1: 172.16.52.216:31571
- brk2: 172.16.52.216:30457

```
curl -kLo es-plugin https://172.16.52.216:30353/CLI/linux
cloudctl plugin install ./es-plugin
```

- Apache Kafka bootstrap: 172.16.52.216:32254

## Apache Flink

The use of Hadoop Distributed File System (HDFS) is optional. It is not used in this Getting started. HDFS can be enabled as a post-installation step. For more information, see Advanced updates.

## set psp

```
kubectl -n dbamc-test2 create rolebinding ibm-anyuid-clustrrole-rolebinding --clusterrole=ibm-anyuid-clusterrole --group=system:serviceaccounts:dbamc-test2

kubectl apply -f psp.yaml -n dbamc-test2
```

## Remove
```
helm delete dbamc-bai --purge --tls
```

## Fix Helm certification
```
docker pull dbamc.icp:8500/default/bai-ibacc-job:19.0.1
docker run -ti --name test_bai_job dbamc.icp:8500/default/bai-ibacc-job:19.0.1 bash

cd bai-job-fix
docker build . -t dbamc.icp:8500/default/bai-ibacc-job:19.0.1-fix-helm
docker push dbamc.icp:8500/default/bai-ibacc-job:19.0.1-fix-helm
docker run -ti --name test_bai_job2 dbamc.icp:8500/default/bai-ibacc-job:19.0.1-fix-helm bash
```

## Fix the Ansible script

```
docker cp k8s_ibm-dba-multicloud-prod_dbamc-test2-ibm-dba-multicloud-prod-7445cc896-2qrnp_dbamc-test2_7c6d1450-9bca-11e9-a668-005056a547aa_0:/opt/ibm/ibacc/dbamc_staging_deploy/cfg/ibacc-provision-bai-job.yml ./

docker cp ./ibacc-provision-bai-job.yml k8s_ibm-dba-multicloud-prod_dbamc-test2-ibm-dba-multicloud-prod-7445cc896-2qrnp_dbamc-test2_7c6d1450-9bca-11e9-a668-005056a547aa_0:/opt/ibm/ibacc/dbamc_staging_deploy/cfg/ibacc-provision-bai-job.yml 

docker cp k8s_ibm-dba-multicloud-prod_dbamc-test2-ibm-dba-multicloud-prod-7445cc896-2qrnp_dbamc-test2_7c6d1450-9bca-11e9-a668-005056a547aa_0:/opt/ibm/ibacc/dbamc_staging_deploy/cfg/jobs.yml ./

docker cp ./jobs.yml k8s_ibm-dba-multicloud-prod_dbamc-test2-ibm-dba-multicloud-prod-7445cc896-2qrnp_dbamc-test2_7c6d1450-9bca-11e9-a668-005056a547aa_0:/opt/ibm/ibacc/dbamc_staging_deploy/cfg/jobs.yml 

docker cp k8s_ibm-dba-multicloud-prod_dbamc-test2-ibm-dba-multicloud-prod-7445cc896-2qrnp_dbamc-test2_7c6d1450-9bca-11e9-a668-005056a547aa_0:/opt/ibm/ibacc/dbamc_staging_deploy/cfg/logs/bai-ICp/ibacc.log ./
```

