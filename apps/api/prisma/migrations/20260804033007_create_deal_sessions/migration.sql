/*
  Warnings:

  - You are about to drop the `DealSession` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "DealSessionStatus" AS ENUM ('BORRADOR', 'EN_NEGOCIACION', 'ACORDADO', 'CAIDO', 'SUSPENDIDO');

-- DropTable
DROP TABLE "DealSession";

-- CreateTable
CREATE TABLE "deal_sessions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "DealSessionStatus" NOT NULL DEFAULT 'BORRADOR',
    "contractGrossAmount" DECIMAL(14,2) NOT NULL,
    "companyPct" DECIMAL(5,2) NOT NULL,
    "externalPct" DECIMAL(5,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deal_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "deal_sessions_status_idx" ON "deal_sessions"("status");

-- CreateIndex
CREATE INDEX "deal_sessions_updatedAt_idx" ON "deal_sessions"("updatedAt");
