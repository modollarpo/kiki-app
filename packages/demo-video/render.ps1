Set-Location "C:\kiki-app\packages\demo-video"
$env:NODE_OPTIONS = "--max-old-space-size=4096"
& cmd /c "npx remotion render KIKIDemo C:\kiki-app\public\demo\kiki-demo.mp4 --codec h264 --concurrency 4 > C:\kiki-app\public\demo\render.log 2>&1"
