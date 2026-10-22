# Stops and removes the junosd scheduled task.
$ErrorActionPreference = 'Stop'
Stop-ScheduledTask -TaskName 'junosd' -ErrorAction SilentlyContinue
Unregister-ScheduledTask -TaskName 'junosd' -Confirm:$false
Write-Host "Removed task 'junosd'."
