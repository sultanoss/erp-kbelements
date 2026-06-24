-- CreateTable
CREATE TABLE "HerdsetSale" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "marketplace" "Marketplace" NOT NULL,
    "label" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HerdsetSale_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HerdsetSale_date_idx" ON "HerdsetSale"("date");

-- AddForeignKey
ALTER TABLE "HerdsetSale" ADD CONSTRAINT "HerdsetSale_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
