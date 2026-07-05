import prisma from "../lib/prisma.js";
import { obterMembroProjeto } from "../utils/projetoAuth.js";
import { registrarLog } from "../utils/registrarLog.js";
import { parsePokerMetadata, schedulePokerExpiration, cancelPokerExpiration } from "../utils/pokerScheduler.js";

const PRIORIDADES_VALIDAS = ["BAIXA", "MEDIA", "ALTA"];

/**
 * Anonimiza os votos de um card de acordo com o perfil e o estado do poker
 */
export const anonymizeVotes = (card, currentUserEmail, userPerfil) => {
  if (!card || !card.votos) return card;

  const poker = parsePokerMetadata(card.descricao);
  if (!poker || !poker.active || !poker.expiresAt) return card;

  const isExpired = new Date(poker.expiresAt) <= new Date();
  const canSeeDetailed = isExpired && (userPerfil === "PO" || userPerfil === "GERENTE" || userPerfil === "ADMIN");

  if (!canSeeDetailed) {
    card.votos = card.votos.map(v => {
      if (v.usuario?.email === currentUserEmail) {
        return v;
      }
      return {
        id_voto: v.id_voto,
        id_card: v.id_card,
        id_usuario: "anonymous",
        valor: v.valor,
        createdAt: v.createdAt,
        updatedAt: v.updatedAt,
        usuario: {
          id_usuario: "anonymous",
          nome: "Desenvolvedor Anônimo",
          email: "anonymous@quadrus.com",
          foto: null
        }
      };
    });
  }

  return card;
};

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

    const ultimoCard = await prisma.card.findFirst({
      where: {
        id_coluna: targetColunaId,
        deletado_em: null,
      },
      orderBy: {
        ordem: "desc",
      },
    });

    const proximaOrdem = ultimoCard ? ultimoCard.ordem + 1 : 1;

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
        ordem: proximaOrdem,
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

    await registrarLog({
      id_usuario: membro.id_usuario,
      acao: `Criou o card "${card.titulo}"`,
      tipo_acao: "CRIACAO",
      id_card: card.id_card,
      id_sprint: card.id_sprint,
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
      orderBy: [
        {
          id_coluna: "asc",
        },
        {
          ordem: "asc",
        },
      ],
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
        votos: {
          include: {
            usuario: true,
          },
        },
        etiquetas: true,
        comentarios: {
            include: {
                usuario: true
            },
            orderBy: {
                createdAt: "asc"
            }
        },
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

    const cardAnonimizado = anonymizeVotes(card, req.user.email, membro.perfil);
    return res.json(cardAnonimizado);
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

    const oldPoker = parsePokerMetadata(card.descricao);

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

    const newPoker = parsePokerMetadata(cardAtualizado.descricao);
    const oldActive = oldPoker && oldPoker.active;
    const newActive = newPoker && newPoker.active;
    const io = req.app.get('io');

    if (!oldActive && newActive) {
      // 1. Criar notificações para todos os DEV do projeto
      try {
        const devs = await prisma.membroProjeto.findMany({
          where: {
            id_projeto: card.id_projeto,
            perfil: "DEV"
          },
          include: { usuario: true }
        });

        const mensagem = `A votação do Planning Poker para o card "${cardAtualizado.titulo}" foi iniciada.`;

        for (const dev of devs) {
          const notificacao = await prisma.notificacao.create({
            data: {
              id_usuario_destino: dev.id_usuario,
              id_card_origem: cardAtualizado.id_card,
              mensagem
            },
            include: {
              card: {
                select: {
                  id_card: true,
                  titulo: true,
                  status: true,
                  id_projeto: true
                }
              }
            }
          });

          if (io) {
            io.to(card.id_projeto).emit('nova_notificacao', notificacao);
          }
        }
      } catch (errNotif) {
        console.error("Erro ao notificar devs sobre poker:", errNotif);
      }

      // 2. Agendar timer de expiração
      if (newPoker.expiresAt) {
        const delay = new Date(newPoker.expiresAt).getTime() - Date.now();
        if (delay > 0) {
          schedulePokerExpiration(cardAtualizado.id_card, delay, io);
        }
      }

      if (io) {
        io.to(`poker:${cardAtualizado.id_card}`).emit('poker_session_update');
      }
    } else if (oldActive && !newActive) {
      // Cancelar expiração ativa
      cancelPokerExpiration(cardAtualizado.id_card);
      if (io) {
        io.to(`poker:${cardAtualizado.id_card}`).emit('poker_session_update');
      }
    }

    // Emissão socket geral de atualização do card para o KanbanBoard (removendo votos por segurança)
    if (io) {
      const cardToEmit = { ...cardAtualizado, votos: [] };
      io.to(card.id_projeto).emit('card_moved', cardToEmit);
    }

    await registrarLog({
      id_usuario: membro.id_usuario,
      acao: `Atualizou o card "${cardAtualizado.titulo}"`,
      tipo_acao: "ALERTA",
      id_card: cardAtualizado.id_card,
      id_sprint: cardAtualizado.id_sprint,
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

    await registrarLog({
      id_usuario: membro.id_usuario,
      acao: `Removeu o card "${card.titulo}"`,
      tipo_acao: "ALERTA",
      id_card: card.id_card,
      id_sprint: card.id_sprint,
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

    let proximaOrdem = card.ordem;
    if (card.id_coluna !== targetColuna.id_coluna) {
      const ultimoCard = await prisma.card.findFirst({
        where: {
          id_coluna: targetColuna.id_coluna,
          deletado_em: null,
        },
        orderBy: {
          ordem: "desc",
        },
      });
      proximaOrdem = ultimoCard ? ultimoCard.ordem + 1 : 1;
    }

    const cardAtualizado = await prisma.card.update({
      where: { id_card: id },
      data: {
        id_coluna: targetColuna.id_coluna,
        status: legacyStatus,
        ordem: proximaOrdem,
        ...(deveAtribuir && { id_responsavel: membro.id_usuario }),
      },
      include: {
        responsavel: true,
        sprint: true,
        etiquetas: true,
      },
    });

    if (card.id_coluna !== targetColuna.id_coluna) {
      await registrarLog({
        id_usuario: membro.id_usuario,
        acao: `Moveu o card "${card.titulo}" para a coluna "${targetColuna.nome}"`,
        tipo_acao: "MOVIMENTACAO",
        id_card: card.id_card,
        id_sprint: card.id_sprint,
      });
    }

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

export const reordenarCards = async (req, res) => {
  const { id } = req.params;

  const { cards } = req.body;

  try {
    const card = await prisma.card.findUnique({
      where: {
        id_card: id,
      },
    });

    if (!card) {
      return res.status(404).json({
        error: "Card não encontrado",
      });
    }

    const membro = await obterMembroProjeto(card.id_projeto, req.user.email);

    if (!membro) {
      return res.status(403).json({
        error: "Acesso negado",
      });
    }

    const isGerente =
      membro.perfil === "GERENTE" || membro.perfil === "ADMIN";

    const isPO = membro.perfil === "PO";

    if (!isGerente && !isPO) {
      return res.status(403).json({
        error: "Somente PO, Gerente ou Admin podem reordenar cards.",
      });
    }

    const colunas = await prisma.coluna.findMany({
      where: { id_projeto: card.id_projeto },
    });

    const colMap = {};
    colunas.forEach(col => {
      let legacyStatus = "A_FAZER";
      if (col.nome === "EM ANDAMENTO") legacyStatus = "EM_ANDAMENTO";
      else if (col.nome === "HOMOLOGAÇÃO") legacyStatus = "HOMOLOGACAO";
      else if (col.nome === "CONCLUÍDO") legacyStatus = "CONCLUIDO";
      colMap[col.id_coluna] = legacyStatus;
    });

    await prisma.$transaction(
      cards.map((c) => {
        const legacyStatus = colMap[c.id_coluna] || "A_FAZER";
        return prisma.card.update({
          where: {
            id_card: c.id_card,
          },
          data: {
            ordem: c.ordem,
            id_coluna: c.id_coluna,
            status: legacyStatus,
          },
        });
      })
    );

    await registrarLog({
      id_usuario: membro.id_usuario,
      acao: "Reordenou cards do Kanban",
      tipo_acao: "MOVIMENTACAO",
      id_card: id,
    });

    const io = req.app.get("io");

    if (io) {
      io.to(card.id_projeto).emit("cards_reordenados");
    }

    return res.json({
      message: "Cards reordenados com sucesso.",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Erro ao reordenar cards",
    });
  }
};

export const aprovarCard = async (req, res) => {
  const { id } = req.params;

  try {
    const card = await prisma.card.findUnique({
      where: { id_card: id },
      include: {
        responsavel: true
      }
    });

    if (!card) {
      return res.status(404).json({
        error: "Card não encontrado"
      });
    }

    const membro = await obterMembroProjeto(card.id_projeto, req.user.email);

    if (!membro) {
      return res.status(403).json({
        error: "Acesso negado"
      });
    }

    if (!["TESTER", "GERENTE", "ADMIN"].includes(membro.perfil)) {
      return res.status(403).json({
        error: "Somente Tester, Gerente ou Admin podem aprovar."
      });
    }

    if (card.status !== "HOMOLOGACAO") {
      return res.status(400).json({
        error: "O card não está em homologação."
      });
    }

    const colunaConcluido = await prisma.coluna.findFirst({
      where: {
        id_projeto: card.id_projeto,
        nome: "CONCLUÍDO"
      }
    });

    if (!colunaConcluido) {
      return res.status(400).json({
        error: "Coluna CONCLUÍDO não encontrada."
      });
    }

    const ultimo = await prisma.card.findFirst({
      where: {
        id_coluna: colunaConcluido.id_coluna,
        deletado_em: null
      },
      orderBy: {
        ordem: "desc"
      }
    });

    const atualizado = await prisma.card.update({
      where: {
        id_card: id
      },
      data: {
        status: "CONCLUIDO",
        id_coluna: colunaConcluido.id_coluna,
        ordem: ultimo ? ultimo.ordem + 1 : 1
      },
      include: {
        responsavel: true,
        sprint: true,
        etiquetas: true
      }
    });

    await registrarLog({
      id_usuario: membro.id_usuario,
      id_card: card.id_card,
      id_sprint: card.id_sprint,
      tipo_acao: "MOVIMENTACAO",
      acao: `Aprovou o card "${card.titulo}"`,
    });

    const io = req.app.get("io");

    if (io) {
      io.to(card.id_projeto).emit("card_moved", atualizado);
    }

    return res.json(atualizado);

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      error: "Erro ao aprovar card"
    });

  }

};

export const reprovarCard = async (req, res) => {

  const { id } = req.params;

  const { comentario } = req.body;

  try {

    if (!comentario?.trim()) {

      return res.status(400).json({
        error: "Informe os passos para reprodução."
      });

    }

    const card = await prisma.card.findUnique({
      where: {
        id_card: id
      }
    });

    if (!card) {

      return res.status(404).json({
        error: "Card não encontrado"
      });

    }

    const membro = await obterMembroProjeto(card.id_projeto, req.user.email);

    if (!membro) {

      return res.status(403).json({
        error: "Acesso negado"
      });

    }

    if (!["TESTER","GERENTE","ADMIN"].includes(membro.perfil)) {

      return res.status(403).json({
        error: "Somente Tester pode reprovar."
      });

    }

    if (card.status !== "HOMOLOGACAO") {

      return res.status(400).json({
        error: "O card não está em homologação."
      });

    }

    await prisma.comentarioCard.create({

      data: {

        id_card: card.id_card,

        id_usuario: membro.id_usuario,

        conteudo: comentario

      }

    });

    const coluna = await prisma.coluna.findFirst({

      where: {

        id_projeto: card.id_projeto,

        nome: "EM ANDAMENTO"

      }

    });

    const ultimo = await prisma.card.findFirst({

      where: {

        id_coluna: coluna.id_coluna,

        deletado_em: null

      },

      orderBy: {

        ordem: "desc"

      }

    });

    const atualizado = await prisma.card.update({

      where: {

        id_card: id

      },

      data: {

        status: "EM_ANDAMENTO",

        id_coluna: coluna.id_coluna,

        ordem: ultimo ? ultimo.ordem + 1 : 1

      },

      include: {

        responsavel: true,

        sprint: true,

        etiquetas: true

      }

    });

    await registrarLog({

      id_usuario: membro.id_usuario,

      id_card: card.id_card,

      id_sprint: card.id_sprint,

      tipo_acao: "MOVIMENTACAO",

      acao: `Reprovou o card "${card.titulo}"`

    });

    const io = req.app.get("io");

    if (io) {

      io.to(card.id_projeto).emit("card_moved", atualizado);

    }

    return res.json(atualizado);

  }

  catch (error) {

    console.error(error);

    return res.status(500).json({

      error: "Erro ao reprovar card"

    });

  }

};