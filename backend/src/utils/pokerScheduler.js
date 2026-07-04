import prisma from "../lib/prisma.js";

// Armazena os timeouts em memória (mapeado por id_card)
global.pokerTimeouts = global.pokerTimeouts || new Map();

/**
 * Função utilitária para extrair metadados do poker da descrição do card
 */
export const parsePokerMetadata = (descricao) => {
  if (!descricao) return null;
  const pokerRegex = /<!-- POKER_METADATA:\s*({.*?})\s*-->/;
  const pokerMatch = descricao.match(pokerRegex);
  if (pokerMatch) {
    try {
      return JSON.parse(pokerMatch[1]);
    } catch (e) {
      console.error("Erro ao analisar poker metadata no parser:", e);
    }
  }
  return null;
};

/**
 * Executa a lógica de encerramento da votação
 */
const processarExpiracaoPoker = async (cardId, io) => {
  try {
    const card = await prisma.card.findUnique({
      where: { id_card: cardId },
      include: { projeto: true }
    });

    if (!card) return;

    const poker = parsePokerMetadata(card.descricao);
    if (!poker || !poker.active) return;

    // Verificar se já não foi decidida a pontuação
    if (card.story_points !== null) return;

    // Buscar PO, GERENTE e ADMIN do projeto para notificar
    const membrosNotificar = await prisma.membroProjeto.findMany({
      where: {
        id_projeto: card.id_projeto,
        perfil: {
          in: ["PO", "GERENTE", "ADMIN"]
        }
      },
      include: { usuario: true }
    });

    const mensagem = `A votação do Planning Poker para o card "${card.titulo}" encerrou por tempo esgotado.`;

    for (const membro of membrosNotificar) {
      const notificacao = await prisma.notificacao.create({
        data: {
          id_usuario_destino: membro.id_usuario,
          id_card_origem: cardId,
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
        // Enviar notificação em tempo real
        io.to(card.id_projeto).emit('nova_notificacao', notificacao);
      }
    }

    if (io) {
      // Notificar a sala do poker e a sala do projeto que a sessão expirou
      io.to(`poker:${cardId}`).emit('poker_session_update');
      io.to(card.id_projeto).emit('card_moved', {
        ...card,
        votos: [] // Omitir votos detalhados para evitar vazamento
      });
    }

    console.log(`[PokerScheduler] Sessão expirada e PO/Gerente notificados para o card: ${cardId}`);
  } catch (err) {
    console.error("Erro ao processar expiração do poker:", err);
  }
};

/**
 * Agenda um timer para a expiração de uma votação
 */
export const schedulePokerExpiration = (cardId, delay, io) => {
  // Limpa qualquer agendamento existente para este card
  cancelPokerExpiration(cardId);

  console.log(`[PokerScheduler] Agendando expiração para o card ${cardId} em ${delay}ms`);

  const timeoutId = setTimeout(() => {
    processarExpiracaoPoker(cardId, io);
    global.pokerTimeouts.delete(cardId);
  }, delay);

  global.pokerTimeouts.set(cardId, timeoutId);
};

/**
 * Cancela um timer existente
 */
export const cancelPokerExpiration = (cardId) => {
  if (global.pokerTimeouts.has(cardId)) {
    console.log(`[PokerScheduler] Cancelando expiração ativa para o card ${cardId}`);
    clearTimeout(global.pokerTimeouts.get(cardId));
    global.pokerTimeouts.delete(cardId);
  }
};

/**
 * Inicializa todos os timeouts de votações ativas na inicialização do servidor
 */
export const inicializarTimeoutsPoker = async (io) => {
  try {
    const cards = await prisma.card.findMany({
      where: {
        descricao: {
          contains: "POKER_METADATA"
        },
        story_points: null
      }
    });

    console.log(`[PokerScheduler] Varrendo ${cards.length} cards em busca de sessões de poker ativas...`);

    for (const card of cards) {
      const poker = parsePokerMetadata(card.descricao);
      if (poker && poker.active && poker.expiresAt) {
        const expiresTime = new Date(poker.expiresAt).getTime();
        const now = Date.now();
        const delay = expiresTime - now;

        if (delay > 0) {
          schedulePokerExpiration(card.id_card, delay, io);
        } else {
          // Já expirou mas o servidor estava desligado ou não processou.
          // Processar imediatamente
          console.log(`[PokerScheduler] Sessão do card ${card.id_card} já expirada na inicialização. Processando encerramento...`);
          processarExpiracaoPoker(card.id_card, io);
        }
      }
    }
  } catch (err) {
    console.error("Erro ao inicializar timeouts do poker:", err);
  }
};

/**
 * Verifica se todos os membros DEV do projeto já votaram e encerra o poker antecipadamente
 */
export const verificarEEncerrarPokerAutomatico = async (cardId, io) => {
  try {
    const card = await prisma.card.findUnique({
      where: { id_card: cardId },
      include: {
        projeto: true,
        votos: true
      }
    });

    if (!card) return;

    const poker = parsePokerMetadata(card.descricao);
    if (!poker || !poker.active) return;

    // Buscar membros DEV do projeto
    const devs = await prisma.membroProjeto.findMany({
      where: {
        id_projeto: card.id_projeto,
        perfil: "DEV"
      }
    });

    // Se todos os devs votaram
    if (devs.length > 0 && card.votos.length >= devs.length) {
      console.log(`[PokerScheduler] Todos os ${devs.length} devs votaram. Encerrando poker automaticamente para o card: ${cardId}`);

      // Cancelar o timeout em memória
      cancelPokerExpiration(cardId);

      // Atualizar a descrição do card definindo expiresAt como a data atual (já expirada)
      const novoExpiresAt = new Date().toISOString();
      const novoPoker = { ...poker, expiresAt: novoExpiresAt };
      
      const regex = /<!-- POKER_METADATA:\s*({.*?})\s*-->/;
      const novaDescricao = card.descricao.replace(regex, `<!-- POKER_METADATA: ${JSON.stringify(novoPoker)} -->`);

      await prisma.card.update({
        where: { id_card: cardId },
        data: { descricao: novaDescricao }
      });

      // Buscar PO, GERENTE e ADMIN do projeto para notificar
      const membrosNotificar = await prisma.membroProjeto.findMany({
        where: {
          id_projeto: card.id_projeto,
          perfil: {
            in: ["PO", "GERENTE", "ADMIN"]
          }
        },
        include: { usuario: true }
      });

      const mensagem = `Todos os membros votaram! A votação do Planning Poker para o card "${card.titulo}" foi encerrada.`;

      for (const membro of membrosNotificar) {
        const notificacao = await prisma.notificacao.create({
          data: {
            id_usuario_destino: membro.id_usuario,
            id_card_origem: cardId,
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

      if (io) {
        io.to(`poker:${cardId}`).emit('poker_session_update');
        io.to(card.id_projeto).emit('card_moved', {
          ...card,
          descricao: novaDescricao,
          votos: [] // Omitir votos detalhados para evitar vazamento
        });
      }
    }
  } catch (err) {
    console.error("Erro ao verificar/encerrar poker automaticamente:", err);
  }
};
