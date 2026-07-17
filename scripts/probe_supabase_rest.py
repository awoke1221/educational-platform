import os
import urllib.request
import urllib.error

url = os.getenv('NEXT_PUBLIC_SUPABASE_URL', '') + '/rest/v1/InPersonTrainingSetting?select=id'
key = os.getenv('SUPABASE_SERVICE_ROLE_KEY', '')

req = urllib.request.Request(
    url,
    method='GET',
    headers={
        'apikey': key,
        'Authorization': 'Bearer ' + key,
        'Content-Type': 'application/json',
    },
)

try:
    with urllib.request.urlopen(req, timeout=20) as response:
        print('status', response.status)
        print(response.read().decode('utf-8'))
except urllib.error.HTTPError as exc:
    print('http_error', exc.code)
    print(exc.read().decode('utf-8'))
except Exception as exc:
    print('error', repr(exc))
