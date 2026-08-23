-- Replace legacy Laki Pay columns and payment method value with PayPal.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Payment'
      AND column_name = 'lakiPayTransactionId'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Payment'
      AND column_name = 'paypalOrderId'
  ) THEN
    ALTER TABLE "Payment" RENAME COLUMN "lakiPayTransactionId" TO "paypalOrderId";
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Payment'
      AND column_name = 'lakiPayStatus'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Payment'
      AND column_name = 'paypalStatus'
  ) THEN
    ALTER TABLE "Payment" RENAME COLUMN "lakiPayStatus" TO "paypalStatus";
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Payment'
      AND column_name = 'paypalOrderId'
  ) THEN
    ALTER TABLE "Payment" ADD COLUMN "paypalOrderId" TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Payment'
      AND column_name = 'paypalStatus'
  ) THEN
    ALTER TABLE "Payment" ADD COLUMN "paypalStatus" TEXT;
  END IF;
END $$;

DO $$
DECLARE constraint_name text;
BEGIN
  FOR constraint_name IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = '"Payment"'::regclass
      AND pg_get_constraintdef(oid) LIKE '%paymentMethod%'
  LOOP
    EXECUTE format('ALTER TABLE "Payment" DROP CONSTRAINT %I', constraint_name);
  END LOOP;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'Payment_paymentMethod_check'
      AND conrelid = '"Payment"'::regclass
  ) THEN
    ALTER TABLE "Payment"
      ADD CONSTRAINT "Payment_paymentMethod_check"
      CHECK ("paymentMethod" IN ('telebirr', 'cb_birr', 'bank_transfer', 'paypal')) NOT VALID;
  END IF;
END $$;
