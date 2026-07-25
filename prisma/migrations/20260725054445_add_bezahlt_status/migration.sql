-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "bezahlt" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "bezahltAt" TIMESTAMP(3);
