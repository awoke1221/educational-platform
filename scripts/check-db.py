import asyncio
from supabase import create_client

url = 'https://gsiqibgpimazfivfrtxz.supabase.co'
key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzaXFpYmdwaW1hemZpdmZydHh6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTU4NzkwNCwiZXhwIjoyMDk3MTYzOTA0fQ.XWEA_Y3ng3ryeIGML9IZI3WrfMJnIo7oMgxSf7BpHwo'

async def main():
    client = create_client(url, key)
    
    # 1. All courses
    result = client.table('Course').select('*', count='exact').execute()
    print('=== ALL COURSES IN DATABASE ===')
    print(f'Total count: {len(result.data)}')
    for c in result.data:
        status = 'PUBLISHED' if c['isPublished'] else 'DRAFT'
        Archived = 'ARCHIVED' if c.get('isArchived') else ''
        print(f'  [{c["id"]}] {c["title"]}')
        print(f'      Price: {c["price"]} ETB | Level: {c["level"]} | Category: {c.get("category","-")}')
        print(f'      Status: {status} {Archived} | Enrolled: {c["enrollmentCount"]} | Videos: {c["videoCount"]}')
        print()
    
    # 2. Published only
    pub = client.table('Course').select('*', count='exact').eq('isPublished', True).execute()
    print(f'PUBLISHED COURSES: {len(pub.data)}')
    
    # 3. Draft only
    draft = client.table('Course').select('*', count='exact').eq('isPublished', False).execute()
    print(f'DRAFT COURSES: {len(draft.data)}')
    
    # 4. Lectures
    lec = client.table('Lecture').select('*', count='exact').execute()
    print(f'\nLECTURES: {len(lec.data)}')
    
    # 5. Users
    users = client.table('User').select('*', count='exact').execute()
    print(f'\nUSERS: {len(users.data)}')
    
    # 6. Enrollments
    enroll = client.table('Enrollment').select('*', count='exact').execute()
    print(f'\nENROLLMENTS: {len(enroll.data)}')

asyncio.run(main())
