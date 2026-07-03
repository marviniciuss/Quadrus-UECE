import prisma from "../lib/prisma.js";
import { obterMembroProjeto } from "../utils/projetoAuth.js";

/**
 * LISTAR LOGS DE UM PROJETO
 */
export const listarLogsProjeto = async (req, res) => {
  const { projectId } = req.params;

  try {
    // Controle de Acesso: Verificar se o usuário pertence ao projeto
    const membro = await obterMembroProjeto(projectId, req.user.email);
    if (!membro) {
      return res.status(403).json({
        error: "Acesso negado: você não é membro deste projeto",
      });
    }

    const logs = await prisma.logAcoes.findMany({
      where: {
        OR: [
          {
            card: {
              id_projeto: projectId,
            },
          },
          {
            sprint: {
              id_projeto: projectId,
            },
          },
        ],
      },
      include: {
        usuario: {
          select: {
            nome: true,
            email: true,
            foto: true,
          },
        },
        card: {
          select: {
            id_card: true,
            titulo: true,
          },
        },
        sprint: {
          select: {
            id_sprint: true,
            nome: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
    });

    return res.json(logs);
  } catch (error) {
    console.error("Erro ao listar logs do projeto:", error);
    return res.status(500).json({ error: "Erro ao listar logs do projeto" });
  }
};

/**
 * LISTAR LOGS DE UM CARD
 */
export const listarLogsCard = async (req, res) => {
  const { id } = req.params;

  try {
    const card = await prisma.card.findUnique({
      where: { id_card: id },
    });

    if (!card) {
      return res.status(404).json({ error: "Card não encontrado" });
    }

    // Controle de Acesso: Verificar se o usuário pertence ao projeto do card
    const membro = await obterMembroProjeto(card.id_projeto, req.user.email);
    if (!membro) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    const logs = await prisma.logAcoes.findMany({
      where: { id_card: id },
      include: {
        usuario: {
          select: {
            nome: true,
            email: true,
            foto: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.json(logs);
  } catch (error) {
    console.error("Erro ao listar logs do card:", error);
    return res.status(500).json({ error: "Erro ao listar logs do card" });
  }
};

/**
 * LISTAR LOGS DE UMA SPRINT
 */
export const listarLogsSprint = async (req, res) => {
  const { id } = req.params;

  try {
    const sprint = await prisma.sprint.findUnique({
      where: { id_sprint: id },
    });

    if (!sprint) {
      return res.status(404).json({ error: "Sprint não encontrada" });
    }

    // Controle de Acesso: Verificar se o usuário pertence ao projeto da sprint
    const membro = await obterMembroProjeto(sprint.id_projeto, req.user.email);
    if (!membro) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    const logs = await prisma.logAcoes.findMany({
      where: { id_sprint: id },
      include: {
        usuario: {
          select: {
            nome: true,
            email: true,
            foto: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.json(logs);
  } catch (error) {
    console.error("Erro ao listar logs da sprint:", error);
    return res.status(500).json({ error: "Erro ao listar logs da sprint" });
  }
};
