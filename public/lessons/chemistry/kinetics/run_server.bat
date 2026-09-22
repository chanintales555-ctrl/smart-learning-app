@echo off
chcp 65001 > nul
echo ========================================================
echo   เปิดสื่อการสอน 3D Chemical Kinetics Scrollytelling
echo ========================================================
echo.
echo กำลังเปิดหน้าเว็บในเบราว์เซอร์...
start "" "%~dp0index.html"
echo สำเร็จ! หากต้องการรันผ่าน Local HTTP Server ให้ใช้คำสั่ง npx serve หรือดับเบิลคลิกไฟล์ index.html ได้เลยครับ
pause
