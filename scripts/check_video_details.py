"""Check video details and test HLS URL"""
import urllib.request
import json

API_KEY = "b64900fe-875f-4d31-89d29b728805-04c9-4189"
LIBRARY_ID = 695187

# Check video details
for guid, name in [
    ("5a35a1fa-a3cc-4cdf-a4b5-07be9e0a2cd4", "documentary.mp4"),
    ("7a24ef5d-ce15-4dd0-af74-3897f6afd998", "Adonay tiktok acadami.mp4"),
]:
    req = urllib.request.Request(
        f"https://video.bunnycdn.com/library/{LIBRARY_ID}/videos/{guid}",
        headers={"AccessKey": API_KEY}
    )
    with urllib.request.urlopen(req) as resp:
        d = json.loads(resp.read().decode())
    
    print(f"\n{'='*50}")
    print(f"{name} ({guid})")
    print(f"{'='*50}")
    print(f"  isPublic: {d.get('isPublic')}")
    print(f"  Status: {d.get('status')} (4=completed)")
    print(f"  Length: {d.get('length')}s")
    print(f"  Resolution: {d.get('width')}x{d.get('height')}")
    print(f"  hasMP4Fallback: {d.get('hasMP4Fallback')}")
    
    # Check if the video has available resolutions
    resolutions = d.get('availableResolutions', '')
    print(f"  Available Resolutions: {resolutions}")
    
    # Try the CDN URL with a browser-like request
    cdn_url = f"https://vz-f7c04ae7-b2e.b-cdn.net/{guid}/playlist.m3u8"
    print(f"\n  Testing URL: {cdn_url}")
    
    req2 = urllib.request.Request(cdn_url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req2) as resp:
            content = resp.read().decode()[:200]
            print(f"  ✅ Status: {resp.status}")
            print(f"  Content: {content}...")
    except urllib.error.HTTPError as e:
        print(f"  ❌ Status: {e.code}")
        if e.code == 403:
            print(f"  Response: {e.read().decode()[:100]}")
    
    # Try alternate URL format
    alt_url = f"https://iframe.mediadelivery.net/embed/{LIBRARY_ID}/{guid}/playlist.m3u8"
    print(f"\n  Testing: {alt_url}")
    req3 = urllib.request.Request(alt_url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req3) as resp:
            content = resp.read().decode()[:200]
            print(f"  ✅ Status: {resp.status}")
    except urllib.error.HTTPError as e:
        print(f"  ❌ Status: {e.code}")

print("\nDone!")
