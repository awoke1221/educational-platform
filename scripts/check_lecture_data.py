"""Check current lecture video data in Supabase"""
import urllib.request
import json

SUPABASE_URL = "https://gsiqibgpimazfivfrtxz.supabase.co"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzaXFpYmdwaW1hemZpdmZydHh6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTU4NzkwNCwiZXhwIjoyMDk3MTYzOTA0fQ.XWEA_Y3ng3ryeIGML9IZI3WrfMJnIo7oMgxSf7BpHwo"

def supabase_get(table, params=""):
    url = f"{SUPABASE_URL}/rest/v1/{table}?{params}"
    req = urllib.request.Request(url, headers={
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
    })
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())

# Get courses
courses = supabase_get("Course", "select=id,title")
print("=== COURSES ===")
for c in courses:
    print(f"  {c['id']}: {c['title']}")

# Get lectures
lectures = supabase_get("Lecture", "select=id,title,courseId,cloudinaryPublicId,videoUrl,createdAt&order=createdAt")
print("\n=== LECTURES ===")
for l in lectures:
    pub_id = l.get("cloudinaryPublicId", "")
    vid_url = l.get("videoUrl", "")
    print(f"\n  ID: {l['id']}")
    print(f"  Title: {l['title']}")
    print(f"  Course: {l['courseId']}")
    print(f"  cloudinaryPublicId: {pub_id}")
    print(f"  videoUrl: {vid_url[:80] if vid_url else 'NONE'}...")
