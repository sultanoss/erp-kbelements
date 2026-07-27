-- CreateTable
CREATE TABLE "B2bCustomer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "customerNum" TEXT,
    "address" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL DEFAULT 'konto',
    "paymentInfo" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "B2bCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "B2bCustomer_name_idx" ON "B2bCustomer"("name");
