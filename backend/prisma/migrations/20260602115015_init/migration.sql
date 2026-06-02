-- CreateEnum
CREATE TYPE "Perfil" AS ENUM ('ADMIN', 'GERENTE', 'PO', 'DEV', 'TESTER');

-- CreateEnum
CREATE TYPE "StatusCard" AS ENUM ('A_FAZER', 'EM_ANDAMENTO', 'HOMOLOGACAO', 'CONCLUIDO');

-- CreateEnum
CREATE TYPE "Prioridade" AS ENUM ('ALTA', 'MEDIA', 'BAIXA');

-- CreateEnum
CREATE TYPE "StatusSprint" AS ENUM ('PLANEJAMENTO', 'ATIVA', 'CONCLUIDA');

-- CreateEnum
CREATE TYPE "TipoAnexo" AS ENUM ('ARQUIVO', 'LINK_EXTERNO');

-- CreateEnum
CREATE TYPE "TipoAcao" AS ENUM ('MOVIMENTACAO', 'COMENTARIO', 'ALERTA', 'CRIACAO');

-- CreateTable
CREATE TABLE "usuarios" (
    "id_usuario" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id_usuario")
);

-- CreateTable
CREATE TABLE "projetos" (
    "id_projeto" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "data_prazo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projetos_pkey" PRIMARY KEY ("id_projeto")
);

-- CreateTable
CREATE TABLE "membros_projeto" (
    "id_membro" UUID NOT NULL,
    "id_projeto" UUID NOT NULL,
    "id_usuario" UUID NOT NULL,
    "perfil" "Perfil" NOT NULL DEFAULT 'DEV',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "membros_projeto_pkey" PRIMARY KEY ("id_membro")
);

-- CreateTable
CREATE TABLE "sprints" (
    "id_sprint" UUID NOT NULL,
    "id_projeto" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "data_inicio" TIMESTAMP(3),
    "data_fim" TIMESTAMP(3),
    "status" "StatusSprint" NOT NULL DEFAULT 'PLANEJAMENTO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sprints_pkey" PRIMARY KEY ("id_sprint")
);

-- CreateTable
CREATE TABLE "cards" (
    "id_card" UUID NOT NULL,
    "id_projeto" UUID NOT NULL,
    "id_sprint" UUID,
    "id_responsavel" UUID,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "prioridade" "Prioridade" NOT NULL DEFAULT 'MEDIA',
    "status" "StatusCard" NOT NULL DEFAULT 'A_FAZER',
    "story_points" INTEGER,
    "em_risco" BOOLEAN NOT NULL DEFAULT false,
    "deletado_em" TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cards_pkey" PRIMARY KEY ("id_card")
);

-- CreateTable
CREATE TABLE "anexos_card" (
    "id_anexo" UUID NOT NULL,
    "id_card" UUID NOT NULL,
    "nome_arquivo" TEXT NOT NULL,
    "url_arquivo" TEXT NOT NULL,
    "tipo_anexo" "TipoAnexo" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "anexos_card_pkey" PRIMARY KEY ("id_anexo")
);

-- CreateTable
CREATE TABLE "votos_poker" (
    "id_voto" UUID NOT NULL,
    "id_card" UUID NOT NULL,
    "id_usuario" UUID NOT NULL,
    "valor" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "votos_poker_pkey" PRIMARY KEY ("id_voto")
);

-- CreateTable
CREATE TABLE "notificacoes" (
    "id_notificacao" UUID NOT NULL,
    "id_usuario_destino" UUID NOT NULL,
    "id_card_origem" UUID NOT NULL,
    "mensagem" TEXT NOT NULL,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notificacoes_pkey" PRIMARY KEY ("id_notificacao")
);

-- CreateTable
CREATE TABLE "log_acoes" (
    "id_log" UUID NOT NULL,
    "id_usuario" UUID NOT NULL,
    "id_card" UUID,
    "id_sprint" UUID,
    "acao" TEXT NOT NULL,
    "tipo_acao" "TipoAcao" NOT NULL,
    "status_log" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "log_acoes_pkey" PRIMARY KEY ("id_log")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "membros_projeto_id_projeto_id_usuario_key" ON "membros_projeto"("id_projeto", "id_usuario");

-- CreateIndex
CREATE UNIQUE INDEX "votos_poker_id_card_id_usuario_key" ON "votos_poker"("id_card", "id_usuario");

-- AddForeignKey
ALTER TABLE "membros_projeto" ADD CONSTRAINT "membros_projeto_id_projeto_fkey" FOREIGN KEY ("id_projeto") REFERENCES "projetos"("id_projeto") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membros_projeto" ADD CONSTRAINT "membros_projeto_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sprints" ADD CONSTRAINT "sprints_id_projeto_fkey" FOREIGN KEY ("id_projeto") REFERENCES "projetos"("id_projeto") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cards" ADD CONSTRAINT "cards_id_projeto_fkey" FOREIGN KEY ("id_projeto") REFERENCES "projetos"("id_projeto") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cards" ADD CONSTRAINT "cards_id_sprint_fkey" FOREIGN KEY ("id_sprint") REFERENCES "sprints"("id_sprint") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cards" ADD CONSTRAINT "cards_id_responsavel_fkey" FOREIGN KEY ("id_responsavel") REFERENCES "usuarios"("id_usuario") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anexos_card" ADD CONSTRAINT "anexos_card_id_card_fkey" FOREIGN KEY ("id_card") REFERENCES "cards"("id_card") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votos_poker" ADD CONSTRAINT "votos_poker_id_card_fkey" FOREIGN KEY ("id_card") REFERENCES "cards"("id_card") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votos_poker" ADD CONSTRAINT "votos_poker_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_id_usuario_destino_fkey" FOREIGN KEY ("id_usuario_destino") REFERENCES "usuarios"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_id_card_origem_fkey" FOREIGN KEY ("id_card_origem") REFERENCES "cards"("id_card") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "log_acoes" ADD CONSTRAINT "log_acoes_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "log_acoes" ADD CONSTRAINT "log_acoes_id_card_fkey" FOREIGN KEY ("id_card") REFERENCES "cards"("id_card") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "log_acoes" ADD CONSTRAINT "log_acoes_id_sprint_fkey" FOREIGN KEY ("id_sprint") REFERENCES "sprints"("id_sprint") ON DELETE SET NULL ON UPDATE CASCADE;
