@echo off
title Estabrek storefront (dev)
cd /d "%~dp0estabrek-storefront"
if not exist node_modules call npm.cmd install
call npm.cmd run dev
pause
