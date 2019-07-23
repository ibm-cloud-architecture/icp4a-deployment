## Manual IBM Event Streams install

### Documentation

- [Installing on IBM Cloud Private](https://ibm.github.io/event-streams/installing/installing/)
- [Setup your own BAI on Fyre](https://ibm.ent.box.com/notes/310779262936?s=2zi48y2vlwa8u9cm4p4jrbr72r8xe4xd)

### Download the IBM Event Streams archive
```
wget https://ak-dsw-mul.dhe.ibm.com/sdfdl/v2/fulfill/CC0M9ML/Xa.2/Xb.htcOMovxHCAgZGSLFFFrixSwz6G87F5t/Xc.CC0M9ML/eventstreams.2019.1.1.z_x86.pak.tar.gz/Xd./Xf.lPr.D1VK/Xg.10235872/Xi./XY.knac/XZ.a0OdRaHxDDPPT0iyrLtUhoY8MIQ/eventstreams.2019.1.1.z_x86.pak.tar.gz#anchor

```

### Load Helm chart
```
cloudctl catalog load-archive --archive eventstreams.2019.1.1.z_x86.pak.tar.gz --registry dbamc.icp:8500/event-streams
```

### Create namespace
```
kubectl create namespace event-streams
kubectl -n event-streams create rolebinding ibm-restricted-clustrrole-rolebinding --clusterrole=ibm-restricted-clusterrole --group=system:serviceaccounts:event-streams
```


### Create secret and image policy
```
kubectl create secret docker-registry regcred --docker-server=dbamc.icp:8500 --docker-username=admin --docker-password=admin -n event-streams
cd /root/bai/ibm-event-streams
kubectl apply -f image-policy.yaml
kubectl patch serviceaccount default -p '{"imagePullSecrets": [{"name": "regcred"}]}' --namespace=event-streams
```

### Create PV folders on NFS
```
mkdir -p /storage/persistentvolumes/kafka/kafka-my-bai-pv-0
mkdir -p /storage/persistentvolumes/kafka/kafka-my-bai-pv-1
mkdir -p /storage/persistentvolumes/kafka/kafka-my-bai-pv-2
mkdir -p /storage/persistentvolumes/kafka/kafka-my-bai-pv-3
mkdir -p /storage/persistentvolumes/kafka/kafka-my-bai-pv-4
mkdir -p /storage/persistentvolumes/kafka/kafka-my-bai-pv-5

chown 65534 /storage/persistentvolumes/kafka/kafka-my-bai-pv-*
chmod u+rw /storage/persistentvolumes/kafka/kafka-my-bai-pv-*
```

### Create PV on ICP cluster
```
cd /root/bai/ibm-event-streams
kubectl apply -f pv.yaml
```

### Install Helm chart
```
curl -kLo /root/ibm-eventstreams-prod-1.2.0.tgz  https://dbamc.icp:8443/helm-repo/requiredAssets/ibm-eventstreams-prod-1.2.0.tgz
helm install /root/ibm-eventstreams-prod-1.2.0.tgz --name ibm-eventstreams --namespace event-streams --set license=accept,global.image.repository=dbamc.icp:8500/event-streams/,global.image.pullSecret=regcred,kafka.resources.limits.cpu=500m,kafka.resources.limits.memory=1Gi,kafka.resources.requests.cpu=500m,kafka.resources.requests.memory=1Gi,persistence.enabled=true,persistence.dataPVC.size=4Gi,zookeeper.resources.limits.cpu=80m,zookeeper.resources.requests.cpu=80m,zookeeper.persistence.enabled=true,zookeeper.dataPVC.size=4Gi --tls
```

### Uninstall Heml Chart
```
helm delete ibm-eventstreams --purge --tls
kubectl delete pvc -l release=ibm-eventstreams -n event-streams
kubectl delete namespace event-streams
cd /root/bai/ibm-event-streams
kubectl delete -f pv.yaml
kubectl delete secret ibm-eventstreams-ibm-es-secret-copy-secret -n kube-system
```

### Troubleshooting
- Failed to pull image : rpc error: code = 2 desc = net/http: request canceled
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

- Warning  Failed  36m (x12 over 38m)     kubelet, 172.16.52.229  Error: Couldn't find key eventstreams-ibm-eventstreams-api-key in Secret event-streams/ibm-eventstreams-ibm-es-iam-secret
