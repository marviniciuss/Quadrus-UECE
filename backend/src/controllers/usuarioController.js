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
    const { nome, email, username } = req.body;

    if (!nome || !email) {
      return res.status(400).json({
        error: "Nome e email são obrigatórios",
      });
    }

    // Validar formato do username (se fornecido)
    const usernameRegex = /^[a-z0-9_]{3,20}$/;
    if (username && !usernameRegex.test(username)) {
      return res.status(400).json({
        error: "Nome de usuário inválido. Use apenas letras minúsculas, números e underline (3-20 caracteres).",
      });
    }

    // Verificar unicidade do username (se fornecido)
    if (username) {
      const usernameExistente = await prisma.usuario.findUnique({
        where: { username },
      });
      if (usernameExistente) {
        return res.status(400).json({
          error: "Este nome de usuário já está em uso.",
        });
      }
    }

    const usuarioExistente = await prisma.usuario.findUnique({
      where: {
        email,
      },
    });

    if (usuarioExistente) {
      // Retorna o usuário existente sem sobrescrever o nome ou username alterados no perfil
      return res.status(200).json(usuarioExistente);
    }

    const usuario = await prisma.usuario.create({
      data: {
        nome,
        email,
        ...(username && { username }),
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
        OR: [
          {
            email: {
              contains: q.trim(),
              mode: 'insensitive',
            },
          },
          {
            nome: {
              contains: q.trim(),
              mode: 'insensitive',
            },
          },
          {
            username: {
              contains: q.trim(),
              mode: 'insensitive',
            },
          },
        ]
      },
      select: {
        id_usuario: true,
        nome: true,
        email: true,
        username: true,
      },
      take: Math.min(parseInt(limit) || 20, 50),
      orderBy: { email: 'asc' },
    });

    return res.status(200).json(usuarios);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao buscar usuários" });
  }
};

/**
 * Atualizar perfil do próprio usuário autenticado
 */
export const atualizarPerfil = async (req, res) => {
  try {
    const email = req.user.email;
    const { nome, foto, username } = req.body;

    if (!nome) {
      return res.status(400).json({
        error: "Nome é obrigatório",
      });
    }

    // Validar formato do username (se fornecido)
    const usernameRegex = /^[a-z0-9_]{3,20}$/;
    if (username && !usernameRegex.test(username)) {
      return res.status(400).json({
        error: "Nome de usuário inválido. Use apenas letras minúsculas, números e underline (3-20 caracteres).",
      });
    }

    // Verificar unicidade do username
    if (username) {
      const currentUser = await prisma.usuario.findUnique({ where: { email } });
      const usernameExistente = await prisma.usuario.findFirst({
        where: {
          username,
          NOT: { id_usuario: currentUser.id_usuario },
        },
      });
      if (usernameExistente) {
        return res.status(400).json({
          error: "Este nome de usuário já está em uso.",
        });
      }
    }

    const usuarioAtualizado = await prisma.usuario.update({
      where: {
        email,
      },
      data: {
        nome,
        foto,
        ...(username !== undefined && { username: username || null }),
      },
    });

    // Enviar atualizações em tempo real via Socket.io para todas as salas de projetos em que ele participa
    const io = req.app.get("io");
    if (io) {
      const membros = await prisma.membroProjeto.findMany({
        where: {
          id_usuario: usuarioAtualizado.id_usuario,
        },
        select: {
          id_projeto: true,
        },
      });

      membros.forEach((m) => {
        io.to(m.id_projeto).emit("usuario_atualizado", {
          id_usuario: usuarioAtualizado.id_usuario,
          nome: usuarioAtualizado.nome,
          foto: usuarioAtualizado.foto,
          username: usuarioAtualizado.username,
        });
      });
    }

    return res.status(200).json(usuarioAtualizado);
  } catch (error) {
    console.error("Erro ao atualizar perfil do usuário:", error);
    return res.status(500).json({
      error: "Erro ao atualizar perfil",
    });
  }
};