"""Upload video file to Bunny Stream using the direct upload API"""
import urllib.request
import json

API_KEY = "b64900fe-875f-4d31-89d29b728805-04c9-4189"
VIDEO_GUID = "0b29d7f2-97bc-44b2-9de3-b1941bb1f0a8"
LIBRARY_ID = 695187
FILE_PATH = "C:/Users/hp/Downloads/documentary.mp4"

# Upload the file using the direct upload endpoint
url = f"https://video.bunnycdn.com/library/{LIBRARY_ID}/videos/{VIDEO_GUID}"

with open(FILE_PATH, "rb") as f:
    file_data = f.read()

print(f"File size: {len(file_data)} bytes")
print(f"Uploading to {url}...")

req = urllib.request.Request(url, data=file_data, method="PUT", headers={
    "AccessKey": API_KEY,
    "Content-Type": "application/octet-stream",
})

try:
    with urllib.request.urlopen(req) as resp:
        print(f"Upload response status: {resp.status}")
        body = resp.read().decode()
        print(f"Response: {body[:200]}")
except urllib.error.HTTPError as e:
    print(f"Error: {e.code}")
    print(f"Response: {e.read().decode()[:500]}")
