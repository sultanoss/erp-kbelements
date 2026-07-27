-- CreateTable
CREATE TABLE "PriceColumn" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceColumn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceColumnValue" (
    "id" TEXT NOT NULL,
    "priceColumnId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "price" DOUBLE PRECISION,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriceColumnValue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PriceColumnValue_sku_idx" ON "PriceColumnValue"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "PriceColumnValue_priceColumnId_sku_key" ON "PriceColumnValue"("priceColumnId", "sku");

-- AddForeignKey
ALTER TABLE "PriceColumnValue" ADD CONSTRAINT "PriceColumnValue_priceColumnId_fkey" FOREIGN KEY ("priceColumnId") REFERENCES "PriceColumn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceColumnValue" ADD CONSTRAINT "PriceColumnValue_sku_fkey" FOREIGN KEY ("sku") REFERENCES "Item"("sku") ON DELETE RESTRICT ON UPDATE CASCADE;
