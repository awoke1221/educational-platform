$headers = @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzaXFpYmdwaW1hemZpdmZydHh6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTU4NzkwNCwiZXhwIjoyMDk3MTYzOTA0fQ.XWEA_Y3ng3ryeIGML9IZI3WrfMJnIo7oMgxSf7BpHwo"
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzaXFpYmdwaW1hemZpdmZydHh6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTU4NzkwNCwiZXhwIjoyMDk3MTYzOTA0fQ.XWEA_Y3ng3ryeIGML9IZI3WrfMJnIo7oMgxSf7BpHwo"
    "Content-Type" = "application/json"
    "Prefer" = "return=minimal"
}
$now = (Get-Date -Format "yyyy-MM-ddTHH:mm:ss.fffZ")

# Publish the draft course
Write-Host "Publishing draft course bunny-demo-4..."
$body1 = "{`"isPublished`":true,`"updatedAt`":`"$now`"}"
Invoke-RestMethod -Uri "https://gsiqibgpimazfivfrtxz.supabase.co/rest/v1/Course?id=eq.bunny-demo-4" -Headers $headers -Method Patch -Body $body1
Write-Host "Done."

Write-Host "Updating demo course covers..."
$cover = "https://adonaytiktokacadamy.b-cdn.net/educational-platform/covers/d8621bc7-0ca3-4e7e-b458-ba338efc44a0/d8621bc7-0ca3-4e7e-b458-ba338efc44a0-1782129896358.png"
$courses = @("bunny-demo-1", "bunny-demo-2", "bunny-demo-3")
foreach ($id in $courses) {
    $body2 = "{`"coverImage`":`"$cover`",`"updatedAt`":`"$now`"}"
    Invoke-RestMethod -Uri "https://gsiqibgpimazfivfrtxz.supabase.co/rest/v1/Course?id=eq.$id" -Headers $headers -Method Patch -Body $body2
    Write-Host "  Updated $id"
}

# Verify
Write-Host "`nVerification:"
$getHeaders = @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzaXFpYmdwaW1hemZpdmZydHh6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTU4NzkwNCwiZXhwIjoyMDk3MTYzOTA0fQ.XWEA_Y3ng3ryeIGML9IZI3WrfMJnIo7oMgxSf7BpHwo"
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzaXFpYmdwaW1hemZpdmZydHh6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTU4NzkwNCwiZXhwIjoyMDk3MTYzOTA0fQ.XWEA_Y3ng3ryeIGML9IZI3WrfMJnIo7oMgxSf7BpHwo"
}
$result = Invoke-RestMethod -Uri "https://gsiqibgpimazfivfrtxz.supabase.co/rest/v1/Course?select=id,title,isPublished&order=createdAt" -Headers $getHeaders -Method Get
$result | ForEach-Object { Write-Host "[$($_.id)] published=$($_.isPublished) - $($_.title)" }
