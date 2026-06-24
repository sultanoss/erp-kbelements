$ErrorActionPreference = "Continue"
Set-Location "C:\Users\user\Documents\ERP-KBELEMENTS"
$log = "C:\Users\user\Documents\ERP-KBELEMENTS\server-live.log"
"Starting KB ELEMENTS ERP at $(Get-Date)" | Out-File -FilePath $log -Encoding utf8 -Append
& "C:\Program Files\nodejs\node.exe" "node_modules\next\dist\bin\next" dev *>> $log
"Server stopped at $(Get-Date)" | Out-File -FilePath $log -Encoding utf8 -Append
