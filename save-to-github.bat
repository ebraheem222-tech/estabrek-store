@echo off
title Estabrek - save to GitHub
cd /d "%~dp0"
if not exist ".tmp" mkdir ".tmp"
set LOG=%~dp0.tmp\save-to-github.log
echo Saving Estabrek storefront to GitHub... > "%LOG%"
where git >> "%LOG%" 2>&1 || (echo Git is not installed or not on PATH. >> "%LOG%" & type "%LOG%" & pause & exit /b 1)
for /f "delims=" %%b in ('git rev-parse --abbrev-ref HEAD') do set BRANCH=%%b
echo Branch: %BRANCH% >> "%LOG%"
git add -- estabrek-storefront start-storefront.bat save-to-github.bat >> "%LOG%" 2>&1
git reset -q -- estabrek-storefront/.env estabrek-storefront/.env.local >> "%LOG%" 2>&1
echo --- staged --- >> "%LOG%"
git diff --cached --stat >> "%LOG%" 2>&1
git diff --cached --quiet && (echo Nothing new to commit. >> "%LOG%") || git commit -q -m "Storefront: rose bag, wishlist and search; polish pass, seasons, collection worlds, themed pages" -m "Rose cart with WhatsApp order flow, coupon and delivery details; rose wishlist and search pages; product, category and contact pages in the rose theme; seasonal and collection 3D scenes; scroll-driven campaign video; persisted and animated theme colours; fonts, badges, trust bar and size guide." -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01HqXLUY4cPDuv4LNTBpBRYM" >> "%LOG%" 2>&1
echo --- push --- >> "%LOG%"
git push -u origin %BRANCH% >> "%LOG%" 2>&1 && (echo PUSH_OK >> "%LOG%") || (echo PUSH_FAILED >> "%LOG%")
git log -1 --oneline >> "%LOG%" 2>&1
git status --short --branch >> "%LOG%" 2>&1
type "%LOG%"
pause
