Set-Location 'J:\Python\alif24-platform\frontend'
Write-Host '-> Writing .env'
$env = @'
VITE_API_URL=https://alif24-backend-wmuzt.azurewebsites.net/api/v1
VITE_HARF_API_URL=https://alif24-backend-wmuzt.azurewebsites.net/harf
VITE_HARF_API_BASE=https://alif24-backend-wmuzt.azurewebsites.net/harf
'@
$env | Out-File -FilePath .env -Encoding utf8
Write-Host '-> Node version check'
node --version
if ($LASTEXITCODE -ne 0) { Write-Host 'Node not found; aborting frontend build.'; exit 2 }
npm --version
Write-Host '-> Installing deps'
npm ci 2>$null
if ($LASTEXITCODE -ne 0) { npm install }
Write-Host '-> Building frontend'
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host 'Build failed'; exit 3 }
if (-not (Test-Path './dist')) { Write-Host 'dist not found'; exit 4 }
Write-Host '-> Getting SWA token'
$token = az staticwebapp secrets list --name alif24-frontend --resource-group alif24-platform-rg --query 'properties.apiKey' -o tsv
if (-not $token) { Write-Host 'Could not get SWA token; aborting'; exit 5 }
Write-Host "-> Token length: $($token.Length)"
if (Get-Command swa -ErrorAction SilentlyContinue) {
  Write-Host '-> SWA CLI found; deploying'
  swa deploy ./dist --deployment-token $token
} else {
  Write-Host '-> SWA CLI missing; installing'
  npm install -g @azure/static-web-apps-cli
  if (Get-Command swa -ErrorAction SilentlyContinue) {
    Write-Host '-> SWA installed; deploying'
    swa deploy ./dist --deployment-token $token
  } else {
    Write-Host 'Failed to install SWA CLI. Please install it manually and run: swa deploy ./dist --deployment-token <token>'
    exit 6
  }
}
