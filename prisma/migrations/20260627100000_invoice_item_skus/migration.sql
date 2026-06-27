-- CreateTable InvoiceItemSku
CREATE TABLE "InvoiceItemSku" (
    "id" TEXT NOT NULL,
    "invoiceItemId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "lager" TEXT NOT NULL DEFAULT 'neuware',
    CONSTRAINT "InvoiceItemSku_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "InvoiceItemSku" ADD CONSTRAINT "InvoiceItemSku_invoiceItemId_fkey"
    FOREIGN KEY ("invoiceItemId") REFERENCES "InvoiceItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing artNr/lager data into InvoiceItemSku
INSERT INTO "InvoiceItemSku" ("id", "invoiceItemId", "sku", "lager")
SELECT gen_random_uuid()::text, "id", "artNr", COALESCE("lager", 'neuware')
FROM "InvoiceItem"
WHERE "artNr" IS NOT NULL AND "artNr" != '';

-- DropColumns
ALTER TABLE "InvoiceItem" DROP COLUMN IF EXISTS "artNr";
ALTER TABLE "InvoiceItem" DROP COLUMN IF EXISTS "lager";
