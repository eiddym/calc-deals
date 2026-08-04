-- CreateTable
CREATE TABLE "DealSession" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "contractGrossAmount" DECIMAL(14,2) NOT NULL,
    "companyPct" DECIMAL(5,2) NOT NULL,
    "externalPct" DECIMAL(5,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealSession_pkey" PRIMARY KEY ("id")
);
