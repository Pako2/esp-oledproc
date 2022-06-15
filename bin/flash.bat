@ECHO OFF
cls

echo - [1] Flash I2C Generic Firmware
echo - [2] Flash SPI Generic Firmware
echo - [3] Flash I2C DEBUG Firmware
echo - [4] Flash SPI DEBUG Firmware
echo - [5] Erase the Firmware on ESP8266 by flashing empty file

set /p opt=Please choose an option eg. 1: 

2>NUL CALL :%opt%
IF ERRORLEVEL 1 CALL :DEFAULT_CASE

:1
  set /p com=Enter which COM Port your ESP is connected eg. COM1 COM2 COM7: 
  esptool.exe -vv -cd nodemcu -cb 921600 -cp %com% -ca 0x00000 -cf i2cgeneric.bin
  GOTO EXIT_CASE   
:2
  set /p com=Enter which COM Port your ESP is connected eg. COM1 COM2 COM7: 
  esptool.exe -vv -cd nodemcu -cb 921600 -cp %com% -ca 0x00000 -cf spigeneric.bin
  GOTO EXIT_CASE   
:3
  set /p com=Enter which COM Port your ESP is connected eg. COM1 COM2 COM7: 
  esptool.exe -vv -cd nodemcu -cb 921600 -cp %com% -ca 0x00000 -cf i2cdebug.bin
  GOTO EXIT_CASE
:4
  set /p com=Enter which COM Port your ESP is connected eg. COM1 COM2 COM7: 
  esptool.exe -vv -cd nodemcu -cb 921600 -cp %com% -ca 0x00000 -cf spidebug.bin
  GOTO EXIT_CASE
:5
  set /p com=Enter which COM Port your ESP is connected eg. COM1 COM2 COM7: 
  esptool.exe -vv -cd nodemcu -cb 921600 -cp %com% -ca 0x00000 -cf blank4mb.bin
  GOTO EXIT_CASE

:DEFAULT_CASE
  ECHO Unknown option "%opt%"
  GOTO END_CASE
:END_CASE
  VER > NUL # reset ERRORLEVEL
  GOTO :EOF # return from CALL
:EXIT_CASE
  exit


