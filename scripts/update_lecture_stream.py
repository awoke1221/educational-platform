"""Update lecture video to use new Bunny Stream GUID"""
import urllib.request
import json

SUPABASE_URL = "https://gsiqibgpimazfivfrtxz.supabase.co"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzaXFpYmdwaW1hemZpdmZydHh6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTU4NzkwNCwiZXhwIjoyMDk3MTYzOTA0fQ.XWEA_Y3ng3ryeIGML9IZI3WrfMJnIo7oMgxSf7BpHwo"

# The new Bunny Stream GUID for "Adonay tiktok acadami.mp4"
NEW_STREAM_GUID = "7a24ef5d-ce15-4dd0-af74-3897f6afd998"
LECTURE_ID = "7e2f9e05-ec08-46b1-8c0e-f450f13b8c21"

# Update the lecture
url = f"{SUPABASE_URL}/rest/v1/Lecture?id=eq.{LECTURE_ID}"
data = json.dumps({
    "cloudinaryPublicId": NEW_STREAM_GUID,
    "videoUrl": "",
    "updatedAt": "2026-07-02T00:00:00.000Z"
}).encode()

req = urllib.request.Request(url, data=data, method="PATCH", headers={
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
})

try:
    with urllib.request.urlopen(req) as resp:
        result = json.loads(resp.read().decode())
        print(f"✅ Lecture updated!")
        print(f"   cloudinaryPublicId: {result[0]['cloudinaryPublicId']}")
        print(f"   Bunny Stream GUID: {NEW_STREAM_GUID}")
except Exception as e:
    print(f"❌ Error: {e}")
