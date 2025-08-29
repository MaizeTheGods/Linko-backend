@echo off
echo [3/4] Tests: & node test.js & node minimal-server.js
echo [4/4] Debug: & set DEBUG=* & node src/server.js
pause