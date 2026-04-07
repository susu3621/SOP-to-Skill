$ErrorActionPreference = 'Stop'

$remoteDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$exePath = Join-Path $remoteDir 'skill-configurator.exe'

if (-not (Test-Path $exePath)) {
  throw "Portable executable not found: $exePath"
}

$taskName = "SkillConfiguratorPortable-$([DateTime]::Now.ToString('yyyyMMdd-HHmmss'))"
$startTime = (Get-Date).AddMinutes(1).ToString('HH:mm')

try {
  schtasks.exe /create /tn $taskName /tr $exePath /sc once /st $startTime /it /f | Out-Null
  schtasks.exe /run /tn $taskName | Out-Null
  Start-Sleep -Seconds 8

  $alive = Get-Process | Where-Object {
    $_.Path -eq $exePath -and $_.SessionId -ne 0
  } | Select-Object -First 1
} finally {
  schtasks.exe /delete /tn $taskName /f | Out-Null
}

if (-not $alive) {
  throw 'Application did not appear in an interactive user session after launch'
}

[pscustomobject]@{
  remoteDir = $remoteDir
  exePath = $exePath
  processId = $alive.Id
  sessionId = $alive.SessionId
} | ConvertTo-Json -Compress
