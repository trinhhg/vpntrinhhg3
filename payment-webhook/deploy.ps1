param(
  [string]$message = "Deployed by Antigravity",
  [string]$token = ""
)
$accountId = $env:CF_ACCOUNT_ID_ACC2
if (-not $accountId) { $accountId = "b00e100d60e5b0d729628129fc44e772" }
$scriptName = "payment-webhook"
if (-not $token) { $token = $env:CF_API_TOKEN_ACC2 }
if (-not $token) { $token = $env:D1_CF_API_TOKEN }
if (-not $token) { $token = $env:CF_API_TOKEN }
if (-not $token) {
  Write-Error "Vui lòng truyền -token <API_TOKEN> hoặc thiết lập biến môi trường CF_API_TOKEN_ACC2 / D1_CF_API_TOKEN trước khi deploy."
  exit 1
}
$workerFile = "$PSScriptRoot\worker.js"

$meta = @{
    main_module = "worker.js"
    compatibility_date = "2024-09-23"
    bindings = @(@{ type = "inherit"; name = "*" })
} | ConvertTo-Json -Compress

$metaPath = "$env:TEMP\cf_meta_$scriptName.json"
[System.IO.File]::WriteAllText($metaPath, $meta)

$uploadRes = curl.exe -s -X POST "https://api.cloudflare.com/client/v4/accounts/$accountId/workers/scripts/$scriptName/versions" `
  -H "Authorization: Bearer $token" `
  -F "metadata=@$metaPath;type=application/json" `
  -F "worker.js=@$workerFile;type=application/javascript+module"

$upload = $uploadRes | ConvertFrom-Json
if (-not $upload.success) {
    Write-Error "Upload failed: $($upload.errors | ConvertTo-Json)"
    exit 1
}

$versionId = $upload.result.id

$deployBody = @{
    strategy = "percentage"
    versions = @(@{ version_id = $versionId; percentage = 100 })
    annotations = @{ "workers/message" = $message }
} | ConvertTo-Json -Depth 5

$deploy = Invoke-RestMethod -Method POST `
  -Uri "https://api.cloudflare.com/client/v4/accounts/$accountId/workers/scripts/$scriptName/deployments" `
  -Headers @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" } `
  -Body $deployBody

if ($deploy.success) {
    Write-Host "DEPLOY_SUCCESS: $scriptName Version $($upload.result.number) (Version ID: $versionId)"
} else {
    Write-Error "Deployment failed: $($deploy.errors | ConvertTo-Json)"
}
