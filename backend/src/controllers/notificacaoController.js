import prisma from "../lib/prisma.js";

/**
 * Listar notificações do usuário autenticado
 */
export const listarNotificacoes = async (req, res) => {
  try {
    // Buscar o usuário pelo email do token Firebase
    const usuario = await prisma.usuario.findUnique({
      where: { email: req.user.email },
    });

    if (!usuario) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    const notificacoes = await prisma.notificacao.findMany({
      where: { id_usuario_destino: usuario.id_usuario },
      include: {
        card: {
          select: {
            id_card: true,
            titulo: true,
            status: true,
            id_projeto: true,
          },
        },
        projeto: {
          select: {
            id_projeto: true,
            nome: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return res.json(notificacoes);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao listar notificações" });
  }
};

/**
 * Marcar uma notificação como lida
 */
export const marcarComoLida = async (req, res) => {
  try {
    const { id } = req.params;

    const usuario = await prisma.usuario.findUnique({
      where: { email: req.user.email },
    });

    if (!usuario) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    const notificacao = await prisma.notificacao.findUnique({
      where: { id_notificacao: id },
    });

    if (!notificacao) {
      return res.status(404).json({ error: "Notificação não encontrada" });
    }

    // Verificar se a notificação pertence ao usuário autenticado
    if (notificacao.id_usuario_destino !== usuario.id_usuario) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    const atualizada = await prisma.notificacao.update({
      where: { id_notificacao: id },
      data: { lida: true },
    });

    return res.json(atualizada);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao marcar notificação como lida" });
  }
};

/**
 * Marcar todas as notificações do usuário como lidas
 */
export const marcarTodasComoLidas = async (req, res) => {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { email: req.user.email },
    });

    if (!usuario) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    await prisma.notificacao.updateMany({
      where: {
        id_usuario_destino: usuario.id_usuario,
        lida: false,
      },
      data: { lida: true },
    });

    return res.json({ message: "Todas as notificações foram marcadas como lidas" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao marcar notificações como lidas" });
  }
};

/**
 * Aceitar convite de projeto
 */
export const aceitarConvite = async (req, res) => {
  try {
    const { id } = req.params;

    const usuario = await prisma.usuario.findUnique({
      where: { email: req.user.email },
    });

    if (!usuario) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    const notificacao = await prisma.notificacao.findUnique({
      where: { id_notificacao: id },
    });

    if (!notificacao) {
      return res.status(404).json({ error: "Notificação não encontrada" });
    }

    // Verificar se a notificação pertence ao usuário autenticado e se é um convite
    if (notificacao.id_usuario_destino !== usuario.id_usuario) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    if (!notificacao.id_projeto_origem || !notificacao.convite_perfil) {
      return res.status(400).json({ error: "Esta notificação não é um convite de projeto válido" });
    }

    // Evitar duplicidade de membro
    const membroExistente = await prisma.membroProjeto.findUnique({
      where: {
        id_projeto_id_usuario: {
          id_projeto: notificacao.id_projeto_origem,
          id_usuario: usuario.id_usuario,
        },
      },
    });

    if (!membroExistente) {
      // Adicionar membro ao projeto
      await prisma.membroProjeto.create({
        data: {
          id_projeto: notificacao.id_projeto_origem,
          id_usuario: usuario.id_usuario,
          perfil: notificacao.convite_perfil,
        },
      });
    }

    // Deletar a notificação do convite após aceitar
    await prisma.notificacao.delete({
      where: { id_notificacao: id },
    });

    return res.json({ message: "Convite aceito com sucesso!" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao aceitar convite" });
  }
};

/**
 * Recusar convite de projeto
 */
export const recusarConvite = async (req, res) => {
  try {
    const { id } = req.params;

    const usuario = await prisma.usuario.findUnique({
      where: { email: req.user.email },
    });

    if (!usuario) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    const notificacao = await prisma.notificacao.findUnique({
      where: { id_notificacao: id },
    });

    if (!notificacao) {
      return res.status(404).json({ error: "Notificação não encontrada" });
    }

    if (notificacao.id_usuario_destino !== usuario.id_usuario) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    // Deletar a notificação do convite
    await prisma.notificacao.delete({
      where: { id_notificacao: id },
    });

    return res.json({ message: "Convite recusado com sucesso." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao recusar convite" });
  }
};

/**
 * Aceitar homologação de card
 */
export const aceitarHomologacao = async (req, res) => {
  try {
    const { id } = req.params;

    const usuario = await prisma.usuario.findUnique({
      where: { email: req.user.email },
    });

    if (!usuario) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    const notificacao = await prisma.notificacao.findUnique({
      where: { id_notificacao: id },
      include: { card: true }
    });

    if (!notificacao) {
      return res.status(404).json({ error: "Notificação não encontrada" });
    }

    if (notificacao.id_usuario_destino !== usuario.id_usuario) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    if (!notificacao.solicitacao_homologacao || !notificacao.id_card_origem) {
      return res.status(400).json({ error: "Esta notificação não é uma solicitação de homologação válida" });
    }

    const card = notificacao.card;
    if (!card) {
      return res.status(404).json({ error: "Card correspondente não encontrado" });
    }

    // Update the card assignee to the tester
    const cardAtualizado = await prisma.card.update({
      where: { id_card: card.id_card },
      data: {
        id_responsavel: usuario.id_usuario
      },
      include: {
        responsavel: true,
        sprint: true,
        etiquetas: true
      }
    });

    // Delete all homologation request notifications for this card
    await prisma.notificacao.deleteMany({
      where: {
        id_card_origem: card.id_card,
        solicitacao_homologacao: true
      }
    });

    // Register action log
    const { registrarLog } = await import("../utils/registrarLog.js");
    await registrarLog({
      id_usuario: usuario.id_usuario,
      acao: `Aceitou homologar o card "${card.titulo}"`,
      tipo_acao: "OUTRO",
      id_card: card.id_card,
      id_sprint: card.id_sprint,
    });

    // Emit socket event to reload the board
    const io = req.app.get('io');
    if (io) {
      io.to(card.id_projeto).emit('card_moved', cardAtualizado);
    }

    return res.json({ message: "Homologação aceita com sucesso!", card: cardAtualizado });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao aceitar homologação" });
  }
};
