-- BEGIN COPYRIGHT
-- *************************************************************************
--
--  Licensed Materials - Property of IBM
--  5725-C94, 5725-C95, 5725-C96
--  (C) Copyright IBM Corporation 2010, 2017. All Rights Reserved.
--  US Government Users Restricted Rights- Use, duplication or disclosure
--  restricted by GSA ADP Schedule Contract with IBM Corp.
--
-- *************************************************************************
-- END COPYRIGHT

-- create the database:
create database PDWDB automatic storage yes  using codeset UTF-8 territory US pagesize 32768;

-- connect to the created database:
connect to PDWDB;

-- A user temporary tablespace is required to support stored procedures in BPM.
CREATE USER TEMPORARY TABLESPACE USRTMPSPC1;

UPDATE DB CFG FOR PDWDB USING LOGFILSIZ 16384 DEFERRED;
UPDATE DB CFG FOR PDWDB USING LOGSECOND 64 IMMEDIATE;

-- The following grant is used for databases without enhanced security.
-- For more information, review the IBM Knowledge Center for Enhancing Security for DB2.
grant dbadm on database to user db2inst1;

connect reset;
