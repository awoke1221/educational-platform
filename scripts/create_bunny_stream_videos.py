"""Create Bunny Stream video entries and output upload URLs"""
import urllib.request
import json

API_KEY = "b64900fe-875f-4d31-89d29b728805-04c9-4189"
LIBRARY_ID = "695187"
BASE_URL = f"https://video.bunnycdn.com/library/{LIBRARY_ID}"

VIDEOS_TO_CREATE = [
    {"title": "Homepage Hero Trailer", "purpose": "Hero/Trailer video for the homepage"},
    {"title": "Introduction to TikTok for Personal Branding", "purpose": "Lecture video for TikTok For Personal course"},
]

def create_video(title):
    url = f"{BASE_URL}/videos"
    data = json.dumps({"title": title}).encode()
    req = urllib.request.Request(url, data=data, method="POST", headers={
        "AccessKey": API_KEY,
        "Content-Type": "application/json",
    })
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())

print("=" * 70)
print("🎬 CREATING BUNNY STREAM VIDEO ENTRIES")
print("=" * 70)

for v in VIDEOS_TO_CREATE:
    print(f"\n📹 {v['title']}")
    print(f"   Purpose: {v['purpose']}")
    
    result = create_video(v["title"])
    guid = result.get("guid", "")
    upload_url = result.get("uploadUrl", "")
    
    print(f"   ✅ GUID: {guid}")
    print(f"   📤 Upload URL: {upload_url}")
    print(f"   📄 Full Response: {json.dumps(result, indent=2)}")
    print()
    print(f"   📋 To upload, run:")
    print(f'   curl -X PUT "https://video.bunnycdn.com/library/{LIBRARY_ID}/videos/{guid}" --data-binary "@your-video-file.mp4"')
    print()

print("=" * 70)
print("📌 DATABASE UPDATES NEEDED")
print("=" * 70)
print()
print("After uploading videos, update the database:")
print()
print("1. For the LECTURE video, run this SQL in Supabase:")
print("   UPDATE \"Lecture\"")
print("   SET \"cloudinaryPublicId\" = '{LECTURE_GUID}',")
print("       \"videoUrl\" = '',")
print("       \"updatedAt\" = NOW()")
print("   WHERE id = '7e2f9e05-ec08-46b1-8c0e-f450f13b8c21';")
print()
print("2. For the HERO/TRAILER, add to .env:")
print("   NEXT_PUBLIC_TRAILER_VIDEO_ID={TRAILER_GUID}")
