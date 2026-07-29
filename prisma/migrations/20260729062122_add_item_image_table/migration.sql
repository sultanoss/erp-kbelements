-- CreateTable
CREATE TABLE "ItemImage" (
    "sku" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "contentType" TEXT NOT NULL DEFAULT 'image/jpeg',

    CONSTRAINT "ItemImage_pkey" PRIMARY KEY ("sku")
);

-- AddForeignKey
ALTER TABLE "ItemImage" ADD CONSTRAINT "ItemImage_sku_fkey" FOREIGN KEY ("sku") REFERENCES "Item"("sku") ON DELETE CASCADE ON UPDATE CASCADE;
