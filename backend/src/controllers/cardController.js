import prisma from "../lib/prisma.js";
import { obterMembroProjeto } from "../utils/projetoAuth.js";

const PRIORIDADES_VALIDAS = ["BAIXA", "MEDIA", "ALTA"];

/* =========================
   CRIAR CARD EM UM PROJETO
 ========================= */
export const criarCard = async (req, res) => {
  const { id } = req.params; // id do projeto
  const {
    titulo,
    descricao,
    prioridade,
    tags,
    id_responsavel,
    id_sprint,
    story_points,
    id_coluna,
    id_etiquetas,
  } = req.body;

  try {
    if (!titulo) {
      return res.status(400).json({
        error: "Título é obrigatório",
      });
    }

    const projeto = await prisma.projeto.findUnique({
      where: { id_projeto: id },
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

    // Validação: Prioridade
    if (prioridade && !PRIORIDADES_VALIDAS.includes(prioridade)) {
      return res.status(400).json({
        error: `Prioridade inválida. Use: ${PRIORIDADES_VALIDAS.join(", ")}`,
      });
    }

    // Validação: id_responsavel deve ser membro do projeto
    if (id_responsavel) {
      const membroResponsavel = await prisma.membroProjeto.findFirst({
        where: {
          id_projeto: id,
          id_usuario: id_responsavel,
        },
      });
      if (!membroResponsavel) {
        return res.status(400).json({
          error: "O responsável atribuído não é membro deste projeto",
        });
      }
    }

    // Validação: id_sprint deve pertencer ao mesmo projeto
    if (id_sprint) {
      const sprint = await prisma.sprint.findFirst({
        where: {
          id_sprint,
          id_projeto: id,
        },
      });
      if (!sprint) {
        return res.status(400).json({
          error: "A sprint informada não pertence a este projeto",
        });
      }
    }

    // Encontrar coluna de destino (primeira coluna do projeto se não informada)
    let targetColunaId = id_coluna;
    if (!targetColunaId) {
      const primeiraColuna = await prisma.coluna.findFirst({
        where: { id_projeto: id },
        orderBy: { ordem: "asc" },
      });
      if (!primeiraColuna) {
        return res.status(400).json({
          error: "Projeto não possui colunas configuradas.",
        });
      }
      targetColunaId = primeiraColuna.id_coluna;
    }

    const card = await prisma.card.create({
      data: {
        id_projeto: id,
        titulo,
        descricao: descricao || null,
        prioridade: prioridade || "MEDIA",
        status: "A_FAZER",
        id_coluna: targetColunaId,
        tags: tags || [],
        id_responsavel: id_responsavel || null,
        id_sprint: id_sprint || null,
        id_criador: membro.id_usuario,
        story_points: story_points ? parseInt(story_points) : null,
        ...(id_etiquetas && id_etiquetas.length > 0 && {
          etiquetas: {
            connect: id_etiquetas.map((idEt) => ({ id_etiqueta: idEt })),
          },
        }),
      },
      include: {
        responsavel: true,
        etiquetas: true,
      },
    });

    return res.status(201).json(card);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Erro ao criar card",
    });
  }
};

/* =========================
   LISTAR CARDS DE UM PROJETO
========================= */
export const listarCards = async (req, res) => {
  const { id } = req.params;

  try {
    const projeto = await prisma.projeto.findUnique({
      where: { id_projeto: id },
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

    const cards = await prisma.card.findMany({
      where: {
        id_projeto: id,
        deletado_em: null,
      },
      include: {
        responsavel: true,
        sprint: true,
        etiquetas: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.json(cards);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Erro ao listar cards",
    });
  }
};

/* =========================
   BUSCAR CARD POR ID
========================= */
export const buscarCard = async (req, res) => {
  const { id } = req.params;

  try {
    const card = await prisma.card.findUnique({
      where: { id_card: id },
      include: {
        responsavel: true,
        sprint: true,
        projeto: true,
        anexos: true,
        votos: true,
        etiquetas: true,
      },
    });

    if (!card) {
      return res.status(404).json({
        error: "Card não encontrado",
      });
    }

    // Controle de Acesso: Verificar se o usuário pertence ao projeto do card
    const membro = await obterMembroProjeto(card.id_projeto, req.user.email);
    if (!membro) {
      return res.status(403).json({
        error: "Acesso negado: você não é membro deste projeto",
      });
    }

    return res.json(card);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Erro ao buscar card",
    });
  }
};

/* =========================
   ATUALIZAR CARD
========================= */
export const atualizarCard = async (req, res) => {
  const { id } = req.params;
  const {
    titulo,
    descricao,
    prioridade,
    tags,
    id_responsavel,
    id_sprint,
    story_points,
    em_risco,
    id_coluna,
    id_etiquetas,
  } = req.body;

  try {
    const card = await prisma.card.findUnique({
      where: { id_card: id },
    });

    if (!card) {
      return res.status(404).json({
        error: "Card não encontrado",
      });
    }

    // Controle de Acesso: Verificar se o usuário pertence ao projeto do card
    const membro = await obterMembroProjeto(card.id_projeto, req.user.email);
    if (!membro) {
      return res.status(403).json({
        error: "Acesso negado: você não é membro deste projeto",
      });
    }

    const isGerente = membro.perfil === "GERENTE" || membro.perfil === "ADMIN";
    const isPO = membro.perfil === "PO";
    const isCriador = !card.id_criador || card.id_criador === membro.id_usuario;

    if (!isGerente && !isPO && !isCriador) {
      return res.status(403).json({
        error: "Acesso negado: apenas o criador do card, Gerente ou PO podem editar este card",
      });
    }

    // Validação: Prioridade
    if (prioridade && !PRIORIDADES_VALIDAS.includes(prioridade)) {
      return res.status(400).json({
        error: `Prioridade inválida. Use: ${PRIORIDADES_VALIDAS.join(", ")}`,
      });
    }

    // Validação: id_responsavel deve ser membro do projeto do card
    if (id_responsavel) {
      const membroResponsavel = await prisma.membroProjeto.findFirst({
        where: {
          id_projeto: card.id_projeto,
          id_usuario: id_responsavel,
        },
      });
      if (!membroResponsavel) {
        return res.status(400).json({
          error: "O responsável atribuído não é membro deste projeto",
        });
      }
    }

    // Validação: id_sprint deve pertencer ao mesmo projeto do card
    if (id_sprint) {
      const sprint = await prisma.sprint.findFirst({
        where: {
          id_sprint,
          id_projeto: card.id_projeto,
        },
      });
      if (!sprint) {
        return res.status(400).json({
          error: "A sprint informada não pertence a este projeto",
        });
      }
    }

    // Validação: id_coluna deve pertencer ao mesmo projeto do card
    if (id_coluna) {
      const coluna = await prisma.coluna.findFirst({
        where: {
          id_coluna,
          id_projeto: card.id_projeto,
        },
      });
      if (!coluna) {
        return res.status(400).json({
          error: "A coluna informada não pertence a este projeto",
        });
      }
    }

    const cardAtualizado = await prisma.card.update({
      where: { id_card: id },
      data: {
        ...(titulo !== undefined && { titulo }),
        ...(descricao !== undefined && { descricao }),
        ...(prioridade !== undefined && { prioridade }),
        ...(tags !== undefined && { tags }),
        ...(id_responsavel !== undefined && { id_responsavel }),
        ...(id_sprint !== undefined && { id_sprint }),
        ...(id_coluna !== undefined && { id_coluna }),
        ...(story_points !== undefined && { story_points: story_points ? parseInt(story_points) : null }),
        ...(em_risco !== undefined && { em_risco }),
        ...(id_etiquetas !== undefined && {
          etiquetas: {
            set: id_etiquetas.map((idEt) => ({ id_etiqueta: idEt })),
          },
        }),
      },
      include: {
        responsavel: true,
        sprint: true,
        etiquetas: true,
      },
    });

    return res.json(cardAtualizado);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Erro ao atualizar card",
    });
  }
};

/* =========================
   EXCLUIR CARD (SOFT DELETE)
========================= */
export const excluirCard = async (req, res) => {
  const { id } = req.params;

  try {
    const card = await prisma.card.findUnique({
      where: { id_card: id },
    });

    if (!card) {
      return res.status(404).json({
        error: "Card não encontrado",
      });
    }

    // Controle de Acesso: Verificar se o usuário pertence ao projeto do card
    const membro = await obterMembroProjeto(card.id_projeto, req.user.email);
    if (!membro) {
      return res.status(403).json({
        error: "Acesso negado: você não é membro deste projeto",
      });
    }

    const isGerente = membro.perfil === "GERENTE" || membro.perfil === "ADMIN";
    const isPO = membro.perfil === "PO";
    const isCriador = !card.id_criador || card.id_criador === membro.id_usuario;

    if (!isGerente && !isPO && !isCriador) {
      return res.status(403).json({
        error: "Acesso negado: apenas o criador do card, Gerente ou PO podem excluir este card",
      });
    }

    await prisma.card.update({
      where: { id_card: id },
      data: {
        deletado_em: new Date(),
      },
    });

    return res.json({
      message: "Card removido com sucesso",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Erro ao excluir card",
    });
  }
};

/* =========================
   ATUALIZAR STATUS (KANBAN)
 ========================= */
export const atualizarStatusCard = async (req, res) => {
  const { id } = req.params;
  const { status, id_coluna } = req.body;

  try {
    const card = await prisma.card.findUnique({
      where: { id_card: id },
    });

    if (!card) {
      return res.status(404).json({
        error: "Card não encontrado",
      });
    }

    // Controle de Acesso: Verificar se o usuário pertence ao projeto do card
    const membro = await obterMembroProjeto(card.id_projeto, req.user.email);
    if (!membro) {
      return res.status(403).json({
        error: "Acesso negado: você não é membro deste projeto",
      });
    }

    let targetColuna = null;
    if (id_coluna) {
      targetColuna = await prisma.coluna.findUnique({
        where: { id_coluna },
      });
      if (!targetColuna || targetColuna.id_projeto !== card.id_projeto) {
        return res.status(400).json({ error: "Coluna inválida" });
      }
    } else if (status) {
      const validStatuses = [
        "A_FAZER",
        "EM_ANDAMENTO",
        "HOMOLOGACAO",
        "CONCLUIDO",
      ];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          error: `Status inválido: ${validStatuses.join(", ")}`,
        });
      }

      let nomeColuna = "A FAZER";
      if (status === "EM_ANDAMENTO") nomeColuna = "EM ANDAMENTO";
      else if (status === "HOMOLOGACAO") nomeColuna = "HOMOLOGAÇÃO";
      else if (status === "CONCLUIDO") nomeColuna = "CONCLUÍDO";

      targetColuna = await prisma.coluna.findFirst({
        where: { id_projeto: card.id_projeto, nome: nomeColuna },
      });
    }

    if (!targetColuna) {
      return res.status(400).json({
        error: "Coluna de destino não encontrada",
      });
    }

    // Mapear de volta para o status legado
    let legacyStatus = "A_FAZER";
    if (targetColuna.nome === "EM ANDAMENTO") legacyStatus = "EM_ANDAMENTO";
    else if (targetColuna.nome === "HOMOLOGAÇÃO") legacyStatus = "HOMOLOGACAO";
    else if (targetColuna.nome === "CONCLUÍDO") legacyStatus = "CONCLUIDO";

    // Auto-atribuição: se o card não tem responsável, atribui ao membro que moveu
    const deveAtribuir = !card.id_responsavel;

    const cardAtualizado = await prisma.card.update({
      where: { id_card: id },
      data: {
        id_coluna: targetColuna.id_coluna,
        status: legacyStatus,
        ...(deveAtribuir && { id_responsavel: membro.id_usuario }),
      },
      include: {
        responsavel: true,
        sprint: true,
        etiquetas: true,
      },
    });

    // Emitir evento Socket.io para sincronização em tempo real
    const io = req.app.get('io');
    if (io) {
      io.to(card.id_projeto).emit('card_moved', cardAtualizado);
    }

    // US05.02: Notificar Testers quando card é movido para HOMOLOGAÇÃO
    if (targetColuna.nome === "HOMOLOGAÇÃO") {
      try {
        // Buscar todos os membros TESTER do projeto
        const testers = await prisma.membroProjeto.findMany({
          where: {
            id_projeto: card.id_projeto,
            perfil: "TESTER",
          },
          include: { usuario: true },
        });

        // Criar notificações no banco para cada tester
        const mensagem = `O card "${cardAtualizado.titulo}" foi movido para Homologação e está pronto para testes.`;

        for (const tester of testers) {
          const notificacao = await prisma.notificacao.create({
            data: {
              id_usuario_destino: tester.id_usuario,
              id_card_origem: card.id_card,
              mensagem,
            },
            include: {
              card: {
                select: {
                  id_card: true,
                  titulo: true,
                  status: true,
                  id_projeto: true,
                },
              },
            },
          });

          // Emitir notificação em tempo real via Socket.io
          if (io) {
            io.to(card.id_projeto).emit('nova_notificacao', notificacao);
          }
        }
      } catch (notifError) {
        // Não falhar a movimentação do card se a notificação falhar
        console.error("Erro ao criar notificações para testers:", notifError);
      }
    }

    return res.json(cardAtualizado);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Erro ao atualizar status do card",
    });
  }
};