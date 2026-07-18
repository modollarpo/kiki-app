@echo off
cd /d C:\kiki-app\packages\demo-video
npx remotion render KIKIDemo C:\kiki-app\public\demo\kiki-demo.mp4 --codec h264 --concurrency 4
echo DONE
