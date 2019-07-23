#!/bin/sh
#BEGIN COPYRIGHT
#*************************************************************************
#
# Licensed Materials - Property of IBM
# 5725-C94, 5725-C95, 5725-C96
# (C) Copyright IBM Corporation 2013, 2018. All Rights Reserved.
# US Government Users Restricted Rights- Use, duplication or disclosure
# restricted by GSA ADP Schedule Contract with IBM Corp.
#
#*************************************************************************
#END COPYRIGHT
mkdir -p @DB_DIR@/CPEDB/DOSSA/datafs1
mkdir -p @DB_DIR@/CPEDB/DOSSA/datafs2
mkdir -p @DB_DIR@/CPEDB/DOSSA/datafs3
mkdir -p @DB_DIR@/CPEDB/DOSSA/indexfs1
mkdir -p @DB_DIR@/CPEDB/DOSSA/indexfs2
mkdir -p @DB_DIR@/CPEDB/DOSSA/lobfs1
mkdir -p @DB_DIR@/CPEDB/TOSSA/datafs1
mkdir -p @DB_DIR@/CPEDB/TOSSA/datafs2
mkdir -p @DB_DIR@/CPEDB/TOSSA/datafs3
mkdir -p @DB_DIR@/CPEDB/TOSSA/indexfs1
mkdir -p @DB_DIR@/CPEDB/TOSSA/indexfs2
mkdir -p @DB_DIR@/CPEDB/TOSSA/lobfs1
mkdir -p @DB_DIR@/CPEDB/sys
mkdir -p @DB_DIR@/CPEDB/systmp
mkdir -p @DB_DIR@/CPEDB/usr
mkdir -p @DB_DIR@/CPEDB/log

chmod -R 777 @DB_DIR@/CPEDB

db2 -stf "./createDatabase_ECM.sql"
exit $?
