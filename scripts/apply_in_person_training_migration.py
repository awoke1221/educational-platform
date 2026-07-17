import os
import re
import psycopg2
from urllib.parse import urlparse, unquote


def load_env(path: str) -> dict[str, str]:
    values: dict[str, str] = {}
    if os.path.exists(path):
        for line in open(path, encoding='utf-8'):
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            if '=' in line:
                key, value = line.split('=', 1)
                values[key.strip()] = value.strip().strip('"').strip("'")
    return values


env = load_env(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))
url = os.getenv('DATABASE_URL') or env.get('DATABASE_URL')
if not url:
    raise SystemExit('DATABASE_URL not found')

parsed = urlparse(url)
password = unquote(parsed.password)
conn = psycopg2.connect(
    host=parsed.hostname,
    port=parsed.port or 5432,
    user=parsed.username,
    password=password,
    dbname=parsed.path.lstrip('/'),
    connect_timeout=20,
    sslmode='require',
)
conn.autocommit = True
cur = conn.cursor()

sql = '''
create table if not exists public."InPersonTrainingSetting" (
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

create table if not exists public."InPersonTrainingRegistration" (
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

create index if not exists idx_in_person_training_setting_course on public."InPersonTrainingSetting" (course_id);
create index if not exists idx_in_person_training_registration_course on public."InPersonTrainingRegistration" (course_id);
create index if not exists idx_in_person_training_registration_status on public."InPersonTrainingRegistration" (payment_status, registration_status);
'''
cur.execute(sql)
print('Migration applied successfully')
cur.close()
conn.close()
