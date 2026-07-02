import prisma from "../lib/prisma.js";
import { obterMembroProjeto } from "../utils/projetoAuth.js";
import { garantirCustomizacaoInicial } from "../utils/garantirCustomizacaoInicial.js";

/**
 * CRIAR COLUNA
 */
export const criarColuna = async (req, res) => {
  const { idProjeto } = req.params;
  const { nome, cor } = req.body;

  try {
    if (!nome || !cor) {
      return res.status(400).json({ error: "Nome e cor são obrigatórios" });
    }

    const membro = await obterMembroProjeto(idProjeto, req.user.email);
    if (!membro || (membro.perfil !== "PO" && membro.perfil !== "GERENTE")) {
      return res.status(403).json({ error: "Acesso negado: apenas PO e Gerentes podem gerenciar colunas" });
    }

    // Garantir customização inicial das colunas padrão
    await garantirCustomizacaoInicial(idProjeto);

    // Obter maior ordem existente
    const ultimaColuna = await prisma.coluna.findFirst({
      where: { id_projeto: idProjeto },
      orderBy: { ordem: "desc" },
    });
    const novaOrdem = ultimaColuna ? ultimaColuna.ordem + 1 : 0;

    const novaColuna = await prisma.coluna.create({
      data: {
        id_projeto: idProjeto,
        nome,
        cor,
        ordem: novaOrdem,
      },
    });

    return res.status(201).json(novaColuna);
  } catch (error) {
    console.error("Erro ao criar coluna:", error);
    return res.status(500).json({ error: "Erro ao criar coluna" });
  }
};

/**
 * ATUALIZAR COLUNA
 */
export const atualizarColuna = async (req, res) => {
  const { id } = req.params;
  const { nome, cor } = req.body;

  try {
    const coluna = await prisma.coluna.findUnique({
      where: { id_coluna: id },
    });

    if (!coluna) {
      return res.status(404).json({ error: "Coluna não encontrada" });
    }

    const membro = await obterMembroProjeto(coluna.id_projeto, req.user.email);
    if (!membro || (membro.perfil !== "PO" && membro.perfil !== "GERENTE")) {
      return res.status(403).json({ error: "Acesso negado: apenas PO e Gerentes podem gerenciar colunas" });
    }

    // Garantir customização inicial
    await garantirCustomizacaoInicial(coluna.id_projeto);

    const colunaAtualizada = await prisma.coluna.update({
      where: { id_coluna: id },
      data: {
        ...(nome && { nome }),
        ...(cor && { cor }),
      },
    });

    return res.json(colunaAtualizada);
  } catch (error) {
    console.error("Erro ao atualizar coluna:", error);
    return res.status(500).json({ error: "Erro ao atualizar coluna" });
  }
};

/**
 * REORDENAR COLUNAS
 */
export const reordenarColunas = async (req, res) => {
  const { idProjeto } = req.params;
  const { idsColunas } = req.body; // Array com IDs das colunas em ordem

  try {
    if (!Array.isArray(idsColunas)) {
      return res.status(400).json({ error: "Formato inválido: idsColunas deve ser um array" });
    }

    const membro = await obterMembroProjeto(idProjeto, req.user.email);
    if (!membro || (membro.perfil !== "PO" && membro.perfil !== "GERENTE")) {
      return res.status(403).json({ error: "Acesso negado: apenas PO e Gerentes podem gerenciar colunas" });
    }

    // Garantir customização inicial
    await garantirCustomizacaoInicial(idProjeto);

    // Atualizar ordem de cada uma
    await prisma.$transaction(
      idsColunas.map((id, index) =>
        prisma.coluna.update({
          where: { id_coluna: id, id_projeto: idProjeto },
          data: { ordem: index },
        })
      )
    );

    return res.json({ message: "Colunas reordenadas com sucesso" });
  } catch (error) {
    console.error("Erro ao reordenar colunas:", error);
    return res.status(500).json({ error: "Erro ao reordenar colunas" });
  }
};

/**
 * DELETAR COLUNA
 */
export const deletarColuna = async (req, res) => {
  const { id } = req.params;

  try {
    const coluna = await prisma.coluna.findUnique({
      where: { id_coluna: id },
    });

    if (!coluna) {
      return res.status(404).json({ error: "Coluna não encontrada" });
    }

    const membro = await obterMembroProjeto(coluna.id_projeto, req.user.email);
    if (!membro || (membro.perfil !== "PO" && membro.perfil !== "GERENTE")) {
      return res.status(403).json({ error: "Acesso negado: apenas PO e Gerentes podem gerenciar colunas" });
    }

    // Garantir customização inicial
    await garantirCustomizacaoInicial(coluna.id_projeto);

    // Verificar se há cards ativos nesta coluna
    const contagemCards = await prisma.card.count({
      where: {
        id_coluna: id,
        deletado_em: null,
      },
    });

    if (contagemCards > 0) {
      return res.status(400).json({
        error: "Não é possível excluir uma coluna que contém atividades.",
      });
    }

    await prisma.coluna.delete({
      where: { id_coluna: id },
    });

    return res.json({ message: "Coluna excluída com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir coluna:", error);
    return res.status(500).json({ error: "Erro ao excluir coluna" });
  }
};
