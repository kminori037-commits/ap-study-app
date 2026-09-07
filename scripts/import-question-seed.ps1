param(
  [string]$Profile = "ap-study-dev",
  [string]$Region = "ap-northeast-1",
  [string]$InputDirectory = "work/question-bank-seed"
)

$ErrorActionPreference = "Stop"
$projectDirectory = Split-Path -Parent $PSScriptRoot
Push-Location $projectDirectory
try {
  & node "scripts/import-question-seed.mjs" "--profile=$Profile" "--region=$Region" "--input=$InputDirectory"
  if ($LASTEXITCODE -ne 0) { throw "Question seed import failed." }
} finally {
  Pop-Location
}
