-- AlterTable
ALTER TABLE "cards" ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
