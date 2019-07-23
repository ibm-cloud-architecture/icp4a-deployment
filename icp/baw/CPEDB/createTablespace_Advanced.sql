-- ***************************************************************** 
--                                                                   
-- Licensed Materials - Property of IBM                              
--                                                                   
-- 5725-C94, 5725-C95, 5725-C96                                                          
--                                                                   
-- Copyright IBM Corp. 2012, 2014, 2018  All Rights Reserved.                    
--                                                                   
-- US Government Users Restricted Rights - Use, duplication or       
-- disclosure restricted by GSA ADP Schedule Contract with           
-- IBM Corp.
-- ***************************************************************** 

--                                                                   
-- ***************************************************************** 
-- IBM Content Navigator configuration table creation script
-- for DB2 LUW
-- *****************************************************************

-- Connect to db
CONNECT TO CPEDB;
 
--  Create a schema for the application to use
CREATE SCHEMA ICNSA AUTHORIZATION db2inst1;
-- Comments on the above statement. This is for sync. If the user who
-- creating the schema is the same as the one specified in db2inst1
-- this turns out to be a noop (the user who creates an object is already
-- authorized. This is generally the case in CMUI. If someone is manually
-- installing this, they *could* specify a different user. For sync, that
-- user must be able to create/drop tables in the schema for sync. The
-- 'AUTHORIZATION' directive accomplishes just that.
-- *****************************************************************
--  Create buffer pools and tablespaces for the application to use
CREATE Bufferpool WFICNTSBP IMMEDIATE SIZE AUTOMATIC PAGESIZE 32K;
CREATE Bufferpool WFICNTSTEMPBP IMMEDIATE SIZE 200 PAGESIZE 32K;
CREATE REGULAR TABLESPACE WFICNTS PAGESIZE 32 K 
	MANAGED BY AUTOMATIC STORAGE AUTORESIZE YES INITIALSIZE 20 M 
	INCREASESIZE 20 M BUFFERPOOL WFICNTSBP;
CREATE USER TEMPORARY TABLESPACE WFICNTSTEMP PAGESIZE 32K 
	MANAGED BY AUTOMATIC STORAGE BUFFERPOOL WFICNTSTEMPBP;
-- *****************************************************************

-- Close connection
CONNECT RESET;
-- BEGIN COPYRIGHT
-- *************************************************************************
--
--  Licensed Materials - Property of IBM
--  5725-C94, 5725-C95, 5725-C96
--  (C) Copyright IBM Corporation 2010, 2018. All Rights Reserved.
--  US Government Users Restricted Rights- Use, duplication or disclosure
--  restricted by GSA ADP Schedule Contract with IBM Corp.
--
-- *************************************************************************
-- END COPYRIGHT

-- Connect to db
CONNECT TO CPEDB;

-- Create Schema
CREATE SCHEMA TOSSA;
SET SCHEMA TOSSA;

-- Create 256MB GCD buffer pool
CREATE Bufferpool TOSSA_DATA_BP IMMEDIATE SIZE AUTOMATIC PAGESIZE 32K;
CREATE Bufferpool TOSSA_INDX_BP IMMEDIATE SIZE AUTOMATIC PAGESIZE 32K;

-- Create additional buffer pools
CREATE Bufferpool TOSSA_LOB_BP IMMEDIATE SIZE AUTOMATIC PAGESIZE 32K;
CREATE Bufferpool TOSSA_TEMP_BP IMMEDIATE SIZE AUTOMATIC PAGESIZE 32K;
CREATE Bufferpool TOSSA_SYS_BP IMMEDIATE SIZE AUTOMATIC PAGESIZE 32K;

CREATE STOGROUP TOSSADATA_SG ON '/home/db2inst1/db2inst1/CPEDB/TOSSA/datafs1', '/home/db2inst1/db2inst1/CPEDB/TOSSA/datafs2', '/home/db2inst1/db2inst1/CPEDB/TOSSA/datafs3';
CREATE STOGROUP TOSSAINDX_SG ON '/home/db2inst1/db2inst1/CPEDB/TOSSA/indexfs1', '/home/db2inst1/db2inst1/CPEDB/TOSSA/indexfs2';
CREATE STOGROUP TOSSALOB_SG ON '/home/db2inst1/db2inst1/CPEDB/TOSSA/lobfs1';

-- Create tablespaces
CREATE LARGE TABLESPACE TOSSA_DATA_TS PAGESIZE 32 K
MANAGED BY AUTOMATIC STORAGE
USING STOGROUP TOSSADATA_SG
EXTENTSIZE 16 OVERHEAD 10.5 PREFETCHSIZE 16 TRANSFERRATE 0.14
BUFFERPOOL TOSSA_DATA_BP DROPPED TABLE RECOVERY ON;

CREATE LARGE TABLESPACE TOSSA_IDX_TS PAGESIZE 32 K
MANAGED BY AUTOMATIC STORAGE
USING STOGROUP TOSSAINDX_SG
EXTENTSIZE 16 OVERHEAD 10.5 PREFETCHSIZE 16 TRANSFERRATE 0.14
BUFFERPOOL TOSSA_INDX_BP DROPPED TABLE RECOVERY ON;

CREATE LARGE TABLESPACE TOSSA_LOB_TS PAGESIZE 32 K
MANAGED BY AUTOMATIC STORAGE
USING STOGROUP TOSSALOB_SG
EXTENTSIZE 16 OVERHEAD 10.5 PREFETCHSIZE 16 TRANSFERRATE 0.14
BUFFERPOOL TOSSA_LOB_BP DROPPED TABLE RECOVERY ON;

CREATE USER TEMPORARY TABLESPACE TOSSA_TEMP_TS PAGESIZE 32 K
MANAGED BY AUTOMATIC STORAGE
EXTENTSIZE 16 OVERHEAD 10.5 PREFETCHSIZE 16 TRANSFERRATE 0.14
BUFFERPOOL TOSSA_TEMP_BP;

CREATE SYSTEM TEMPORARY TABLESPACE TOSSA_SYSTMP_TS PAGESIZE 32 K
MANAGED BY AUTOMATIC STORAGE
EXTENTSIZE 16 OVERHEAD 10.5 PREFETCHSIZE 16 TRANSFERRATE 0.14
BUFFERPOOL TOSSA_SYS_BP;

GRANT USE OF TABLESPACE TOSSA_DATA_TS TO user db2inst1;
GRANT USE OF TABLESPACE TOSSA_IDX_TS TO user db2inst1;
GRANT USE OF TABLESPACE TOSSA_LOB_TS TO user db2inst1;
GRANT USE OF TABLESPACE TOSSA_TEMP_TS TO user db2inst1;

--GRANT IMPLICIT_SCHEMA ON DATABASE TO user db2admin;


-- Optionally, grant GROUP access to tablespaces
-- GRANT CREATETAB,CONNECT ON DATABASE  TO GROUP DB2USERS;
-- GRANT USE OF TABLESPACE USERTEMP1 TO GROUP DB2USERS;
-- GRANT USE OF TABLESPACE USERSPACE1 TO GROUP DB2USERS;

-- Close connection
CONNECT RESET;
-- BEGIN COPYRIGHT
-- *************************************************************************
--
--  Licensed Materials - Property of IBM
--  5725-C94, 5725-C95, 5725-C96
--  (C) Copyright IBM Corporation 2010, 2018. All Rights Reserved.
--  US Government Users Restricted Rights- Use, duplication or disclosure
--  restricted by GSA ADP Schedule Contract with IBM Corp.
--
-- *************************************************************************
-- END COPYRIGHT

-- Connect to db
CONNECT TO CPEDB;

-- Create Schema
CREATE SCHEMA DOSSA;
SET SCHEMA DOSSA;

-- Create 256MB GCD buffer pool
CREATE Bufferpool DOSSA_DATA_BP IMMEDIATE SIZE AUTOMATIC PAGESIZE 32K;
CREATE Bufferpool DOSSA_INDX_BP IMMEDIATE SIZE AUTOMATIC PAGESIZE 32K;

-- Create additional buffer pools
CREATE Bufferpool DOSSA_LOB_BP IMMEDIATE SIZE AUTOMATIC PAGESIZE 32K;
CREATE Bufferpool DOSSA_TEMP_BP IMMEDIATE SIZE AUTOMATIC PAGESIZE 32K;
CREATE Bufferpool DOSSA_SYS_BP IMMEDIATE SIZE AUTOMATIC PAGESIZE 32K;

CREATE STOGROUP DOSSADATA_SG ON '/home/db2inst1/db2inst1/CPEDB/DOSSA/datafs1', '/home/db2inst1/db2inst1/CPEDB/DOSSA/datafs2', '/home/db2inst1/db2inst1/CPEDB/DOSSA/datafs3';
CREATE STOGROUP DOSSAINDX_SG ON '/home/db2inst1/db2inst1/CPEDB/DOSSA/indexfs1', '/home/db2inst1/db2inst1/CPEDB/DOSSA/indexfs2';
CREATE STOGROUP DOSSALOB_SG ON '/home/db2inst1/db2inst1/CPEDB/DOSSA/lobfs1';

-- Create tablespaces
CREATE LARGE TABLESPACE DOSSA_DATA_TS PAGESIZE 32 K
MANAGED BY AUTOMATIC STORAGE
USING STOGROUP DOSSADATA_SG
EXTENTSIZE 16 OVERHEAD 10.5 PREFETCHSIZE 16 TRANSFERRATE 0.14
BUFFERPOOL DOSSA_DATA_BP DROPPED TABLE RECOVERY ON;

CREATE LARGE TABLESPACE DOSSA_IDX_TS PAGESIZE 32 K
MANAGED BY AUTOMATIC STORAGE
USING STOGROUP DOSSAINDX_SG
EXTENTSIZE 16 OVERHEAD 10.5 PREFETCHSIZE 16 TRANSFERRATE 0.14
BUFFERPOOL DOSSA_INDX_BP DROPPED TABLE RECOVERY ON;

CREATE LARGE TABLESPACE DOSSA_LOB_TS PAGESIZE 32 K
MANAGED BY AUTOMATIC STORAGE
USING STOGROUP DOSSALOB_SG
EXTENTSIZE 16 OVERHEAD 10.5 PREFETCHSIZE 16 TRANSFERRATE 0.14
BUFFERPOOL DOSSA_LOB_BP DROPPED TABLE RECOVERY ON;

CREATE USER TEMPORARY TABLESPACE DOSSA_TEMP_TS PAGESIZE 32 K
MANAGED BY AUTOMATIC STORAGE
EXTENTSIZE 16 OVERHEAD 10.5 PREFETCHSIZE 16 TRANSFERRATE 0.14
BUFFERPOOL DOSSA_TEMP_BP;

CREATE SYSTEM TEMPORARY TABLESPACE DOSSA_SYSTMP_TS PAGESIZE 32 K
MANAGED BY AUTOMATIC STORAGE
EXTENTSIZE 16 OVERHEAD 10.5 PREFETCHSIZE 16 TRANSFERRATE 0.14
BUFFERPOOL DOSSA_SYS_BP;

GRANT USE OF TABLESPACE DOSSA_DATA_TS TO user db2inst1;
GRANT USE OF TABLESPACE DOSSA_IDX_TS TO user db2inst1;
GRANT USE OF TABLESPACE DOSSA_LOB_TS TO user db2inst1;
GRANT USE OF TABLESPACE DOSSA_TEMP_TS TO user db2inst1;

--GRANT IMPLICIT_SCHEMA ON DATABASE TO user db2admin;


-- Optionally, grant GROUP access to tablespaces
-- GRANT CREATETAB,CONNECT ON DATABASE  TO GROUP DB2USERS;
-- GRANT USE OF TABLESPACE USERTEMP1 TO GROUP DB2USERS;
-- GRANT USE OF TABLESPACE USERSPACE1 TO GROUP DB2USERS;

-- Close connection
CONNECT RESET;
