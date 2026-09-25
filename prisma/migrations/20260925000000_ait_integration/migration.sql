-- AIT Home Delivery Integration
-- Shipment: neue AIT-Felder
ALTER TABLE "Shipment" ADD COLUMN IF NOT EXISTS "aitConsignmentNo" TEXT;
ALTER TABLE "Shipment" ADD COLUMN IF NOT EXISTS "aitSelfServiceId" TEXT;
ALTER TABLE "Shipment" ADD COLUMN IF NOT EXISTS "aitTrackingIds" TEXT;
ALTER TABLE "Shipment" ADD COLUMN IF NOT EXISTS "aitStatus" TEXT;

-- Item: AIT-Dimensionsfelder
ALTER TABLE "Item" ADD COLUMN IF NOT EXISTS "aitWeight" DOUBLE PRECISION;
ALTER TABLE "Item" ADD COLUMN IF NOT EXISTS "aitHeight" INTEGER;
ALTER TABLE "Item" ADD COLUMN IF NOT EXISTS "aitWidth" INTEGER;
ALTER TABLE "Item" ADD COLUMN IF NOT EXISTS "aitDepth" INTEGER;

-- AitReceipt: neues Modell für Wareneingänge
CREATE TABLE IF NOT EXISTS "AitReceipt" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sku" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "notes" TEXT,
    "userId" TEXT NOT NULL,
    "receiptId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AitReceipt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AitReceipt_sku_idx" ON "AitReceipt"("sku");
CREATE INDEX IF NOT EXISTS "AitReceipt_date_idx" ON "AitReceipt"("date");
