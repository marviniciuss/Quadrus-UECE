import prisma from "../lib/prisma.js";

/**
 * Listar todos os usuários
 */
export const listarUsuarios = async (req, res) => {
  try {
    const usuarios = await prisma.usuario.findMany({
      include: {
        membros: {
          include: {
            projeto: true,
          },
        },
      },
    });

    return res.status(200).json(usuarios);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Erro ao listar usuários",
    });
  }
};

/**
 * Buscar usuário por ID
 */
export const buscarUsuarioPorId = async (req, res) => {
  try {
    const { id } = req.params;

    const usuario = await prisma.usuario.findUnique({
      where: {
        id_usuario: id,
      },
      include: {
        membros: {
          include: {
            projeto: true,
          },
        },
        cards: true,
        notificacoes: true,
        votos: true,
        logs: true,
      },
    });

    if (!usuario) {
      return res.status(404).json({
        error: "Usuário não encontrado",
      });
    }

    return res.status(200).json(usuario);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Erro ao buscar usuário",
    });
  }
};

/**
 * Criar usuário
 */
export const criarUsuario = async (req, res) => {
  try {
    const { nome, email } = req.body;

    if (!nome || !email) {
      return res.status(400).json({
        error: "Nome e email são obrigatórios",
      });
    }

    const usuarioExistente = await prisma.usuario.findUnique({
      where: {
        email,
      },
    });

    if (usuarioExistente) {
      if (nome && usuarioExistente.nome !== nome) {
        const usuarioAtualizado = await prisma.usuario.update({
          where: { email },
          data: { nome },
        });
        return res.status(200).json(usuarioAtualizado);
      }
      return res.status(200).json(usuarioExistente);
    }

    const usuario = await prisma.usuario.create({
      data: {
        nome,
        email,
      },
    });

    return res.status(201).json(usuario);
  } catch (error) {
    console.error("Erro ao criar usuário:", error);

    return res.status(500).json({
      error: "Erro ao criar usuário",
    });
  }
};

/**
 * Atualizar usuário
 */
export const atualizarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, email } = req.body;

    const usuario = await prisma.usuario.findUnique({
      where: {
        id_usuario: id,
      },
    });

    if (!usuario) {
      return res.status(404).json({
        error: "Usuário não encontrado",
      });
    }

    if (email) {
      const emailExistente = await prisma.usuario.findFirst({
        where: {
          email,
          NOT: {
            id_usuario: id,
          },
        },
      });

      if (emailExistente) {
        return res.status(409).json({
          error: "Este email já está sendo utilizado",
        });
      }
    }

    const usuarioAtualizado = await prisma.usuario.update({
      where: {
        id_usuario: id,
      },
      data: {
        nome,
        email,
      },
    });

    return res.status(200).json(usuarioAtualizado);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Erro ao atualizar usuário",
    });
  }
};

/**
 * Excluir usuário
 */
export const deletarUsuario = async (req, res) => {
  try {
    const { id } = req.params;

    const usuario = await prisma.usuario.findUnique({
      where: {
        id_usuario: id,
      },
    });

    if (!usuario) {
      return res.status(404).json({
        error: "Usuário não encontrado",
      });
    }

    await prisma.usuario.delete({
      where: {
        id_usuario: id,
      },
    });

    return res.status(200).json({
      mensagem: "Usuário removido com sucesso",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Erro ao remover usuário",
    });
  }
};

/**
 * Buscar usuários por nome (busca server-side com paginação)
 */
export const buscarUsuarios = async (req, res) => {
  try {
    const { q = '', limit = 20 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(200).json([]);
    }

    const usuarios = await prisma.usuario.findMany({
      where: {
        nome: {
          contains: q.trim(),
          mode: 'insensitive',
        },
      },
      select: {
        id_usuario: true,
        nome: true,
        email: true,
      },
      take: Math.min(parseInt(limit) || 20, 50),
      orderBy: { nome: 'asc' },
    });

    return res.status(200).json(usuarios);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao buscar usuários" });
  }
};