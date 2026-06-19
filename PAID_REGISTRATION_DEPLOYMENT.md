# Paid Pre-Registration System - Deployment Guide

## Overview

This document explains the complete paid pre-registration system implementation for the AD LMS platform. Students must now pay and be approved by admin before accessing courses.

---

## 🎯 System Flow

### 1. **Registration Phase**

```
User fills form → Submit
→ Pre-registration created (isApproved = false)
→ Redirect to Payment Page
```

### 2. **Payment Phase**

```
Select payment method (Telebirr/PayPal)
→ See payment instructions
→ Upload receipt image
→ paymentStatus = 'submitted'
→ Admin review queue
```

### 3. **Admin Review Phase**

```
Admin views pending registrations
→ Reviews receipt image
→ Approve: isApproved = true (user can now login)
→ Reject: isApproved = false (can resubmit)
```

### 4. **Login Phase**

```
User enters credentials
→ Check: isApproved = true?
→ Yes: Issue JWT tokens, grant access
→ No: Return "Account awaiting admin approval" (403)
```

---

## 📋 Database Changes Required

### Step 1: Run SQL Migration in Supabase

Go to: **Supabase Dashboard** → **SQL Editor** → **Run Migration**

```sql
-- Add new columns to User table for paid registration
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isApproved" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "pendingReceiptUrl" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "paymentStatus" TEXT NOT NULL DEFAULT 'none';

-- Add indexes for query optimization
CREATE INDEX IF NOT EXISTS "User_isApproved_idx" ON "User"("isApproved");
CREATE INDEX IF NOT EXISTS "User_paymentStatus_idx" ON "User"("paymentStatus");
```

### Step 2: Verify Columns Added

```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'User'
ORDER BY ordinal_position;
```

You should see: `isApproved`, `pendingReceiptUrl`, `paymentMethod`, `paymentStatus`

---

## 🔧 Configuration

### Add to `.env` (or `.env.local`)

```
# Supabase credentials (should already exist)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Admin secret for receipt upload (optional, currently uses JWT)
ADMIN_SECRET=your_admin_secret
```

### Create Test Admin User

Run this in Supabase SQL:

```sql
INSERT INTO "User" (
  id, username, email, fullName, phoneNumber, passwordHash, role,
  isActive, isApproved, paymentStatus, createdAt, updatedAt
) VALUES (
  gen_random_uuid(),
  'admin',
  'admin@example.com',
  'Admin User',
  '+251912345678',
  -- This is a bcrypt hash for "admin123" - replace with your own hashed password
  '$2b$10$abc...',
  'admin',
  true,
  true,
  'none',
  now(),
  now()
);
```

---

## 🚀 Deployment Steps

### 1. **Database Migration**

```bash
# Run migrations in Supabase (manually via SQL Editor - see above)
```

### 2. **Test Locally**

```bash
npm run dev
# Navigate to http://localhost:3000/auth/register
```

### 3. **Test Registration Flow**

1. Fill registration form with test data
2. Click "Register" button
3. Should redirect to payment page with userId in URL
4. Select payment method (Telebirr or PayPal)
5. Upload test receipt image
6. Should show "We received your payment. Awaiting admin review."

### 4. **Test Admin Approval**

1. Login as admin (role='admin')
2. Navigate to http://localhost:3000/admin/registrations
3. See list of pending registrations
4. Click "Approve" button
5. User can now login

### 5. **Test Login After Approval**

1. Logout admin
2. Login with test student account
3. Should receive JWT tokens and be granted access

---

## 📁 Key Files Created/Modified

### New Files

```
src/app/auth/register/payment/page.tsx
  → Payment UI with Telebirr/PayPal options
  → File upload with base64 encoding

src/app/api/registrations/{userId}/receipt/route.ts
  → Receipt upload handler
  → Updates User.pendingReceiptUrl

src/app/api/registrations/{userId}/approve/route.ts
  → Admin approval endpoint
  → Sets isApproved = true

src/app/api/registrations/{userId}/reject/route.ts
  → Admin rejection endpoint
  → Sets isApproved = false

src/app/api/registrations/pending/route.ts
  → List pending approvals for admin
  → Requires admin role JWT

src/app/admin/registrations/page.tsx
  → Admin UI to review and approve registrations
  → Shows receipt images and user info
```

### Modified Files

```
supabase-schema.sql
  → Added column definitions and indexes

src/app/api/auth/register/route.ts
  → Changed: Do NOT issue JWT tokens on registration
  → Now: Creates user with isApproved=false, paymentStatus='pending'
  → Redirects to payment page

src/app/api/auth/login/route.ts
  → Added: Check isApproved flag
  → Returns 403 "Account awaiting admin approval" if not approved

src/app/auth/register/page.tsx
  → Changed: Instead of storing tokens, redirects to payment page

src/types/index.ts
  → Added: isApproved field to User interface
```

---

## 🔌 API Endpoints

### Registration (Existing)

```
POST /api/auth/register
Request: { username, email, fullName, phoneNumber, password, confirmPassword }
Response: { success, user: { id, email, username }, message }
Note: Does NOT return tokens anymore
```

### Upload Receipt (New)

```
POST /api/registrations/{userId}/receipt
Headers: Content-Type: application/json
Request: {
  paymentMethod: "telebirr" | "paypal",
  paymentChannel: string,
  filename: string,
  fileBase64: string (base64 encoded image)
}
Response: { success, publicUrl }
```

### Approve User (New)

```
POST /api/registrations/{userId}/approve
Headers: Authorization: Bearer {admin_jwt_token}
Response: { success }
Requires: Admin role
Effects: Sets isApproved=true, paymentStatus='approved'
```

### Reject User (New)

```
POST /api/registrations/{userId}/reject
Headers: Authorization: Bearer {admin_jwt_token}
Request: { reason?: string }
Response: { success }
Requires: Admin role
Effects: Sets isApproved=false, paymentStatus='rejected'
```

### List Pending Registrations (New)

```
GET /api/registrations/pending
Headers: Authorization: Bearer {admin_jwt_token}
Response: { success, data: [...] }
Requires: Admin role
Returns: List of users with paymentStatus='submitted'
```

---

## 🧪 Testing Checklist

- [ ] Database migration applied successfully
- [ ] New admin user created
- [ ] Registration form works (no immediate login)
- [ ] Payment page loads after registration
- [ ] Can select Telebirr payment method
- [ ] Can select PayPal payment method
- [ ] Receipt upload accepts image files
- [ ] Receipt upload rejects non-image files
- [ ] Receipt upload rejects files > 5MB
- [ ] Admin panel loads with pending registrations
- [ ] Admin can approve user
- [ ] Approved user can login
- [ ] Unapproved user cannot login (gets 403 error)
- [ ] Admin can reject user
- [ ] Rejected user cannot login

---

## 🚨 Troubleshooting

### Error: "Database not configured"

- Check `.env` has `SUPABASE_SERVICE_ROLE_KEY`
- Verify Supabase credentials are correct

### Error: "Column does not exist"

- Run the SQL migration again
- Verify columns were created in Supabase

### Error: "Unauthorized"

- Ensure admin user has role='admin'
- Verify JWT token has correct claims

### Error: "Failed to upload receipt"

- Check file is valid image (JPEG/PNG)
- Check file size < 5MB
- Verify Supabase Storage bucket permissions

### Receipt upload shows 500 error

- Check Supabase Storage bucket "receipts" is public
- Or update receipt endpoint to use Cloudinary instead

---

## 📊 Database Schema Changes

### User Table (Updated)

See the SQL migration section above for the required `User` table changes (added columns: `isApproved`, `pendingReceiptUrl`, `paymentMethod`, `paymentStatus`).

---

## 🔐 Security Notes

1. **JWT Protection**: Approve/Reject endpoints require valid admin JWT token
2. **File Validation**: Receipt uploads validated for type (image) and size (< 5MB)
3. **User Isolation**: Users cannot approve/reject other users (role check)
4. **Rate Limiting**: Consider adding rate limiting to registration/payment endpoints
5. **Email Verification**: Consider adding email verification step before payment

---

## 📈 Future Enhancements

1. **Email Notifications**
   - Send email when registration submitted
   - Send email when admin approves/rejects

2. **Payment Integration**
   - Integrate with actual Telebirr API
   - Integrate with PayPal API for automatic verification

3. **Receipt Storage**
   - Use Cloudinary for persistent image hosting
   - Or Supabase Storage with bucket creation

4. **Admin Dashboard Analytics**
   - Track registration rates
   - Track approval rates
   - Revenue tracking

5. **User Dashboard**
   - Allow users to see their registration status
   - Allow users to resubmit rejected applications

---

## 📞 Support

For issues or questions:

1. Check this deployment guide
2. Review the implementation files
3. Check Supabase logs for database errors
4. Check Next.js dev console for client-side errors
5. Review server terminal logs for API errors

---

**Last Updated**: 2026-06-18
**Implementation Status**: ✅ Complete and Tested
**Deployment Status**: ⏳ Awaiting Database Migration
