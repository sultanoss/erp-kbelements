-- CreateTable
CREATE TABLE "SkuIncoming" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "arrivalDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SkuIncoming_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SkuIncoming_sku_idx" ON "SkuIncoming"("sku");
