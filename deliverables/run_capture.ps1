$ErrorActionPreference = "Continue"
Set-Location C:\kiki-app

$dev = Start-Process -FilePath "cmd.exe" -ArgumentList "/c","npm run dev > C:\kiki-app\deliverables\dev-out.log 2>&1" -PassThru -WindowStyle Hidden
Write-Host "dev pid" $dev.Id

# Wait for health
$ready = $false
for ($i = 0; $i -lt 40; $i++) {
  Start-Sleep -Seconds 5
  try {
    $r = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -UseBasicParsing -TimeoutSec 8
    if ($r.StatusCode -eq 200) { $ready = $true; break }
  } catch { }
}
Write-Host "ready:" $ready

if ($ready) {
  node deliverables\capture2.mjs 2>&1
}

Write-Host "=== stopping dev ==="
Stop-Process -Id $dev.Id -Force -ErrorAction SilentlyContinue
Get-Process node -ErrorAction SilentlyContinue | Where-Object { $_.StartTime -gt (Get-Date).AddMinutes(-30) } | Stop-Process -Force -ErrorAction SilentlyContinue
