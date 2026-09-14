-- CreateEnum
CREATE TYPE "Escopo" AS ENUM ('NACIONAL', 'INTERNACIONAL');

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "escopo" "Escopo" NOT NULL DEFAULT 'NACIONAL';

-- CreateIndex
CREATE INDEX "Lead_escopo_idx" ON "Lead"("escopo");
