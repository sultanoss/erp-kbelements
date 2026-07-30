-- CreateTable
CREATE TABLE "LaterShipment" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "note" TEXT,
    "shippingDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LaterShipment_pkey" PRIMARY KEY ("id")
);
