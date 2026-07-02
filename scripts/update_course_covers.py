"""Query current course covers from Supabase and update them to new Bunny CDN"""
import urllib.request
import json

SUPABASE_URL = "https://gsiqibgpimazfivfrtxz.supabase.co"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzaXFpYmdwaW1hemZpdmZydHh6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTU4NzkwNCwiZXhwIjoyMDk3MTYzOTA0fQ.XWEA_Y3ng3ryeIGML9IZI3WrfMJnIo7oMgxSf7BpHwo"
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzaXFpYmdwaW1hemZpdmZydHh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1ODc5MDQsImV4cCI6MjA5NzE2MzkwNH0.ThE4jQCOFsDAL-lconI2OG5rUZK_IarT7iv4Efx6RJM"

NEW_CDN_BASE = "https://educational-platform-images.b-cdn.net"

# Course name -> new cover path mapping
COURSE_COVERS = {
    "TikTok For Personal": "courses/TikTok-For-Personal/cover.jpg",
    "TikTok For Business": "courses/TikTok-For-Business/cover.jpg",
}

def get_courses():
    url = f"{SUPABASE_URL}/rest/v1/Course?select=id,title,coverImage"
    req = urllib.request.Request(url, headers={
        "apikey": ANON_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
    })
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())

def update_course_cover(course_id, new_url):
    url = f"{SUPABASE_URL}/rest/v1/Course?id=eq.{course_id}"
    data = json.dumps({"coverImage": new_url}).encode()
    req = urllib.request.Request(url, data=data, method="PATCH", headers={
        "apikey": ANON_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    })
    with urllib.request.urlopen(req) as resp:
        return resp.status

if __name__ == "__main__":
    courses = get_courses()
    print(f"Found {len(courses)} courses")
    
    for c in courses:
        title = c["title"]
        old_cover = c.get("coverImage", "")
        print(f"\n{'='*60}")
        print(f"Course: {title} (ID: {c['id']})")
        print(f"Old cover: {old_cover[:80] if old_cover else 'NONE'}...")
        
        if title in COURSE_COVERS:
            new_url = f"{NEW_CDN_BASE}/{COURSE_COVERS[title]}"
            print(f"New cover: {new_url}")
            
            try:
                status = update_course_cover(c["id"], new_url)
                print(f"  ✅ Updated! Status: {status}")
            except Exception as e:
                print(f"  ❌ Failed: {e}")
        else:
            print(f"  ⏭️  No new cover mapped for this course")
    
    print("\nDone!")
