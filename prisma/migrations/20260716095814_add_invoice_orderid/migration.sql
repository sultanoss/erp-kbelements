-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "orderId" TEXT;

-- CreateIndex
CREATE INDEX "Invoice_orderId_idx" ON "Invoice"("orderId");
