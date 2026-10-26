@echo off
title Estabrek storefront (fast production preview)
cd /d "%~dp0estabrek-storefront"
echo Close the "npm run dev" window first - both use the same .next folder.
if not exist node_modules call npm.cmd install
echo Building the optimized site (about 1-2 minutes)...
call npm.cmd run build || (echo Build failed. & pause & exit /b 1)
echo.
echo Open http://localhost:3000  - pages now open at full speed.
call npm.cmd run start
pause
