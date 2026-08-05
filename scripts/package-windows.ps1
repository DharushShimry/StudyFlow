param(
  [string]$ReleaseDir = (Join-Path (Resolve-Path (Join-Path $PSScriptRoot '..')).Path 'public\releases')
)

$ErrorActionPreference = 'Stop'

$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$appName = 'StudyFlow'
$appDir = Join-Path $root "$appName-win32-x64"
$zipPath = Join-Path $ReleaseDir 'StudyFlow-Windows.zip'

# 1. Web build + nativefier desktop app (exact release command, self-contained)
& (Join-Path $PSScriptRoot 'build-nativefier.ps1')
if ($LASTEXITCODE -ne 0) { throw 'Nativefier build failed.' }

# 2. Portable ZIP (extract and run anywhere — no install needed)
New-Item -ItemType Directory -Force -Path $ReleaseDir | Out-Null
if (Test-Path $zipPath) {
  Remove-Item $zipPath -Force
}
if (Test-Path $appDir) {
  Compress-Archive -Path (Join-Path $appDir '*') -DestinationPath $zipPath -CompressionLevel Optimal -Force
  Write-Host "Portable ZIP ready at $zipPath"
}

# 3. Windows installer (Inno Setup) — also copies .exe into public/releases
try {
  & (Join-Path $PSScriptRoot 'build-windows-installer.ps1')
  if ($LASTEXITCODE -ne 0) { throw 'Installer build failed.' }
} catch {
  Write-Warning $_.Exception.Message
  Write-Host 'Installer script is ready at installer/StudyFlow.iss, but Inno Setup is required to compile the .exe installer.'
}

# 4. Rebuild the web app AFTER publishing, so dist\releases serves the fresh
#    installer + zip to website visitors.
Push-Location $root
try {
  npm run build
  if ($LASTEXITCODE -ne 0) { throw 'Final npm run build failed.' }
}
finally {
  Pop-Location
}

Write-Host "All release artifacts are in $ReleaseDir"
