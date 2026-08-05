param(
  [string]$InstallerScript = (Join-Path $PSScriptRoot '..\installer\StudyFlow.iss')
)

$ErrorActionPreference = 'Stop'

$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path

$candidates = @(
  (Join-Path ${env:ProgramFiles(x86)} 'Inno Setup 6\ISCC.exe'),
  (Join-Path $env:ProgramFiles 'Inno Setup 6\ISCC.exe')
) | Where-Object { $_ -and (Test-Path $_) }

if ($candidates.Count -eq 0) {
  throw "Inno Setup 6 was not found. The installer definition is ready at $InstallerScript, but you need Inno Setup to compile it."
}

$compiler = $candidates[0]
& $compiler $InstallerScript
if ($LASTEXITCODE -ne 0) {
  throw "Inno Setup compiler failed with exit code $LASTEXITCODE"
}

# The .iss OutputDir=Output is relative to the script folder
$outputDir = Join-Path (Split-Path $InstallerScript) 'Output'
if (-not (Test-Path $outputDir)) {
  throw "Expected installer output in $outputDir but it does not exist."
}

# Copy every produced installer into public/releases so the website can serve it
$releaseDir = Join-Path $root 'public\releases'
New-Item -ItemType Directory -Force -Path $releaseDir | Out-Null
Get-ChildItem $outputDir -Filter '*.exe' | ForEach-Object {
  Copy-Item $_.FullName (Join-Path $releaseDir $_.Name) -Force
  Write-Host "Published $($_.Name) to public\releases"
}
