from supabase import create_client

url = 'https://gsiqibgpimazfivfrtxz.supabase.co'
key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzaXFpYmdwaW1hemZpdmZydHh6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTU4NzkwNCwiZXhwIjoyMDk3MTYzOTA0fQ.XWEA_Y3ng3ryeIGML9IZI3WrfMJnIo7oMgxSf7BpHwo'

supabase = create_client(url, key)

# Check enrollments
enrollments = supabase.table('Enrollment').select('id, userId, courseId, status').execute()
print('=== ENROLLMENTS ===')
for e in enrollments.data:
    print(f'  [{e["status"]}] user={e["userId"][:8]}... course={e["courseId"][:8]}...')

# Check payments
payments = supabase.table('Payment').select('id, enrollmentId, status, userId').execute()
print('=== PAYMENTS ===')
for p in payments.data:
    print(f'  [{p["status"]}] enrollment={p["enrollmentId"][:8]}... user={p["userId"][:8]}...')

# Check UserRegistration
regs = supabase.table('UserRegistration').select('userId, paymentStatus, isApproved').execute()
print('=== USER REGISTRATIONS ===')
for r in regs.data:
    print(f'  [approved={r["isApproved"]}] paymentStatus={r["paymentStatus"]} user={r["userId"][:8]}...')

# Check AdminApprovalQueue
queue = supabase.table('AdminApprovalQueue').select('*').execute()
print('=== ADMIN APPROVAL QUEUE ===')
for q in queue.data:
    print(f'  [isReviewed={q.get("isReviewed")}] paymentId={str(q.get("paymentId",""))[:8]}...')
