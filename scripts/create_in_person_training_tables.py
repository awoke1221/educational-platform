import os
import json
import urllib.request
import urllib.error

url = os.getenv('NEXT_PUBLIC_SUPABASE_URL', '') + '/rest/v1/rpc/exec_sql'
key = os.getenv('SUPABASE_SERVICE_ROLE_KEY', '')

if not url or not key:
    raise SystemExit('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')

payload = {
    "query": """
    create table if not exists public.\"InPersonTrainingSetting\" (
      id uuid primary key default gen_random_uuid(),
      course_id uuid not null,
      capacity integer not null default 1000,
      registered_count integer not null default 0,
      remaining_spots integer not null default 1000,
      is_active boolean not null default true,
      payment_currency text not null default 'ETB',
      payment_instructions text null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      constraint in_person_training_setting_course_unique unique (course_id)
    );

    create table if not exists public.\"InPersonTrainingRegistration\" (
      id uuid primary key default gen_random_uuid(),
      course_id uuid not null,
      user_id uuid null,
      full_name text not null,
      phone_number text not null,
      email text null,
      payment_method text not null default 'telebirr',
      payment_receipt_url text null,
      payment_receipt_filename text null,
      payment_status text not null default 'pending' check (payment_status in ('pending','approved','rejected')),
      coupon_code text null,
      registration_status text not null default 'registered' check (registration_status in ('registered','approved','rejected')),
      notes text null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create index if not exists idx_in_person_training_setting_course on public.\"InPersonTrainingSetting\" (course_id);
    create index if not exists idx_in_person_training_registration_course on public.\"InPersonTrainingRegistration\" (course_id);
    create index if not exists idx_in_person_training_registration_status on public.\"InPersonTrainingRegistration\" (payment_status, registration_status);
    """
}

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
