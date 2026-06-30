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
