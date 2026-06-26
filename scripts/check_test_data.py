import asyncio
from supabase import create_client

url = 'https://gsiqibgpimazfivfrtxz.supabase.co'
key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzaXFpYmdwaW1hemZpdmZydHh6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTU4NzkwNCwiZXhwIjoyMDk3MTYzOTA0fQ.XWEA_Y3ng3ryeIGML9IZI3WrfMJnIo7oMgxSf7BpHwo'

async def main():
    s = create_client(url, key)

    # Check UserRegistration with pending/rejected status
    regs = s.table('UserRegistration').select('userId, paymentStatus, isApproved, pendingReceiptUrl').in_('paymentStatus', ['pending', 'rejected']).execute()
    print('PENDING/REJECTED REGISTRATIONS:', len(regs.data))
    for r in regs.data:
        u = s.table('User').select('email, fullName').eq('id', r['userId']).execute()
        email = u.data[0]['email'] if u.data else '?'
        has_receipt = r['pendingReceiptUrl'] is not None
        print('  [%s] %s receipt=%s' % (r['paymentStatus'], email, has_receipt))

    # Check enrollment for the processing user
    print()
    print('=== PROCESSING ENROLLMENT DETAILS ===')
    enrs = s.table('Enrollment').select('*').eq('status', 'processing').execute()
    for e in enrs.data:
        u = s.table('User').select('email, fullName').eq('id', e['userId']).execute()
        email = u.data[0]['email'] if u.data else '?'
        print('User:', email)
        print('Enrollment ID:', e['id'])
        print('Enrollment:', e)
        reg = s.table('UserRegistration').select('*').eq('userId', e['userId']).execute()
        for r in reg.data:
            print('UserRegistration:', r)
        ps = s.table('Payment').select('*').eq('enrollmentId', e['id']).execute()
        print('Payments:', len(ps.data))
        for p in ps.data:
            print(' ', p)

    # Check all payments
    print()
    print('=== ALL PAYMENTS ===')
    ps = s.table('Payment').select('*').execute()
    for p in ps.data:
        print(' ', p['id'][:12], 'enrollmentId=%s status=%s' % (p['enrollmentId'][:12], p['status']))

asyncio.run(main())
