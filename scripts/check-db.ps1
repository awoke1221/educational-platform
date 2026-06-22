$headers = @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzaXFpYmdwaW1hemZpdmZydHh6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTU4NzkwNCwiZXhwIjoyMDk3MTYzOTA0fQ.XWEA_Y3ng3ryeIGML9IZI3WrfMJnIo7oMgxSf7BpHwo"
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzaXFpYmdwaW1hemZpdmZydHh6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTU4NzkwNCwiZXhwIjoyMDk3MTYzOTA0fQ.XWEA_Y3ng3ryeIGML9IZI3WrfMJnIo7oMgxSf7BpHwo"
    "Prefer" = "count=exact"
}
$url = "https://gsiqibgpimazfivfrtxz.supabase.co/rest/v1/Course?select=id,title,price,level,category,isPublished,isArchived,enrollmentCount,videoCount&order=createdAt"
$response = Invoke-RestMethod -Uri $url -Headers $headers -Method Get

Write-Host "=== ALL COURSES IN DATABASE ==="
Write-Host "Total count: $($response.Count)"
Write-Host ""

$response | ForEach-Object {
    $status = if ($_.isPublished) { "PUBLISHED" } else { "DRAFT" }
    Write-Host "[$($_.id)] $($_.title)"
    Write-Host "    Price: $($_.price) ETB | Level: $($_.level) | Category: $($_.category)"
    Write-Host "    Status: $status | Enrolled: $($_.enrollmentCount) | Videos: $($_.videoCount)"
    Write-Host ""
}

$pubCount = ($response | Where-Object { $_.isPublished }).Count
$draftCount = ($response | Where-Object { -not $_.isPublished }).Count
Write-Host "PUBLISHED: $pubCount | DRAFT: $draftCount"

# Also get lectures and users
$lecHeaders = @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzaXFpYmdwaW1hemZpdmZydHh6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTU4NzkwNCwiZXhwIjoyMDk3MTYzOTA0fQ.XWEA_Y3ng3ryeIGML9IZI3WrfMJnIo7oMgxSf7BpHwo"
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzaXFpYmdwaW1hemZpdmZydHh6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTU4NzkwNCwiZXhwIjoyMDk3MTYzOTA0fQ.XWEA_Y3ng3ryeIGML9IZI3WrfMJnIo7oMgxSf7BpHwo"
}

$lecUrl = "https://gsiqibgpimazfivfrtxz.supabase.co/rest/v1/Lecture?select=id,courseId,title&order=createdAt"
$lecResponse = Invoke-RestMethod -Uri $lecUrl -Headers $lecHeaders -Method Get
Write-Host "=== LECTURES: $($lecResponse.Count) ==="

$usersUrl = "https://gsiqibgpimazfivfrtxz.supabase.co/rest/v1/User?select=id,fullName,role&order=createdAt"
$usersResponse = Invoke-RestMethod -Uri $usersUrl -Headers $lecHeaders -Method Get
Write-Host "=== USERS: $($usersResponse.Count) ==="
$usersResponse | ForEach-Object {
    Write-Host "  [$($_.id)] $($_.fullName) - Role: $($_.role)"
}

$enrollUrl = "https://gsiqibgpimazfivfrtxz.supabase.co/rest/v1/Enrollment?select=id,userId,courseId,status&order=createdAt"
$enrollResponse = Invoke-RestMethod -Uri $enrollUrl -Headers $lecHeaders -Method Get
Write-Host "=== ENROLLMENTS: $($enrollResponse.Count) ==="
