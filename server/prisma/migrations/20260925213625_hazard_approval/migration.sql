-- CreateTable
CREATE TABLE "HazardApproval" (
    "id" TEXT NOT NULL,
    "mineId" TEXT NOT NULL,
    "districtId" TEXT,
    "zoneLabel" TEXT NOT NULL,
    "hazardType" TEXT NOT NULL,
    "emergencyType" TEXT NOT NULL,
    "riskScore" INTEGER NOT NULL,
    "summary" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "raisedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "decidedById" TEXT,
    "decisionNote" TEXT,
    "sosAlertId" TEXT,

    CONSTRAINT "HazardApproval_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HazardApproval_mineId_status_idx" ON "HazardApproval"("mineId", "status");

-- CreateIndex
CREATE INDEX "HazardApproval_raisedAt_idx" ON "HazardApproval"("raisedAt");

-- AddForeignKey
ALTER TABLE "HazardApproval" ADD CONSTRAINT "HazardApproval_mineId_fkey" FOREIGN KEY ("mineId") REFERENCES "Mine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HazardApproval" ADD CONSTRAINT "HazardApproval_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HazardApproval" ADD CONSTRAINT "HazardApproval_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
