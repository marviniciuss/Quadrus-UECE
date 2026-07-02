-- AlterTable
ALTER TABLE "cards" ADD COLUMN     "id_coluna" UUID;

-- CreateTable
CREATE TABLE "colunas" (
    "id_coluna" UUID NOT NULL,
    "id_projeto" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "cor" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "colunas_pkey" PRIMARY KEY ("id_coluna")
);

-- CreateTable
CREATE TABLE "etiquetas" (
    "id_etiqueta" UUID NOT NULL,
    "id_projeto" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "cor" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "etiquetas_pkey" PRIMARY KEY ("id_etiqueta")
);

-- CreateTable
CREATE TABLE "_CardToEtiqueta" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "colunas_id_projeto_nome_key" ON "colunas"("id_projeto", "nome");

-- CreateIndex
CREATE UNIQUE INDEX "etiquetas_id_projeto_nome_key" ON "etiquetas"("id_projeto", "nome");

-- CreateIndex
CREATE UNIQUE INDEX "_CardToEtiqueta_AB_unique" ON "_CardToEtiqueta"("A", "B");

-- CreateIndex
CREATE INDEX "_CardToEtiqueta_B_index" ON "_CardToEtiqueta"("B");

-- AddForeignKey
ALTER TABLE "cards" ADD CONSTRAINT "cards_id_coluna_fkey" FOREIGN KEY ("id_coluna") REFERENCES "colunas"("id_coluna") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "colunas" ADD CONSTRAINT "colunas_id_projeto_fkey" FOREIGN KEY ("id_projeto") REFERENCES "projetos"("id_projeto") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "etiquetas" ADD CONSTRAINT "etiquetas_id_projeto_fkey" FOREIGN KEY ("id_projeto") REFERENCES "projetos"("id_projeto") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CardToEtiqueta" ADD CONSTRAINT "_CardToEtiqueta_A_fkey" FOREIGN KEY ("A") REFERENCES "cards"("id_card") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CardToEtiqueta" ADD CONSTRAINT "_CardToEtiqueta_B_fkey" FOREIGN KEY ("B") REFERENCES "etiquetas"("id_etiqueta") ON DELETE CASCADE ON UPDATE CASCADE;
