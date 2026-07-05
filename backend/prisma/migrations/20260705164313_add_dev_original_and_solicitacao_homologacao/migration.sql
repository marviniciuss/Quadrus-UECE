-- AlterTable
ALTER TABLE "cards" ADD COLUMN     "id_dev_original" UUID;

-- AlterTable
ALTER TABLE "notificacoes" ADD COLUMN     "solicitacao_homologacao" BOOLEAN NOT NULL DEFAULT false;
