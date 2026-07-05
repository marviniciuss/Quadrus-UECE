-- CreateTable
CREATE TABLE "comentarios_card" (
    "id_comentario" UUID NOT NULL,
    "id_card" UUID NOT NULL,
    "id_usuario" UUID NOT NULL,
    "conteudo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comentarios_card_pkey" PRIMARY KEY ("id_comentario")
);

-- AddForeignKey
ALTER TABLE "comentarios_card" ADD CONSTRAINT "comentarios_card_id_card_fkey" FOREIGN KEY ("id_card") REFERENCES "cards"("id_card") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comentarios_card" ADD CONSTRAINT "comentarios_card_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;
