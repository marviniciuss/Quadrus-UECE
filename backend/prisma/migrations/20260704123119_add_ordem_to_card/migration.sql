-- AlterTable
ALTER TABLE "cards" ADD COLUMN     "id_criador" UUID,
ADD COLUMN     "ordem" INTEGER NOT NULL DEFAULT 0;

-- AddForeignKey
ALTER TABLE "cards" ADD CONSTRAINT "cards_id_criador_fkey" FOREIGN KEY ("id_criador") REFERENCES "usuarios"("id_usuario") ON DELETE SET NULL ON UPDATE CASCADE;
