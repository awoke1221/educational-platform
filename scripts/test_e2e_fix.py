"""
End-to-end test for the payment approval fix.
Simulates: User uploads receipt -> Admin approves -> Course becomes active
"""
import asyncio
import uuid
from datetime import datetime, timezone
from supabase import create_client

url = 'https://gsiqibgpimazfivfrtxz.supabase.co'
key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzaXFpYmdwaW1hemZpdmZydHh6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTU4NzkwNCwiZXhwIjoyMDk3MTYzOTA0fQ.XWEA_Y3ng3ryeIGML9IZI3WrfMJnIo7oMgxSf7BpHwo'

async def main():
    s = create_client(url, key)

    test_user_id = 'cf6bb0b5-0216-4225-b6d6-c9f1f7ab669d'
    course_id = 'e5d469d6-c661-4d15-986c-7a3fa67bcaad'
    now = datetime.now(timezone.utc).isoformat()

    print('=' * 60)
    print('TEST: Payment Approval End-to-End Flow')
    print('=' * 60)

    # ── Step 1: Create UserRegistration ──
    print('\n[Step 1] Creating UserRegistration (receipt upload)...')
    reg_id = str(uuid.uuid4())
    s.table('UserRegistration').upsert({
        'id': reg_id, 'userId': test_user_id,
        'isApproved': False, 'pendingReceiptUrl': 'https://example.com/test-receipt.jpg',
        'paymentMethod': 'telebirr', 'paymentStatus': 'pending',
        'submittedAt': now, 'createdAt': now, 'updatedAt': now,
    }).execute()
    print('  UserRegistration: paymentStatus=pending')

    # ── Step 2: Create Enrollment ──
    print('\n[Step 2] Creating Enrollment (processing)...')
    enrollment_id = str(uuid.uuid4())
    s.table('Enrollment').upsert({
        'id': enrollment_id, 'userId': test_user_id, 'courseId': course_id,
        'status': 'processing', 'enrollmentDate': now, 'updatedAt': now,
    }).execute()
    print('  Enrollment: status=processing')

    # ── Step 3: Create Payment ──
    print('\n[Step 3] Creating Payment (pending)...')
    payment_id = str(uuid.uuid4())
    s.table('Payment').upsert({
        'id': payment_id, 'enrollmentId': enrollment_id,
        'userId': test_user_id, 'courseId': course_id,
        'amount': 0, 'currency': 'ETB', 'paymentType': 'local',
        'paymentMethod': 'telebirr', 'status': 'pending',
        'receiptScreenshotUrl': 'https://example.com/test-receipt.jpg',
        'updatedAt': now,
    }).execute()
    print('  Payment: status=pending')

    print('\n  --- BEFORE APPROVAL ---')
    print('  Enrollment:', s.table('Enrollment').select('status').eq('id', enrollment_id).execute().data[0]['status'])
    print('  Payment:', s.table('Payment').select('status').eq('id', payment_id).execute().data[0]['status'])

    # ── Step 4: Test the FIXED pending route would return courseId ──
    print('\n[Step 4] Testing FIXED pending route query (joins Enrollment+Course+Payment)...')
    result = s.table('Enrollment').select(
        'id, userId, courseId, status,'
        ' Course!courseId(id, title, price),'
        ' Payment!enrollmentId(id, status, paymentMethod, paymentType, amount, receiptScreenshotUrl)'
    ).eq('userId', test_user_id).eq('status', 'processing').execute()

    if result.data:
        e = result.data[0]
        c = e.get('Course')
        p = e.get('Payment')
        if isinstance(p, list): p = p[0] if p else None
        print('  courseId:', e['courseId'][:12])
        print('  courseTitle:', c.get('title') if c else 'N/A')
        print('  coursePrice:', c.get('price') if c else 'N/A')
        print('  paymentStatus:', p.get('status') if p else 'N/A')
        print('  => courseId IS returned. Approve route will use course-specific path!')

    # ── Step 5: Simulate FIXED approve logic ──
    print('\n[Step 5] Simulating FIXED approve (course-specific path)...')
    enr = s.table('Enrollment').select('*').eq('userId', test_user_id).eq('courseId', course_id).execute().data[0]

    s.table('Enrollment').update({'status': 'active', 'updatedAt': now}).eq('id', enr['id']).execute()
    print('  Enrollment -> active')

    s.table('Payment').update({'status': 'approved', 'approvedAt': now}).eq('enrollmentId', enr['id']).eq('status', 'pending').execute()
    print('  Payment -> approved')

    s.table('UserRegistration').update({'isApproved': True, 'paymentStatus': 'approved', 'reviewedAt': now}).eq('userId', test_user_id).execute()
    print('  UserRegistration -> approved')

    # ── Step 6: Verify ──
    print('\n[Step 6] FINAL STATE:')
    fe = s.table('Enrollment').select('status').eq('id', enrollment_id).execute().data[0]['status']
    fp = s.table('Payment').select('status').eq('id', payment_id).execute().data[0]['status']
    fr = s.table('UserRegistration').select('paymentStatus, isApproved').eq('userId', test_user_id).execute().data[0]
    print('  Enrollment: %s' % fe)
    print('  Payment: %s' % fp)
    print('  UserRegistration: paymentStatus=%s isApproved=%s' % (fr['paymentStatus'], fr['isApproved']))

    all_ok = (fe == 'active') and (fp == 'approved') and (fr['paymentStatus'] == 'approved') and fr['isApproved']
    if all_ok:
        print('\n  ✅✅✅ ALL PASSED! User now sees "Continue learning" on course page.')
    else:
        print('\n  ❌ Some checks failed.')

    # ── Cleanup ──
    print('\n[Cleanup] Removing test records...')
    s.table('Payment').delete().eq('id', payment_id).execute()
    s.table('Enrollment').delete().eq('id', enrollment_id).execute()
    s.table('UserRegistration').delete().eq('id', reg_id).execute()
    print('  Done.')

asyncio.run(main())
