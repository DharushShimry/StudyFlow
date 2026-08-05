<#
.SYNOPSIS
  Publishes the release artifacts in public\releases to a GitHub Release.

.DESCRIPTION
  Uploads every artifact (installer .exe, portable .zip and their .sha256
  checksums) to the given GitHub Release. Uses the GitHub CLI (gh) when it is
  installed; otherwise falls back to the REST API with a GITHUB_TOKEN. Files
  are uploaded by name, so re-running replaces the same artifacts (GitHub
  overwrites same-named assets).

  Why GitHub Releases? The binaries exceed GitHub's 100 MB per-file repo limit,
  so they can never be committed and deployed through Netlify's git-based
  builds. GitHub Releases allows assets up to 2 GB each, and the download links
  in the app/website point at /releases/latest/download/<file>.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\publish-github-release.ps1

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\publish-github-release.ps1 -Tag v1.1.0 -Repo DharushShimry/StudyFlow
#>
param(
  [string]$Repo = 'DharushShimry/StudyFlow',
  [string]$Tag = 'v1.0.0',
  [string]$ReleaseDir = (Join-Path (Resolve-Path (Join-Path $PSScriptRoot '..')).Path 'public\releases')
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path $ReleaseDir)) {
  throw "Release directory not found: $ReleaseDir — run 'npm run windows:package' first."
}

$files = Get-ChildItem $ReleaseDir -File | Where-Object { $_.Name -match '\.(exe|zip|sha256)$' }
if ($files.Count -eq 0) {
  throw "No release artifacts (.exe / .zip / .sha256) found in $ReleaseDir"
}

$releasePage = "https://github.com/$Repo/releases/tag/$Tag"

# --- Method 1: GitHub CLI ---
$gh = Get-Command gh -ErrorAction SilentlyContinue
if ($gh) {
  Write-Host "Uploading $($files.Count) artifact(s) to $Repo release '$Tag' via gh CLI:"
  foreach ($f in $files) {
    Write-Host "  -> $($f.Name) ($([math]::Round($f.Length / 1MB, 1)) MB)"
  }
  & gh release upload $Tag $files.FullName --repo $Repo --clobber
  if ($LASTEXITCODE -ne 0) {
    throw "gh release upload failed with exit code $LASTEXITCODE. Does the release '$Tag' exist? Create it with: gh release create $Tag --title '...' --notes '...'"
  }
  Write-Host "Done. See $releasePage"
  exit 0
}

# --- Method 2: REST API with a personal access token ---
$token = $env:GITHUB_TOKEN
if (-not $token) {
  throw @'
No upload method available.
  - Install the GitHub CLI (winget install GitHub.cli), log in with `gh auth login`, and re-run this script, OR
  - Set a GITHUB_TOKEN environment variable (a fine-grained PAT with "Contents: Read and write" on this repo) and re-run.
'@
}

$headers = @{ Authorization = "Bearer $token"; Accept = 'application/vnd.github+json'; 'X-GitHub-Api-Version' = '2022-11-28' }
$release = Invoke-RestMethod -Headers $headers -Uri "https://api.github.com/repos/$Repo/releases/tags/$Tag"
$uploadUrl = $release.upload_url -replace '\{\?name,label\}', ''
Write-Host "Release: $($release.name) (id $($release.id))"

foreach ($f in $files) {
  Write-Host "Uploading $($f.Name) ($([math]::Round($f.Length / 1MB, 1)) MB) ..."
  $url = "$uploadUrl?name=$([uri]::EscapeDataString($f.Name))"
  Invoke-RestMethod -Method Post -Headers $headers -Uri $url -InFile $f.FullName -ContentType 'application/octet-stream' | Out-Null
}
Write-Host "Done. See $releasePage"
