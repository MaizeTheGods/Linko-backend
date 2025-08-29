@echo off
echo [1/4] System: & ver & where node
echo [2/4] Node: & node -v & npm -v
echo [3/4] Tests: & node test.js & node minimal-server.js
echo [4/4] Debug: & set DEBUG=* & node src/server.js
pause