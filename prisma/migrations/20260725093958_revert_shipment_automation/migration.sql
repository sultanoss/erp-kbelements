/*
  Warnings:

  - You are about to drop the column `shipmentId` on the `HerdsetSale` table. All the data in the column will be lost.
  - You are about to drop the column `shipmentId` on the `Sale` table. All the data in the column will be lost.
  - You are about to drop the column `isHerdset` on the `Shipment` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "HerdsetSale" DROP COLUMN "shipmentId";

-- AlterTable
ALTER TABLE "Sale" DROP COLUMN "shipmentId";

-- AlterTable
ALTER TABLE "Shipment" DROP COLUMN "isHerdset";
