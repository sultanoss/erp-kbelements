-- AlterTable
ALTER TABLE "ActivityLog" ADD COLUMN "correctionId" TEXT;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_correctionId_fkey" FOREIGN KEY ("correctionId") REFERENCES "Correction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
