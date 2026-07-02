"""Update video to be public and check the response"""
import urllib.request
import json

API_KEY = "b64900fe-875f-4d31-89d29b728805-04c9-4189"
LIBRARY_ID = 695187

for guid, name in [
    ("5a35a1fa-a3cc-4cdf-a4b5-07be9e0a2cd4", "documentary.mp4"),
    ("7a24ef5d-ce15-4dd0-af74-3897f6afd998", "Adonay tiktok acadami.mp4"),
]:
    # First, update to public
    url = f"https://video.bunnycdn.com/library/{LIBRARY_ID}/videos/{guid}"
    data = json.dumps({"isPublic": True}).encode()
    req = urllib.request.Request(url, data=data, method="POST", headers={
        "AccessKey": API_KEY,
        "Content-Type": "application/json",
    })
    try:
        with urllib.request.urlopen(req) as resp:
            print(f"\n{name}: Update response status: {resp.status}")
            body = resp.read().decode()
            print(f"  Response body: {body}")
    except urllib.error.HTTPError as e:
        print(f"\n{name}: Error {e.code}")
        print(f"  Response: {e.read().decode()[:200]}")
    
    # Now check the video details
    req2 = urllib.request.Request(
        f"https://video.bunnycdn.com/library/{LIBRARY_ID}/videos/{guid}",
        headers={"AccessKey": API_KEY}
    )
    with urllib.request.urlopen(req2) as resp:
        d = json.loads(resp.read().decode())
    print(f"  After update - isPublic: {d.get('isPublic')}")
