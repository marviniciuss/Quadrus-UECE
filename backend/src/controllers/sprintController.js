import prisma from "../lib/prisma.js";
import { obterMembroProjeto } from "../utils/projetoAuth.js";

const STATUS_SPRINT_VALIDOS = ["PLANEJAMENTO", "ATIVA", "CONCLUIDA"];

/* =========================
   CRIAR SPRINT EM UM PROJETO
 ========================= */
export const criarSprint = async (req, res) => {
  const { id } = req.params; // id do projeto
  const { nome, data_inicio, data_fim } = req.body;

  try {
    if (!nome) {
      return res.status(400).json({
        error: "Nome da sprint é obrigatório",
      });
    }

    const projeto = await prisma.projeto.findUnique({
      where: {
        id_projeto: id,
      },
    });

    if (!projeto) {
      return res.status(404).json({
        error: "Projeto não encontrado",
      });
    }

    // Controle de Acesso: Verificar se o usuário pertence ao projeto
    const membro = await obterMembroProjeto(id, req.user.email);
    if (!membro) {
      return res.status(403).json({
        error: "Acesso negado: você não é membro deste projeto",
      });
    }

    // Validação de datas
    if (data_inicio && data_fim) {
      if (new Date(data_fim) < new Date(data_inicio)) {
        return res.status(400).json({
          error: "A data de fim não pode ser anterior à data de início",
        });
      }
    }

    const sprint = await prisma.sprint.create({
      data: {
        id_projeto: id,
        nome,
        data_inicio: data_inicio ? new Date(data_inicio) : null,
        data_fim: data_fim ? new Date(data_fim) : null,
      },
    });

    return res.status(201).json(sprint);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Erro ao criar sprint",
    });
  }
};

/* =========================
   LISTAR SPRINTS DE UM PROJETO
 ========================= */
export const listarSprints = async (req, res) => {
  const { id } = req.params;

  try {
    const projeto = await prisma.projeto.findUnique({
      where: {
        id_projeto: id,
      },
    });

    if (!projeto) {
      return res.status(404).json({
        error: "Projeto não encontrado",
      });
    }

    // Controle de Acesso: Verificar se o usuário pertence ao projeto
    const membro = await obterMembroProjeto(id, req.user.email);
    if (!membro) {
      return res.status(403).json({
        error: "Acesso negado: você não é membro deste projeto",
      });
    }

    const sprints = await prisma.sprint.findMany({
      where: {
        id_projeto: id,
      },
      include: {
        cards: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return res.json(sprints);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Erro ao listar sprints",
    });
  }
};

/* =========================
   BUSCAR SPRINT
 ========================= */
export const buscarSprint = async (req, res) => {
  const { id } = req.params;

  try {
    const sprint = await prisma.sprint.findUnique({
      where: {
        id_sprint: id,
      },
      include: {
        projeto: true,
        cards: {
          include: {
            responsavel: true,
          },
        },
      },
    });

    if (!sprint) {
      return res.status(404).json({
        error: "Sprint não encontrada",
      });
    }

    // Controle de Acesso: Verificar se o usuário pertence ao projeto da sprint
    const membro = await obterMembroProjeto(sprint.id_projeto, req.user.email);
    if (!membro) {
      return res.status(403).json({
        error: "Acesso negado: você não é membro deste projeto",
      });
    }

    return res.json(sprint);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Erro ao buscar sprint",
    });
  }
};

/* =========================
   ATUALIZAR SPRINT
 ========================= */
export const atualizarSprint = async (req, res) => {
  const { id } = req.params;
  const { nome, data_inicio, data_fim, status } = req.body;

  try {
    const sprint = await prisma.sprint.findUnique({
      where: {
        id_sprint: id,
      },
    });

    if (!sprint) {
      return res.status(404).json({
        error: "Sprint não encontrada",
      });
    }

    // Controle de Acesso: Verificar se o usuário pertence ao projeto da sprint
    const membro = await obterMembroProjeto(sprint.id_projeto, req.user.email);
    if (!membro) {
      return res.status(403).json({
        error: "Acesso negado: você não é membro deste projeto",
      });
    }

    // Validação de Status Enum
    if (status && !STATUS_SPRINT_VALIDOS.includes(status)) {
      return res.status(400).json({
        error: `Status inválido. Use: ${STATUS_SPRINT_VALIDOS.join(", ")}`,
      });
    }

    // Validação de datas
    const finalDataInicio = data_inicio !== undefined ? data_inicio : sprint.data_inicio;
    const finalDataFim = data_fim !== undefined ? data_fim : sprint.data_fim;
    if (finalDataInicio && finalDataFim) {
      if (new Date(finalDataFim) < new Date(finalDataInicio)) {
        return res.status(400).json({
          error: "A data de fim não pode ser anterior à data de início",
        });
      }
    }

    const sprintAtualizada = await prisma.sprint.update({
      where: {
        id_sprint: id,
      },
      data: {
        ...(nome !== undefined && { nome }),
        ...(data_inicio !== undefined && { data_inicio: data_inicio ? new Date(data_inicio) : null }),
        ...(data_fim !== undefined && { data_fim: data_fim ? new Date(data_fim) : null }),
        ...(status !== undefined && { status }),
      },
    });

    return res.json(sprintAtualizada);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Erro ao atualizar sprint",
    });
  }
};

/* =========================
   EXCLUIR SPRINT
 ========================= */
export const excluirSprint = async (req, res) => {
  const { id } = req.params;

  try {
    const sprint = await prisma.sprint.findUnique({
      where: {
        id_sprint: id,
      },
    });

    if (!sprint) {
      return res.status(404).json({
        error: "Sprint não encontrada",
      });
    }

    // Controle de Acesso: Verificar se o usuário pertence ao projeto da sprint
    const membro = await obterMembroProjeto(sprint.id_projeto, req.user.email);
    if (!membro) {
      return res.status(403).json({
        error: "Acesso negado: você não é membro deste projeto",
      });
    }

    await prisma.sprint.delete({
      where: {
        id_sprint: id,
      },
    });

    return res.json({
      message: "Sprint excluída com sucesso",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Erro ao excluir sprint",
    });
  }
};

/* =========================
   INICIAR SPRINT
 ========================= */
export const iniciarSprint = async (req, res) => {
  const { id } = req.params;

  try {
    const sprint = await prisma.sprint.findUnique({
      where: {
        id_sprint: id,
      },
    });

    if (!sprint) {
      return res.status(404).json({
        error: "Sprint não encontrada",
      });
    }

    // Controle de Acesso: Verificar se o usuário pertence ao projeto da sprint
    const membro = await obterMembroProjeto(sprint.id_projeto, req.user.email);
    if (!membro) {
      return res.status(403).json({
        error: "Acesso negado: você não é membro deste projeto",
      });
    }

    // Regra de Negócio: Não reabrir sprints concluídas
    if (sprint.status === "CONCLUIDA") {
      return res.status(400).json({
        error: "Não é possível iniciar uma sprint que já foi concluída",
      });
    }

    // Regra de Negócio: Impedir múltiplas sprints ativas no mesmo projeto
    const sprintAtivaExistente = await prisma.sprint.findFirst({
      where: {
        id_projeto: sprint.id_projeto,
        status: "ATIVA",
      },
    });

    if (sprintAtivaExistente) {
      return res.status(400).json({
        error: "Já existe uma sprint ativa para este projeto. Conclua-a antes de iniciar uma nova",
      });
    }

    const sprintAtualizada = await prisma.sprint.update({
      where: {
        id_sprint: id,
      },
      data: {
        status: "ATIVA",
        data_inicio: new Date(),
      },
    });

    return res.json(sprintAtualizada);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Erro ao iniciar sprint",
    });
  }
};

/* =========================
   FINALIZAR SPRINT
 ========================= */
export const finalizarSprint = async (req, res) => {
  const { id } = req.params;

  try {
    const sprint = await prisma.sprint.findUnique({
      where: {
        id_sprint: id,
      },
    });

    if (!sprint) {
      return res.status(404).json({
        error: "Sprint não encontrada",
      });
    }

    // Controle de Acesso: Verificar se o usuário pertence ao projeto da sprint
    const membro = await obterMembroProjeto(sprint.id_projeto, req.user.email);
    if (!membro) {
      return res.status(403).json({
        error: "Acesso negado: você não é membro deste projeto",
      });
    }

    // Regra de Negócio: Apenas sprints ATIVAS podem ser finalizadas
    if (sprint.status !== "ATIVA") {
      return res.status(400).json({
        error: "Apenas sprints ativas podem ser finalizadas",
      });
    }

    const sprintAtualizada = await prisma.sprint.update({
      where: {
        id_sprint: id,
      },
      data: {
        status: "CONCLUIDA",
        data_fim: new Date(),
      },
    });

    return res.json(sprintAtualizada);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Erro ao finalizar sprint",
    });
  }
};