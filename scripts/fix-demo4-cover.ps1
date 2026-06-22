$h = @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzaXFpYmdwaW1hemZpdmZydHh6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTU4NzkwNCwiZXhwIjoyMDk3MTYzOTA0fQ.XWEA_Y3ng3ryeIGML9IZI3WrfMJnIo7oMgxSf7BpHwo"
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzaXFpYmdwaW1hemZpdmZydHh6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTU4NzkwNCwiZXhwIjoyMDk3MTYzOTA0fQ.XWEA_Y3ng3ryeIGML9IZI3WrfMJnIo7oMgxSf7BpHwo"
    "Content-Type" = "application/json"
    "Prefer" = "return=minimal"
}
$now = (Get-Date -Format "yyyy-MM-ddTHH:mm:ss.fffZ")
$cover = "https://adonaytiktokacadamy.b-cdn.net/educational-platform/covers/d8621bc7-0ca3-4e7e-b458-ba338efc44a0/d8621bc7-0ca3-4e7e-b458-ba338efc44a0-1782129896358.png"
$body = "{`"coverImage`":`"$cover`",`"updatedAt`":`"$now`"}"
Invoke-RestMethod -Uri "https://gsiqibgpimazfivfrtxz.supabase.co/rest/v1/Course?id=eq.bunny-demo-4" -Headers $h -Method Patch -Body $body
Write-Host "Updated cover for bunny-demo-4"
