$ErrorActionPreference = 'Stop'

# Builds the StudyFlow desktop app with the exact command used for the release:
#   nativefier --name StudyFlow --icon src\Media\icon.ico --single-instance
#             --disable-dev-tools --maximize "file:///.../dist/index.html"
#
# After packaging, the web build (dist\) is bundled INSIDE the app and the target
# URL is switched to a relative "file://app/..." reference so the app works on
# any machine, not just this one. Output: StudyFlow-win32-x64\ at the project root
# (this matches the MyAppFolder path in installer\StudyFlow.iss).

$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$appName = 'StudyFlow'
$icon = Join-Path $root 'src\Media\icon.ico'
$targetUrl = 'file:///' + ($root -replace '\\', '/' -replace ' ', '%20') + '/dist/index.html'
$appDir = Join-Path $root "$appName-win32-x64"

# 1. Fresh web build
Push-Location $root
try {
  npm run build
}
finally {
  Pop-Location
}
if ($LASTEXITCODE -ne 0) {
  throw "npm run build failed with exit code $LASTEXITCODE"
}

# 2. Nativefier (exact release command)
& nativefier `
  --name $appName `
  --icon $icon `
  --single-instance `
  --disable-dev-tools `
  --maximize `
  $targetUrl

if ($LASTEXITCODE -ne 0) {
  throw "Nativefier failed with exit code $LASTEXITCODE"
}

if (-not (Test-Path (Join-Path $appDir 'StudyFlow.exe'))) {
  throw "Nativefier did not produce $appDir\StudyFlow.exe"
}

# 3. Bundle the web build inside the app and switch to a relative target URL.
#    Exclude dist\releases (installer + zip) — bundling those into the app
#    would recursively bloat every subsequent installer.
$appDist = Join-Path $appDir 'resources\app\dist'
Copy-Item -Recurse -Force (Join-Path $root 'dist') $appDist
$releaseInside = Join-Path $appDist 'releases'
if (Test-Path $releaseInside) {
  Remove-Item -Recurse -Force $releaseInside
}

$mainJs = Join-Path $appDir 'resources\app\lib\main.js'
$nativefierJson = Join-Path $appDir 'resources\app\nativefier.json'

# Patch the target URL to a relative "file://app/" reference.
# Use a targeted string replace (not ConvertTo-Json) to avoid BOM and
# scientific-notation issues that would corrupt the config.
$configText = Get-Content $nativefierJson -Raw
$configText = [regex]::Replace($configText, '"targetUrl":"[^"]*"', '"targetUrl":"file://app/dist/index.html"')
[System.IO.File]::WriteAllText($nativefierJson, $configText)

# Patch main.js so "file://app/..." resolves relative to the app directory
$js = Get-Content $mainJs -Raw
$oldBlock = "    if (appArgs.targetUrl) {`n        await mainWindow.loadURL(appArgs.targetUrl);"
# Backslashes are literal in PowerShell double-quoted strings, so avoid regexes.
# In the JS, split('\\') splits on one backslash and join('/') makes a file URL.
$newBlock = "    if (appArgs.targetUrl) {`n        var targetUrl = appArgs.targetUrl.startsWith('file://app/') ? 'file://' + path.join(__dirname, '..', appArgs.targetUrl.slice('file://app/'.length)).split('\\').join('/') : appArgs.targetUrl;`n        await mainWindow.loadURL(targetUrl);"
if ($js.Contains($oldBlock)) {
  $js = $js.Replace($oldBlock, $newBlock)
  # Write without BOM so the webpack bundle stays byte-identical apart from the patch
  [System.IO.File]::WriteAllText($mainJs, $js)
} else {
  Write-Warning 'main.js targetUrl block not found — skipping patch (check the app still loads dist correctly).'
}

Write-Host "Desktop app ready at $appDir"
