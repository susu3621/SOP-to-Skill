$ErrorActionPreference = 'Stop'

$remoteDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$exePath = Join-Path $remoteDir 'skill-configurator.exe'

if (-not (Test-Path $exePath)) {
  throw "Portable executable not found: $exePath"
}

$launch = Start-Process -FilePath $exePath -PassThru
Start-Sleep -Seconds 8

$alive = Get-Process -Id $launch.Id -ErrorAction SilentlyContinue
if (-not $alive) {
  $alive = Get-Process | Where-Object {
    $_.Path -eq $exePath -or $_.ProcessName -eq 'skill-configurator' -or $_.ProcessName -eq 'Skill Configurator'
  } | Select-Object -First 1
}

if (-not $alive) {
  throw 'Application did not remain running after launch'
}

[pscustomobject]@{
  remoteDir = $remoteDir
  exePath = $exePath
  processId = $alive.Id
} | ConvertTo-Json -Compress
