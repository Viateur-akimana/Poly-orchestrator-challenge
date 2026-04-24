/*
  Warnings:

  - You are about to drop the column `resetTokenExpires` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[sbpOrderId]` on the table `TransferOrder` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[idempotencyKey]` on the table `TransferOrder` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TransferStatus" ADD VALUE 'PENDING_PAYMENT';
ALTER TYPE "TransferStatus" ADD VALUE 'PAID_AWAITING_APPROVAL';

-- AlterTable
ALTER TABLE "TransferOrder" ADD COLUMN     "attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "externalStatus" TEXT,
ADD COLUMN     "idempotencyKey" TEXT,
ADD COLUMN     "lastAttemptAt" TIMESTAMP(3),
ADD COLUMN     "paymentLink" TEXT,
ADD COLUMN     "sbpOrderId" TEXT,
ADD COLUMN     "wiseQuoteId" TEXT,
ADD COLUMN     "wiseTransferId" TEXT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "resetTokenExpires",
ADD COLUMN     "resetTokenExpiry" TIMESTAMP(3),
ADD COLUMN     "verificationTokenExpiry" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "TransferOrder_sbpOrderId_key" ON "TransferOrder"("sbpOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "TransferOrder_idempotencyKey_key" ON "TransferOrder"("idempotencyKey");
