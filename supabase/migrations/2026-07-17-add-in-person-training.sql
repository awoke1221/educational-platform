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
