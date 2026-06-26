"""Fix the Payment.paymentMethod check constraint."""
import http.client
import json

url = 'gsiqibgpimazfivfrtxz.supabase.co'
key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzaXFpYmdwaW1hemZpdmZydHh6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTU4NzkwNCwiZXhwIjoyMDk3MTYzOTA0fQ.XWEA_Y3ng3ryeIGML9IZI3WrfMJnIo7oMgxSf7BpHwo'

# Use the PostgREST endpoint with a raw SQL query via rpc
# First try to see if pgstalker or another function exists
conn = http.client.HTTPSConnection(url)

# Try direct SQL via the query parameter
headers = {
    'apikey': key,
    'Authorization': 'Bearer ' + key,
    'Content-Type': 'application/json',
}

# Try the SQL endpoint (Supabase Pro feature)
sql_payload = json.dumps({
    'query': '''
    ALTER TABLE "Payment" DROP CONSTRAINT IF EXISTS payment_paymentmethod_check;
    ALTER TABLE "Payment" ADD CONSTRAINT payment_paymentmethod_check 
    CHECK ("paymentMethod" IN ('telebirr', 'cb_birr', 'bank_transfer', 'laki_pay', 'paypal', 'creditcard'));
    '''
})

conn.request('POST', '/rest/v1/rpc/', sql_payload, headers)
res = conn.getresponse()
print('RPC result:', res.status, res.read().decode()[:200])
