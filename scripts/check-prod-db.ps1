$g = @{
    apikey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzaXFpYmdwaW1hemZpdmZydHh6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTU4NzkwNCwiZXhwIjoyMDk3MTYzOTA0fQ.XWEA_Y3ng3ryeIGML9IZI3WrfMJnIo7oMgxSf7BpHwo"
    Authorization = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzaXFpYmdwaW1hemZpdmZydHh6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTU4NzkwNCwiZXhwIjoyMDk3MTYzOTA0fQ.XWEA_Y3ng3ryeIGML9IZI3WrfMJnIo7oMgxSf7BpHwo"
}
Write-Host "Direct Supabase REST API query:"
$r = Invoke-RestMethod -Uri "https://gsiqibgpimazfivfrtxz.supabase.co/rest/v1/Course?select=id,title,isPublished&order=createdAt" -Headers $g -Method Get
Write-Host "Found $($r.Count) courses"
$r | ForEach-Object { Write-Host "  $($_.id): published=$($_.isPublished) : $($_.title)" }

Write-Host "`n---"
Write-Host "Now checking via Vercel..."
$v = Invoke-RestMethod -Uri "https://adoni444.vercel.app/api/debug-courses" -Method Get
$s = $v.data.tests.simple_select
Write-Host "Vercel debug: count=$($s.count) error=$($s.error) items=$($s.items.Count)"
