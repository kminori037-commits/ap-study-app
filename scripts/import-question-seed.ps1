param(
  [string]$Profile = "ap-study-dev",
  [string]$Region = "ap-northeast-1",
  [string]$InputDirectory = "work/question-bank-seed",
  [string]$AwsCli = "aws"
)

$ErrorActionPreference = "Stop"
$env:AWS_CLI_FILE_ENCODING = "UTF-8"
$resolvedDirectory = (Resolve-Path -LiteralPath $InputDirectory).Path
$batches = @(Get-ChildItem -LiteralPath $resolvedDirectory -Filter "batch-*.json" | Sort-Object Name)
if ($batches.Count -eq 0) { throw "No seed batches found at $resolvedDirectory" }

$submitted = 0
foreach ($batch in $batches) {
  $batchData = Get-Content -Raw -LiteralPath $batch.FullName | ConvertFrom-Json -AsHashtable
  $pending = $batchData
  $attempt = 0
  while (@($pending["ap-study-question-bank"]).Count -gt 0) {
    $temporaryFile = Join-Path $env:TEMP "ap-study-seed-$PID-$($batch.BaseName)-$attempt.json"
    try {
      $pending | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $temporaryFile -Encoding utf8
      $rawResponse = & $AwsCli dynamodb batch-write-item --request-items "file://$temporaryFile" --profile $Profile --region $Region --output json
      if ($LASTEXITCODE -ne 0) { throw "AWS CLI failed for $($batch.Name)" }
      $response = $rawResponse | ConvertFrom-Json -AsHashtable
      $pending = $response["UnprocessedItems"]
      $attempt += 1
      if (@($pending["ap-study-question-bank"]).Count -gt 0) {
        if ($attempt -ge 20) { throw "Unprocessed items remained after 20 attempts for $($batch.Name)" }
        Start-Sleep -Milliseconds ([Math]::Min(5000, 250 * [Math]::Pow(2, [Math]::Min($attempt, 4))))
      }
    } finally {
      if (Test-Path -LiteralPath $temporaryFile) { Remove-Item -LiteralPath $temporaryFile -Force }
    }
  }
  $submitted += @($batchData["ap-study-question-bank"]).Count
  Write-Host "Imported $($batch.Name)"
}

Write-Host "Imported $submitted question-bank items from $($batches.Count) batches."
