import os
import sys
import psycopg2
from urllib.parse import urlparse, unquote

DATABASE_URL = os.getenv(
    'DATABASE_URL',
    'postgresql://postgres.gsiqibgpimazfivfrtxz:AdoniLMS12%24%24@aws-0-us-east-1.pooler.supabase.com:6543/postgres',
)
MIGRATION_FILE = sys.argv[1] if len(sys.argv) > 1 else 'supabase/migrations/20260707000001_add_diaspora_coaching_fields.sql'

parsed = urlparse(DATABASE_URL)
password = unquote(parsed.password)
host = parsed.hostname
port = parsed.port
user = parsed.username
dbname = parsed.path.lstrip('/')

print(f'Connecting to {host}:{port} as {user}...')

conn = psycopg2.connect(
    host=host,
    port=port,
    user=user,
    password=password,
    dbname=dbname,
    connect_timeout=10
)
conn.autocommit = True

with open(MIGRATION_FILE, 'r', encoding='utf-8') as f:
    sql = f.read()

cur = conn.cursor()
cur.execute(sql)
print('Migration applied successfully!')

cur.execute("""
    SELECT column_name, data_type, is_nullable 
    FROM information_schema.columns 
    WHERE table_name = 'commingsoon_users' 
    ORDER BY ordinal_position;
""")
columns = cur.fetchall()
print()
print('commingsoon_users columns:')
for col in columns:
    print(f'  {col[0]:20s} {col[1]:15s} nullable={col[2]}')

# Also verify the function exists
cur.execute("""
    SELECT proname, proargnames::text 
    FROM pg_proc 
    WHERE proname = 'fast_register_commingsoon';
""")
funcs = cur.fetchall()
if funcs:
    print()
    print('Stored procedure updated:')
    for f in funcs:
        print(f'  {f[0]} - args: {f[1]}')

cur.close()
conn.close()
