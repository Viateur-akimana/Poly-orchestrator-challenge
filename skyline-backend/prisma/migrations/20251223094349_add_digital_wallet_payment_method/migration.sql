/*
  Warnings:

  - The values [CRYPTOCURRENCY,CASH_PICKUP] on the enum `PaymentMethodType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "PaymentMethodType_new" AS ENUM ('BANK_TRANSFER', 'CREDIT_CARD', 'DEBIT_CARD', 'MOBILE_MONEY', 'DIGITAL_WALLET', 'OTHER');
ALTER TABLE "TransferOrder" ALTER COLUMN "paymentMethodType" DROP DEFAULT;
ALTER TABLE "TransferOrder" ALTER COLUMN "paymentMethodType" TYPE "PaymentMethodType_new" USING ("paymentMethodType"::text::"PaymentMethodType_new");
ALTER TABLE "PaymentMethod" ALTER COLUMN "type" TYPE "PaymentMethodType_new" USING ("type"::text::"PaymentMethodType_new");
ALTER TYPE "PaymentMethodType" RENAME TO "PaymentMethodType_old";
ALTER TYPE "PaymentMethodType_new" RENAME TO "PaymentMethodType";
DROP TYPE "PaymentMethodType_old";
ALTER TABLE "TransferOrder" ALTER COLUMN "paymentMethodType" SET DEFAULT 'BANK_TRANSFER';
COMMIT;

-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'PENDING_VERIFICATION';
