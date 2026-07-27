-- AlterTable
ALTER TABLE "HerdsetSale" ADD COLUMN     "orderId" TEXT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "note" TEXT;

-- CreateIndex
CREATE INDEX "HerdsetSale_orderId_idx" ON "HerdsetSale"("orderId");
