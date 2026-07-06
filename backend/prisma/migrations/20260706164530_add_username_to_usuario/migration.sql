-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN "username" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_username_key" ON "usuarios"("username");
