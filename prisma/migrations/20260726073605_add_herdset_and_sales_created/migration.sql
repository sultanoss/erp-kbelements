-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "herdsetLabel" TEXT,
ADD COLUMN     "isHerdset" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Shipment" ADD COLUMN     "salesCreated" BOOLEAN NOT NULL DEFAULT false;
