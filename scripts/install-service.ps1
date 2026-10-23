# Registers junosd as a per-user scheduled task that starts at logon. Run it yourself; nothing calls it.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$node = (Get-Command node).Source
$main = Join-Path $root 'apps\daemon\src\main.ts'
$action = New-ScheduledTaskAction -Execute $node -Argument "`"$main`"" -WorkingDirectory $root
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
Register-ScheduledTask -TaskName 'junosd' -Action $action -Trigger $trigger -Settings $settings -Description 'JunOS daemon' -Force | Out-Null
Write-Host "Registered task 'junosd'. Start now with: Start-ScheduledTask -TaskName junosd"
