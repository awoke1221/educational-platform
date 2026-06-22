param([switch]$Force)
$ErrorActionPreference = "Stop"

$h = @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzaXFpYmdwaW1hemZpdmZydHh6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTU4NzkwNCwiZXhwIjoyMDk3MTYzOTA0fQ.XWEA_Y3ng3ryeIGML9IZI3WrfMJnIo7oMgxSf7BpHwo"
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzaXFpYmdwaW1hemZpdmZydHh6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTU4NzkwNCwiZXhwIjoyMDk3MTYzOTA0fQ.XWEA_Y3ng3ryeIGML9IZI3WrfMJnIo7oMgxSf7BpHwo"
    "Content-Type" = "application/json"
    "Prefer" = "return=representation"
}
$now = "2026-06-22T19:00:00.000Z"
$cover = "https://adonaytiktokacadamy.b-cdn.net/educational-platform/covers/d8621bc7-0ca3-4e7e-b458-ba338efc44a0/d8621bc7-0ca3-4e7e-b458-ba338efc44a0-1782129896358.png"
$cover2 = "https://adonaytiktokacadamy.b-cdn.net/educational-platform/covers/43a643c8-cba4-4cef-a344-c89b72e21b8a/43a643c8-cba4-4cef-a344-c89b72e21b8a-1782131092734.png"

$g = @{apikey = $h["apikey"]; Authorization = $h["Authorization"]}

# Check existing
try { $existing = Invoke-RestMethod -Uri "https://gsiqibgpimazfivfrtxz.supabase.co/rest/v1/Course?select=id&order=createdAt" -Headers $g -Method Get } catch { $existing = @() }
Write-Host "Found $($existing.Count) existing courses"
if ($existing.Count -ge 5 -and -not $Force) { Write-Host "Skipping - courses already exist."; exit 0 }

# JSON with Amharic unicode escapes
$json = @'
[{"id":"bunny-demo-1","title":"\u12e8\u12f0\u122d \u12a0\u1295\u1235\u1273\u12ed \u130c\u1293\u1275","shortDescription":"Science course","description":"Science course about wildlife","coverImage":"CV","instructorId":"adlms","price":599,"currency":"ETB","level":"beginner","category":"Science","duration":60,"videoCount":1,"enrollmentCount":126,"isPublished":true,"createdAt":"NW","updatedAt":"NW"},{"id":"bunny-demo-2","title":"\u12d8\u1218\u1293\u12ca \u12f3\u1295\u1235 \u1235\u120d\u1325\u1293","shortDescription":"Dance training","description":"Modern dance training","coverImage":"CV","instructorId":"adlms","price":799,"currency":"ETB","level":"intermediate","category":"Arts","duration":60,"videoCount":1,"enrollmentCount":70,"isPublished":true,"createdAt":"NW","updatedAt":"NW"},{"id":"bunny-demo-3","title":"\u12e8\u1275\u12ca\u12f0\u12ee \u12a4\u12f2\u1271\u1295\u130d \u1218\u1230\u1228\u1274\u1296\u1275","shortDescription":"Video editing basics","description":"Video editing basics","coverImage":"CV","instructorId":"adlms","price":1299,"currency":"ETB","level":"beginner","category":"Technology","duration":60,"videoCount":1,"enrollmentCount":78,"isPublished":true,"createdAt":"NW","updatedAt":"NW"},{"id":"bunny-demo-4","title":"\u12e8\u1265\u1210\u122d \u1205\u12ed\u12c8\u1275 \u130c\u1293\u1275","shortDescription":"Marine life study","description":"Marine life educational course","coverImage":"CV","instructorId":"adlms","price":699,"currency":"ETB","level":"intermediate","category":"Science","duration":60,"videoCount":1,"enrollmentCount":40,"isPublished":true,"createdAt":"NW","updatedAt":"NW"},{"id":"5e1e3f85-e246-4815-ba77-e6e494ad6ca3","title":"Tiktok For Personal","shortDescription":"Personal branding course","description":"Learn tiktok for personal branding","coverImage":"C2","instructorId":"43a643c8-cba4-4cef-a344-c89b72e21b8a","price":5000,"currency":"ETB","level":"advanced","category":"Personal Branding","duration":0,"videoCount":2,"enrollmentCount":0,"isPublished":true,"createdAt":"NW","updatedAt":"NW"}]
'@
$json = $json.Replace('"CV"',"`"$cover`"").Replace('"C2"',"`"$cover2`"").Replace('"NW"',"`"$now`"")
$courses = $json | ConvertFrom-Json

foreach ($c in $courses) {
    try {
        $body = $c | ConvertTo-Json -Compress
        Invoke-RestMethod -Uri "https://gsiqibgpimazfivfrtxz.supabase.co/rest/v1/Course" -Headers $h -Method Post -Body $body | Out-Null
        Write-Host "OK $($c.id)"
    } catch {
        $m = $_.Exception.Message
        if ($m -match "409|duplicate") { Write-Host "EXISTS $($c.id)" } else { Write-Host "ERR $($c.id): $m" }
    }
}

Write-Host "`nVerify..."
$r = Invoke-RestMethod -Uri "https://gsiqibgpimazfivfrtxz.supabase.co/rest/v1/Course?select=id,title,isPublished" -Headers $g -Method Get
Write-Host "Total: $($r.Count)"
$r | ForEach-Object { Write-Host "  $($_.id): published=$($_.isPublished) : $($_.title)" }
