"""Make videos public in Bunny Stream and verify HLS URLs"""
import urllib.request
import json

API_KEY = "b64900fe-875f-4d31-89d29b728805-04c9-4189"
LIBRARY_ID = 695187

VIDEOS = [
    {"guid": "5a35a1fa-a3cc-4cdf-a4b5-07be9e0a2cd4", "name": "documentary.mp4 (Homepage Trailer)"},
    {"guid": "7a24ef5d-ce15-4dd0-af74-3897f6afd998", "name": "Adonay tiktok acadami.mp4 (Course Lecture)"},
]

def make_public(guid):
    url = f"https://video.bunnycdn.com/library/{LIBRARY_ID}/videos/{guid}"
    data = json.dumps({"isPublic": True}).encode()
    req = urllib.request.Request(url, data=data, method="POST", headers={
        "AccessKey": API_KEY,
        "Content-Type": "application/json",
    })
    with urllib.request.urlopen(req) as resp:
        return resp.status

def check_url(url):
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req) as resp:
            return resp.status, len(resp.read())
    except urllib.error.HTTPError as e:
        return e.code, 0

print("=" * 60)
print("SETTING VIDEOS TO PUBLIC")
print("=" * 60)

for v in VIDEOS:
    try:
        status = make_public(v["guid"])
        print(f"✅ {v['name']} → isPublic: true (Status: {status})")
    except Exception as e:
        print(f"❌ {v['name']} → {e}")

print("\n" + "=" * 60)
print("VERIFYING HLS URLS")
print("=" * 60)

# Test different URL formats
for v in VIDEOS:
    guid = v["guid"]
    name = v["name"]
    
    urls = [
        ("iframe embed", f"https://iframe.mediadelivery.net/embed/{LIBRARY_ID}/{guid}"),
        ("iframe playlist", f"https://iframe.mediadelivery.net/{LIBRARY_ID}/{guid}/playlist.m3u8"),
        ("iframe alt", f"https://iframe.mediadelivery.net/playlist.m3u8?videoId={guid}"),
        ("CDN HLS", f"https://vz-f7c04ae7-b2e.b-cdn.net/{guid}/playlist.m3u8"),
    ]
    
    print(f"\n{name} ({guid}):")
    for label, url in urls:
        status, size = check_url(url)
        icon = "✅" if status == 200 else "❌"
        print(f"  {icon} [{status}] {label}: {url[:70]}...")

print("\nDone!")
