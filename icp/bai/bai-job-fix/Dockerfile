FROM dbamc.icp:8500/default/bai-ibacc-job:19.0.1

RUN mkdir -p /opt/ibm/icp/playbooks/scripts/helm-certs
COPY inithelmforicp.yml /opt/ibm/icp/playbooks/tasks/icp/inithelmforicp.yml
COPY ca.pem /opt/ibm/icp/playbooks/scripts/helm-certs/ca.pem
COPY cert.pem /opt/ibm/icp/playbooks/scripts/helm-certs/cert.pem
COPY key.pem /opt/ibm/icp/playbooks/scripts/helm-certs/key.pem
