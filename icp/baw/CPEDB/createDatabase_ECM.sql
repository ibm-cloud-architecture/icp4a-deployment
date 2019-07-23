-- BEGIN COPYRIGHT
-- *************************************************************************
--
--  Licensed Materials - Property of IBM
--  5725-C94, 5725-C95, 5725-C96
--  (C) Copyright IBM Corporation 2018. All Rights Reserved.
--  US Government Users Restricted Rights- Use, duplication or disclosure
--  restricted by GSA ADP Schedule Contract with IBM Corp.
--
-- *************************************************************************
-- END COPYRIGHT

-- Create the database:
CREATE DATABASE CPEDB
USING CODESET UTF-8 TERRITORY US COLLATE
USING
 SYSTEM PAGESIZE 32768 CATALOG TABLESPACE MANAGED BY SYSTEM USING ('/home/db2inst1/db2inst1/CPEDB/sys')
 TEMPORARY TABLESPACE MANAGED BY SYSTEM USING ('/home/db2inst1/db2inst1/CPEDB/systmp')
 USER TABLESPACE MANAGED BY SYSTEM USING ('/home/db2inst1/db2inst1/CPEDB/usr')
;


-- Increase the application heap size
UPDATE DB CFG FOR CPEDB USING APPLHEAPSZ 2560;

-- Connect to db
CONNECT TO CPEDB;

-- Drop unnecessary default tablespaces
DROP TABLESPACE USERSPACE1;

UPDATE DB CFG FOR CPEDB USING LOGFILSIZ 16384 DEFERRED;
UPDATE DB CFG FOR CPEDB USING LOGSECOND 64 IMMEDIATE;

GRANT CREATETAB,CONNECT,DBADM ON DATABASE TO user db2inst1;
GRANT SELECT ON SYSIBM.SYSVERSIONS TO user db2inst1;
GRANT SELECT ON SYSCAT.DATATYPES TO user db2inst1;
GRANT USAGE on WORKLOAD SYSDEFAULTUSERWORKLOAD TO user db2inst1;
UPDATE DB CFG FOR CPEDB USING NEWLOGPATH '/home/db2inst1/db2inst1/CPEDB/log' DEFERRED;
ALTER BUFFERPOOL IBMDEFAULTBP IMMEDIATE SIZE 250 AUTOMATIC;

-- Close connection
CONNECT RESET;
