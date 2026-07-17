import os
import json
import urllib.request
import urllib.error

url = os.getenv('NEXT_PUBLIC_SUPABASE_URL', '') + '/rest/v1/InPersonTrainingSetting'
key = os.getenv('SUPABASE_SERVICE_ROLE_KEY', '')

payload = [{
    'course_id': '00000000-0000-0000-0000-000000000000',
    'capacity': 1000,
    'registered_count': 0,
    'remaining_spots': 1000,
    'is_active': True,
    'payment_currency': 'ETB',
    'payment_instructions': 'Pay using Telebirr or CBE Birr, then upload your receipt.',
}]

req = urllib.request.Request(
    url,
    data=json.dumps(payload).encode('utf-8'),
    method='POST',
    headers={
        'apikey': key,
        'Authorization': 'Bearer ' + key,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
    },
)

try:
    with urllib.request.urlopen(req, timeout=60) as response:
        body = response.read().decode('utf-8')
        print('status', response.status)
        print(body)
except urllib.error.HTTPError as exc:
    print('http_error', exc.code)
    print(exc.read().decode('utf-8'))
except Exception as exc:
    print('error', repr(exc))
