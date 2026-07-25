-- AlterTable
ALTER TABLE "HerdsetSale" ADD COLUMN     "shipmentId" TEXT;

-- AlterTable
ALTER TABLE "Shipment" ADD COLUMN     "isHerdset" BOOLEAN NOT NULL DEFAULT false;
