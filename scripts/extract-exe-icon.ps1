param([string]$ExePath, [string]$OutDir)

Add-Type -AssemblyName System.Drawing

if (-not (Test-Path $ExePath)) { Write-Output "EXE NOT FOUND: $ExePath"; exit 1 }
if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Path $OutDir -Force | Out-Null }

$icon = [System.Drawing.Icon]::ExtractAssociatedIcon($ExePath)
if (-not $icon) { Write-Output "NO ICON EXTRACTED"; exit 1 }

$bmp = $icon.ToBitmap()
$pngPath = Join-Path $OutDir ((Get-Item $ExePath).BaseName + "-icon.png")
$bmp.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)

$icoPath = Join-Path $OutDir ((Get-Item $ExePath).BaseName + "-icon.ico")
$fs = [System.IO.File]::OpenWrite($icoPath)
$icon.Save($fs)
$fs.Close()

$pngHash = (Get-FileHash $pngPath -Algorithm SHA256).Hash
$icoHash = (Get-FileHash $icoPath -Algorithm SHA256).Hash

Write-Output "SIZE: $($bmp.Width)x$($bmp.Height)"
Write-Output "PNG_HASH: $pngHash"
Write-Output "ICO_HASH: $icoHash"
Write-Output "FILES: $pngPath | $icoPath"
