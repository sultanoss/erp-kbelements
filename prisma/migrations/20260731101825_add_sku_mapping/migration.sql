-- CreateTable
CREATE TABLE "SkuMapping" (
    "id" TEXT NOT NULL,
    "marketplace" TEXT NOT NULL,
    "marketplaceSku" TEXT NOT NULL,
    "label" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SkuMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkuMappingItem" (
    "id" TEXT NOT NULL,
    "mappingId" TEXT NOT NULL,
    "internalSku" TEXT NOT NULL,

    CONSTRAINT "SkuMappingItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SkuMapping_marketplace_marketplaceSku_key" ON "SkuMapping"("marketplace", "marketplaceSku");

-- AddForeignKey
ALTER TABLE "SkuMappingItem" ADD CONSTRAINT "SkuMappingItem_mappingId_fkey" FOREIGN KEY ("mappingId") REFERENCES "SkuMapping"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkuMappingItem" ADD CONSTRAINT "SkuMappingItem_internalSku_fkey" FOREIGN KEY ("internalSku") REFERENCES "Item"("sku") ON DELETE RESTRICT ON UPDATE CASCADE;
