-- CreateTable
CREATE TABLE "B2cCustomer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "B2cCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "B2cCustomer_name_idx" ON "B2cCustomer"("name");
