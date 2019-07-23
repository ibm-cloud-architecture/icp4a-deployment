#!/bin/sh

# Get the source from github
mkdir /tmp/ansible_install
cd /tmp/ansible_install
git clone https://github.com/ansible/ansible.git
cd ./ansible

# Load needed packages and install
easy_install pip
pip install packaging
pip install -U setuptools
make install

# Verify and cleanup
ansible --version
[ $? -eq 0 ] && rm -rf /tmp/ansible_install



