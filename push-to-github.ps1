# Push SRlite to https://github.com/js91tech/SRlite
Set-Location $PSScriptRoot

Write-Host "=== GitHub auth ===" -ForegroundColor Cyan
gh auth status
if ($LASTEXITCODE -ne 0) {
  Write-Host "Run: gh auth login" -ForegroundColor Yellow
  exit 1
}

if (-not (Test-Path .git)) { git init }

git add -A
$status = git status --porcelain
if ($status) {
  git commit -m "Initial Roadside Radar (SRlite) MVP for dispatch lead fishing"
}

git branch -M main
git remote remove origin 2>$null
git remote add origin https://github.com/js91tech/SRlite.git

Write-Host "=== Pushing to origin main ===" -ForegroundColor Cyan
git push -u origin main
if ($LASTEXITCODE -ne 0) {
  Write-Host "Normal push failed. If repo is empty, trying force..." -ForegroundColor Yellow
  git push -u origin main --force
}

Write-Host "Done: https://github.com/js91tech/SRlite" -ForegroundColor Green
