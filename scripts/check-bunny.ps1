$headers = @{ "AccessKey" = "d82c5e2e-7bf6-4093-84b7b9de3d4c-8cf7-4fd2" }
$baseUrl = "https://storage.bunnycdn.com/educational-platform-images"

function List-BunnyFolder {
    param($Path, $Depth = 0)
    if ($Depth -gt 3) { return }
    $indent = "  " * ($Depth + 1)
    $url = if ($Path) { "$baseUrl/$Path/" } else { "$baseUrl/" }
    try {
        $files = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
        $files | ForEach-Object {
            if ($_.IsDirectory) {
                Write-Host "$indent[DIR] $($_.ObjectName)/"
                $subPath = if ($Path) { "$Path/$($_.ObjectName)" } else { $_.ObjectName }
                List-BunnyFolder -Path $subPath -Depth ($Depth + 1)
            } else {
                $size = if ($_.Length -gt 1048576) { "{0:N1} MB" -f ($_.Length / 1MB) } elseif ($_.Length -gt 1024) { "{0:N1} KB" -f ($_.Length / 1KB) } else { "$($_.Length) B" }
                Write-Host "$indent[$($_.ContentType)] $($_.ObjectName) - $size"
            }
        }
    } catch {
        Write-Host "$indent(empty or inaccessible)"
    }
}

Write-Host "=== BUNNY STORAGE ROOT ==="
$rootFiles = Invoke-RestMethod -Uri "$baseUrl/" -Headers $headers -Method Get
$rootFiles | ForEach-Object {
    $type = if ($_.IsDirectory) { "DIR" } else { "FILE" }
    $size = if ($_.IsDirectory) { "-" } elseif ($_.Length -gt 1048576) { "{0:N1} MB" -f ($_.Length / 1MB) } else { "$($_.Length) bytes" }
    Write-Host "  [$type] $($_.ObjectName) - $size"
}

Write-Host "`n=== FULL FILE LISTING ==="
List-BunnyFolder -Path "" -Depth 0

# Summary
Write-Host "`n=== SUMMARY ==="
$allVideos = @()
$allImages = @()
$totalSize = 0

function Count-Files {
    param($Path)
    $url = if ($Path) { "$baseUrl/$Path/" } else { "$baseUrl/" }
    try {
        $files = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
        $files | ForEach-Object {
            if ($_.IsDirectory) {
                $subPath = if ($Path) { "$Path/$($_.ObjectName)" } else { $_.ObjectName }
                Count-Files -Path $subPath
            } else {
                $script:totalSize += $_.Length
                if ($_.ContentType -match "video|mp4|webm") {
                    $script:allVideos += $_.ObjectName
                } elseif ($_.ContentType -match "image|png|jpg|jpeg|webp") {
                    $script:allImages += $_.ObjectName
                }
            }
        }
    } catch {}
}

Count-Files -Path ""
Write-Host "Total video files: $($allVideos.Count)"
Write-Host "Total image files: $($allImages.Count)"
$totalSizeMB = $totalSize / 1MB
Write-Host "Total storage used: {0:N2} MB" -f $totalSizeMB
