import prisma from "../lib/prisma.js";
import { obterMembroProjeto } from "../utils/projetoAuth.js";
import { garantirCustomizacaoInicial } from "../utils/garantirCustomizacaoInicial.js";

/**
 * CRIAR ETIQUETA
 */
export const criarEtiqueta = async (req, res) => {
  const { idProjeto } = req.params;
  const { nome, cor } = req.body;

  try {
    if (!nome || !cor) {
      return res.status(400).json({ error: "Nome e cor são obrigatórios" });
    }

    const membro = await obterMembroProjeto(idProjeto, req.user.email);
    if (!membro || membro.perfil !== "GERENTE") {
      return res.status(403).json({ error: "Acesso negado: apenas o Gerente pode gerenciar etiquetas" });
    }

    // Garantir customização inicial das etiquetas padrão
    await garantirCustomizacaoInicial(idProjeto);

    // Verificar se etiqueta com esse nome já existe no projeto
    const etiquetaExistente = await prisma.etiqueta.findFirst({
      where: {
        id_projeto: idProjeto,
        nome: {
          equals: nome,
          mode: "insensitive",
        },
      },
    });

    if (etiquetaExistente) {
      return res.status(400).json({ error: "Já existe uma etiqueta com este nome no projeto" });
    }

    const novaEtiqueta = await prisma.etiqueta.create({
      data: {
        id_projeto: idProjeto,
        nome,
        cor,
      },
    });

    return res.status(201).json(novaEtiqueta);
  } catch (error) {
    console.error("Erro ao criar etiqueta:", error);
    return res.status(500).json({ error: "Erro ao criar etiqueta" });
  }
};

/**
 * ATUALIZAR ETIQUETA
 */
export const atualizarEtiqueta = async (req, res) => {
  const { id } = req.params;
  const { nome, cor } = req.body;

  try {
    const etiqueta = await prisma.etiqueta.findUnique({
      where: { id_etiqueta: id },
    });

    if (!etiqueta) {
      return res.status(404).json({ error: "Etiqueta não encontrada" });
    }

    const membro = await obterMembroProjeto(etiqueta.id_projeto, req.user.email);
    if (!membro || membro.perfil !== "GERENTE") {
      return res.status(403).json({ error: "Acesso negado: apenas o Gerente pode gerenciar etiquetas" });
    }

    // Garantir customização inicial
    await garantirCustomizacaoInicial(etiqueta.id_projeto);

    // Se mudou o nome, verificar se já existe outra com o mesmo nome
    if (nome && nome.toLowerCase() !== etiqueta.nome.toLowerCase()) {
      const etiquetaExistente = await prisma.etiqueta.findFirst({
        where: {
          id_projeto: etiqueta.id_projeto,
          nome: {
            equals: nome,
            mode: "insensitive",
          },
        },
      });

      if (etiquetaExistente) {
        return res.status(400).json({ error: "Já existe uma etiqueta com este nome no projeto" });
      }
    }

    const etiquetaAtualizada = await prisma.etiqueta.update({
      where: { id_etiqueta: id },
      data: {
        ...(nome && { nome }),
        ...(cor && { cor }),
      },
    });

    return res.json(etiquetaAtualizada);
  } catch (error) {
    console.error("Erro ao atualizar etiqueta:", error);
    return res.status(500).json({ error: "Erro ao atualizar etiqueta" });
  }
};

/**
 * DELETAR ETIQUETA
 */
export const deletarEtiqueta = async (req, res) => {
  const { id } = req.params;

  try {
    const etiqueta = await prisma.etiqueta.findUnique({
      where: { id_etiqueta: id },
    });

    if (!etiqueta) {
      return res.status(404).json({ error: "Etiqueta não encontrada" });
    }

    const membro = await obterMembroProjeto(etiqueta.id_projeto, req.user.email);
    if (!membro || membro.perfil !== "GERENTE") {
      return res.status(403).json({ error: "Acesso negado: apenas o Gerente pode gerenciar etiquetas" });
    }

    // Garantir customização inicial
    await garantirCustomizacaoInicial(etiqueta.id_projeto);

    // A relação many-to-many implícita se desconectará automaticamente no Prisma.
    await prisma.etiqueta.delete({
      where: { id_etiqueta: id },
    });

    return res.json({ message: "Etiqueta excluída com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir etiqueta:", error);
    return res.status(500).json({ error: "Erro ao excluir etiqueta" });
  }
};
