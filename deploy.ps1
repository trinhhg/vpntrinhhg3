param(
  [string]$message = "Deployed by Antigravity"
)

$token = $env:CF_API_TOKEN
if (-not $token) {
  Write-Host "CF_API_TOKEN không được set trong biến môi trường. Chạy lệnh deploy..."
}

node "$PSScriptRoot\scratch\deploy_full_bindings.mjs" "$message"
