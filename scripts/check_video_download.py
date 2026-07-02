"""Check video details and try to download or get a usable URL"""
import urllib.request
import json

API_KEY = "b64900fe-875f-4d31-89d29b728805-04c9-4189"
GUID = "9022c9fc-a390-4b9d-9aa4-95a70f64e33c"
LIBRARY_ID = 695187

# Get video details
url = f"https://video.bunnycdn.com/library/{LIBRARY_ID}/videos/{GUID}"
req = urllib.request.Request(url, headers={"AccessKey": API_KEY})
with urllib.request.urlopen(req) as resp:
    d = json.loads(resp.read().decode())

print("Video Details:")
print(f"  Title: {d.get('title')}")
print(f"  hasOriginal: {d.get('hasOriginal')}")
print(f"  hasMP4Fallback: {d.get('hasMP4Fallback')}")
print(f"  storageSize: {d.get('storageSize')} bytes")
print(f"  Resolution: {d.get('width')}x{d.get('height')}")
print(f"  Status: {d.get('status')}")

# Try to get the download URL from the API
# Some Stream API versions have a download URL
fetch_url = f"https://video.bunnycdn.com/library/{LIBRARY_ID}/videos/{GUID}/fetch"
req2 = urllib.request.Request(fetch_url, headers={"AccessKey": API_KEY})
try:
    with urllib.request.urlopen(req2) as resp:
        print(f"\nFetch endpoint: {resp.status}")
        print(resp.read().decode()[:200])
except Exception as e:
    print(f"\nFetch endpoint not available: {e}")

# Try the MP4 fallback with a GET request
mp4_url = f"https://vz-f7c04ae7-b2e.b-cdn.net/{GUID}/playlist.mp4"
req3 = urllib.request.Request(mp4_url)
try:
    with urllib.request.urlopen(req3) as resp:
        print(f"\nMP4 fallback: {resp.status} - {resp.headers.get('content-type')}")
except Exception as e:
    print(f"\nMP4 fallback failed: {e}")

print("\nDone!")
