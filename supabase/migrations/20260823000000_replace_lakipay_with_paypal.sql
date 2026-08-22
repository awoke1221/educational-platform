-- Replace legacy Laki Pay columns and payment method value with PayPal.
ALTER TABLE "Payment" RENAME COLUMN "lakiPayTransactionId" TO "paypalOrderId";
ALTER TABLE "Payment" RENAME COLUMN "lakiPayStatus" TO "paypalStatus";

DO $$
DECLARE constraint_name text;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = '"Payment"'::regclass
    AND pg_get_constraintdef(oid) LIKE '%paymentMethod%';
  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE "Payment" DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

ALTER TABLE "Payment"
  ADD CONSTRAINT "Payment_paymentMethod_check"
  CHECK ("paymentMethod" IN ('telebirr', 'cb_birr', 'bank_transfer', 'paypal')) NOT VALID;
