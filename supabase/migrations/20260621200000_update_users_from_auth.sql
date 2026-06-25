-- Migration: populate User.fullName and User.phoneNumber from auth.users metadata
-- Run this in Supabase SQL editor AFTER you've applied the main schema (supabase-schema.sql)

-- Update fullName and phoneNumber for users created via OAuth (Google)
-- This reads common metadata keys from auth.users.user_metadata and raw_user_meta_data

UPDATE "User" u
SET
  "fullName" = COALESCE(NULLIF(u."fullName", ''),
                          a.user_metadata->> 'full_name',
                          a.user_metadata->> 'name',
                          a.raw_user_meta_data->> 'full_name',
                          a.raw_user_meta_data->> 'name'),
  "phoneNumber" = COALESCE(NULLIF(u."phoneNumber", ''),
                            a.user_metadata->> 'phone',
                            a.user_metadata->> 'phone_number',
                            a.raw_user_meta_data->> 'phone',
                            a.raw_user_meta_data->> 'phone_number')
FROM auth.users a
WHERE u.id = a.id
  AND (u."fullName" IS NULL OR u."fullName" = '' OR u."phoneNumber" IS NULL OR u."phoneNumber" = '');

-- Verify updates
-- SELECT id, username, email, "fullName", "phoneNumber" FROM "User" ORDER BY createdAt DESC LIMIT 50;
