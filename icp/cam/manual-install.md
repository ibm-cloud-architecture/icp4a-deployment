## Prequsition

### Generate API Key
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

### Create PV folders in NFS
- Login NFS server and execute:
```
export_dir=/data/persistentvolumes/cam
 mkdir -p ${export_dir}/CAM_db ${export_dir}/CAM_terraform/cam-provider-terraform \
     ${export_dir}/CAM_logs/cam-provider-terraform \
     ${export_dir}/CAM_BPD_appdata/mysql \
     ${export_dir}/CAM_BPD_appdata/repositories \
     ${export_dir}/CAM_BPD_appdata/workspace
 chmod -R 2775 ${export_dir}/CAM_db ${export_dir}/CAM_logs \
     ${export_dir}/CAM_terraform ${export_dir}/CAM_BPD_appdata
 chown -R root:1000 ${export_dir}/CAM_logs \
     ${export_dir}/CAM_BPD_appdata
 chown -R root:1111 ${export_dir}/CAM_terraform \
     ${export_dir}/CAM_logs/cam-provider-terraform
 chown -R 999:999 ${export_dir}/CAM_BPD_appdata/mysql ${export_dir}/CAM_db 
```



## Install

### Create PV
```
cd /root/cam
kubectl apply -f pv.yaml
```

### Create secret
```
kubectl create secret docker-registry cam-docker-secret --docker-username=admin --docker-password=admin -n services
kubectl patch serviceaccount default -p '{"imagePullSecrets": [{"name": "cam-docker-secret"}]}' --namespace=services
```

### Download Helm Chart
```
curl -kLo /root/cam/ibm-cam-3.1.3.tgz https://dbamc.icp:8443/helm-repo/requiredAssets/ibm-cam-3.1.3.tgz
```

### Install CAM Helm Chart
```
helm install /root/cam/ibm-cam-3.1.3.tgz --name cam --namespace services --set license=accept,global.iam.deployApiKey=gWWji7Nf0qJCgSWOHAyzwCkD-86nRk7scPbuHz5Hp2Vw,image.repository=dbamc.icp:8500/services/,auditService.image.repository=dbamc.icp:8500/ibmcom/ --tls
```

## Uninstall

### Purge Helm Release
```
kubectl delete clusterservicebrokers.servicecatalog.k8s.io cam-broker
helm del cam --purge --tls
kubectl delete pod --grace-period=0 --force --namespace services -l release=cam
kubectl delete secret cam-docker-secret -n services
```

### delete pv and pvc
```
kubectl delete PersistentVolumeClaim cam-terraform-pv -n services
kubectl delete PersistentVolumeClaim cam-bpd-appdata-pv -n services
kubectl delete PersistentVolumeClaim cam-logs-pv -n services
kubectl delete PersistentVolumeClaim cam-mongo-pv -n services

cd /root/cam
kubectl delete -f pv.yaml
```

### clean pv nfs folder
```
ssh nfs
rm -Rf /data/export/CAM_db/*
```

  
## Trouble Shooting(cam-bpd-ui not available)
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