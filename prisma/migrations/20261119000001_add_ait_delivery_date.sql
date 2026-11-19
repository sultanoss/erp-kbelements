-- Add AIT delivery date and Saturday delivery flag to Shipment
ALTER TABLE "Shipment" ADD COLUMN IF NOT EXISTS "aitDeliveryDate" TEXT;
ALTER TABLE "Shipment" ADD COLUMN IF NOT EXISTS "aitSaturdayDelivery" BOOLEAN NOT NULL DEFAULT false;
