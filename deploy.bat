@echo off
echo.
echo ==================================
echo   AIDB Deploy
echo ==================================
echo.

cd /d %~dp0

echo [1/3] Git push...
git add -A
git commit -m "deploy"
git push
if %errorlevel% neq 0 (
    echo [ERROR] git push failed
    pause
    exit /b 1
)
echo [DONE] git push OK
echo.

echo [2/3] NAS build...
ssh hlabsoft@192.168.0.111 "cd /volume1/docker/aidb && curl -sL https://github.com/hlabceo/aidb/archive/refs/heads/master.tar.gz | tar xz --strip-components=1 && sudo docker-compose build --no-cache"
if %errorlevel% neq 0 (
    echo [ERROR] NAS build failed
    pause
    exit /b 1
)
echo [DONE] build OK
echo.

echo [3/3] Restart service...
ssh hlabsoft@192.168.0.111 "cd /volume1/docker/aidb && sudo docker-compose up -d"
echo [DONE] service restarted
echo.

echo ==================================
echo   Deploy complete!
echo   http://192.168.0.111:3000
echo ==================================
echo.
pause
