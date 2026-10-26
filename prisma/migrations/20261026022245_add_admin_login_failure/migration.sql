-- CreateTable
CREATE TABLE "AdminLoginFailure" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminLoginFailure_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminLoginFailure_email_createdAt_idx" ON "AdminLoginFailure"("email", "createdAt");
