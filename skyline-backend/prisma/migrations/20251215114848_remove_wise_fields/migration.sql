/*
  Warnings:

  - You are about to drop the column `wiseQuoteId` on the `TransferOrder` table. All the data in the column will be lost.
  - You are about to drop the column `wiseTransferId` on the `TransferOrder` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "TransferOrder" DROP COLUMN "wiseQuoteId",
DROP COLUMN "wiseTransferId";
