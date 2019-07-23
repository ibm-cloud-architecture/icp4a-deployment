@REM BEGIN COPYRIGHT
@REM *************************************************************************
@REM 
@REM  Licensed Materials - Property of IBM
@REM  5725-C94, 5725-C95, 5725-C96
@REM  (C) Copyright IBM Corporation 2013, 2018. All Rights Reserved.
@REM  US Government Users Restricted Rights- Use, duplication or disclosure
@REM  restricted by GSA ADP Schedule Contract with IBM Corp.
@REM 
@REM *************************************************************************
@REM END COPYRIGHT
@echo off
md @DB_DIR@\CPEDB\DOSSA\datafs1
md @DB_DIR@\CPEDB\DOSSA\datafs2
md @DB_DIR@\CPEDB\DOSSA\datafs3
md @DB_DIR@\CPEDB\DOSSA\indexfs1
md @DB_DIR@\CPEDB\DOSSA\indexfs2
md @DB_DIR@\CPEDB\DOSSA\lobfs1
md @DB_DIR@\CPEDB\TOSSA\datafs1
md @DB_DIR@\CPEDB\TOSSA\datafs2
md @DB_DIR@\CPEDB\TOSSA\datafs3
md @DB_DIR@\CPEDB\TOSSA\indexfs1
md @DB_DIR@\CPEDB\TOSSA\indexfs2
md @DB_DIR@\CPEDB\TOSSA\lobfs1	
md @DB_DIR@\CPEDB\sys
md @DB_DIR@\CPEDB\systmp
md @DB_DIR@\CPEDB\usr
md @DB_DIR@\CPEDB\log

setlocal

if #%1 == # goto withoutParams
db2cmd /c /w /i db2 -stf "%1/createDatabase_ECM.sql"
goto end

:withoutParams
db2cmd /c /w /i db2 -stf "./createDatabase_ECM.sql"

:end
set RC=%ERRORLEVEL%

endlocal & exit /b %RC%
