$lines = Get-Content 'c:\SLT_NEXUS\frontend\app\page.module.css' -TotalCount 693
$lines | Set-Content 'c:\SLT_NEXUS\frontend\app\page.module.css' -Encoding UTF8
Write-Host "Truncated to 693 lines"
