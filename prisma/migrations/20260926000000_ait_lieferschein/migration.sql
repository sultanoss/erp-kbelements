-- AIT Spedition / Lieferschein System

-- Item: AIT Lager Bestand
ALTER TABLE "Item" ADD COLUMN IF NOT EXISTS "stockAIT" INTEGER NOT NULL DEFAULT 0;

-- AitDeliveryNote: Lieferschein
CREATE TABLE IF NOT EXISTS "AitDeliveryNote" (
  "id"             TEXT NOT NULL,
  "number"         TEXT NOT NULL,
  "pickupDate"     TIMESTAMP(3) NOT NULL,
  "notes"          TEXT,
  "status"         TEXT NOT NULL DEFAULT 'NOT_PICKED_UP',
  "pickedUpAt"     TIMESTAMP(3),
  "signedScanData" BYTEA,
  "signedScanMime" TEXT,
  "userId"         TEXT NOT NULL,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AitDeliveryNote_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "AitDeliveryNote_number_key" ON "AitDeliveryNote"("number");
CREATE INDEX IF NOT EXISTS "AitDeliveryNote_createdAt_idx" ON "AitDeliveryNote"("createdAt");
CREATE INDEX IF NOT EXISTS "AitDeliveryNote_status_idx" ON "AitDeliveryNote"("status");

-- AitDeliveryNoteLine: Lieferschein-Positionen
CREATE TABLE IF NOT EXISTS "AitDeliveryNoteLine" (
  "id"             TEXT NOT NULL,
  "deliveryNoteId" TEXT NOT NULL,
  "sku"            TEXT NOT NULL,
  "description"    TEXT NOT NULL,
  "quantity"       INTEGER NOT NULL,
  CONSTRAINT "AitDeliveryNoteLine_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AitDeliveryNoteLine_deliveryNoteId_fkey"
    FOREIGN KEY ("deliveryNoteId") REFERENCES "AitDeliveryNote"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "AitDeliveryNoteLine_deliveryNoteId_idx" ON "AitDeliveryNoteLine"("deliveryNoteId");
