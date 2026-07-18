@echo off
cd /d C:\kiki-app
echo Starting ACR build at %date% %time%...
az acr build --registry kikiagentacr --image kiki-app:demo-v1 --image kiki-app:fix-latest-2 --file Dockerfile . > C:\kiki-app\acr-build.log 2>&1
echo Build finished at %date% %time% with exit code %ERRORLEVEL%
