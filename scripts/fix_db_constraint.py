"""Fix Payment.paymentMethod check constraint via Supabase Management API."""
import http.client
import json

supabase_ref = 'gsiqibgpimazfivfrtxz'
key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzaXFpYmdwaW1hemZpdmZydHh6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTU4NzkwNCwiZXhwIjoyMDk3MTYzOTA0fQ.XWEA_Y3ng3ryeIGML9IZI3WrfMJnIo7oMgxSf7BpHwo'

sql_query = '''
ALTER TABLE "Payment" DROP CONSTRAINT IF EXISTS payment_paymentmethod_check;
ALTER TABLE "Payment" ADD CONSTRAINT payment_paymentmethod_check
CHECK ("paymentMethod" IN ('telebirr','cb_birr','bank_transfer','laki_pay','paypal','creditcard'));
'''

conn = http.client.HTTPSConnection('api.supabase.com')
headers = {
    'Authorization': 'Bearer ' + key,
    'Content-Type': 'application/json',
}
payload = json.dumps({'query': sql_query})
conn.request('POST', '/platform/database/query', payload.encode(), headers)
res = conn.getresponse()
body = res.read().decode()
print('Status:', res.status)
print('Body:', body[:500])
