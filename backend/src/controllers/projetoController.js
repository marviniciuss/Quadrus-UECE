import prisma from "../lib/prisma.js";

/* =========================
   LISTAR PROJETOS
========================= */
export const listarProjetos = async (req, res) => {
  try {
    const projetos = await prisma.projeto.findMany({
      include: {
        membros: {
          include: { usuario: true },
        },
        sprints: true,
        cards: {
          where: { deletado_em: null },
          include: { responsavel: true },
        },
      },
    });

    return res.json(projetos);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao listar projetos" });
  }
};

/* =========================
   LISTAR PROJETOS DO USUÁRIO LOGADO
========================= */
export const listarProjetosDoUsuario = async (req, res) => {
  try {
    const emailUsuario = req.user.email;
    const { arquivados } = req.query;
    const isArquivado = arquivados === 'true';

    const projetos = await prisma.projeto.findMany({
      where: {
        arquivado: isArquivado,
        membros: {
          some: {
            usuario: {
              email: emailUsuario,
            },
          },
        },
      },
      include: {
        membros: {
          include: { usuario: true },
        },
        sprints: true,
        cards: {
          where: { deletado_em: null },
          include: { responsavel: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json(projetos);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao listar projetos do usuário" });
  }
};

/* =========================
   OBTER PROJETO POR ID
========================= */
export const obterProjeto = async (req, res) => {
  const { id } = req.params;

  try {
    const projeto = await prisma.projeto.findUnique({
      where: { id_projeto: id },
      include: {
        membros: {
          include: { usuario: true },
        },
        sprints: true,
        cards: {
          where: { deletado_em: null },
          include: { responsavel: true },
        },
      },
    });

    if (!projeto) {
      return res.status(404).json({ error: "Projeto não encontrado" });
    }

    return res.json(projeto);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao buscar projeto" });
  }
};

/* =========================
   CRIAR PROJETO
========================= */
export const criarProjeto = async (req, res) => {
  const { nome, descricao, data_prazo } = req.body;

  try {
    if (!nome) {
      return res.status(400).json({
        error: "Nome do projeto é obrigatório",
      });
    }

    // Buscar o usuário logado pelo email do token Firebase
    const emailUsuario = req.user.email;
    const usuario = await prisma.usuario.findUnique({
      where: { email: emailUsuario },
    });

    if (!usuario) {
      return res.status(404).json({ error: "Usuário autenticado não encontrado no banco" });
    }

    // Criar o projeto e adicionar o criador como GERENTE automaticamente
    const projeto = await prisma.projeto.create({
      data: {
        nome,
        descricao,
        data_prazo: data_prazo ? new Date(data_prazo) : null,
        membros: {
          create: {
            id_usuario: usuario.id_usuario,
            perfil: "GERENTE",
          },
        },
      },
      include: {
        membros: {
          include: { usuario: true },
        },
        sprints: true,
        cards: true,
      },
    });

    return res.status(201).json(projeto);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao criar projeto" });
  }
};

/* =========================
   ATUALIZAR PROJETO
========================= */
export const atualizarProjeto = async (req, res) => {
  const { id } = req.params;
  const { nome, descricao, data_prazo, arquivado } = req.body;

  try {
    const projetoExistente = await prisma.projeto.findUnique({
      where: { id_projeto: id },
      include: {
        membros: {
          include: { usuario: true }
        }
      }
    });

    if (!projetoExistente) {
      return res.status(404).json({ error: "Projeto não encontrado" });
    }

    const emailUsuario = req.user.email;
    const isGerente = projetoExistente.membros.some(
      (membro) => membro.usuario.email === emailUsuario && membro.perfil === 'GERENTE'
    );

    if (!isGerente) {
      return res.status(403).json({ error: "Acesso negado: apenas gerentes podem editar as configurações do projeto" });
    }

    const projeto = await prisma.projeto.update({
      where: { id_projeto: id },
      data: {
        ...(nome !== undefined && { nome }),
        ...(descricao !== undefined && { descricao }),
        ...(arquivado !== undefined && { arquivado }),
        ...(data_prazo !== undefined && {
          data_prazo: data_prazo ? new Date(data_prazo) : null,
        }),
      },
    });

    return res.json(projeto);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao atualizar projeto" });
  }
};

/* =========================
   DELETAR PROJETO
========================= */
export const deletarProjeto = async (req, res) => {
  const { id } = req.params;

  try {
    const projeto = await prisma.projeto.findUnique({
      where: { id_projeto: id },
      include: {
        membros: {
          include: { usuario: true }
        }
      }
    });

    if (!projeto) {
      return res.status(404).json({ error: "Projeto não encontrado" });
    }

    const emailUsuario = req.user.email;
    const isGerente = projeto.membros.some(
      (membro) => membro.usuario.email === emailUsuario && membro.perfil === 'GERENTE'
    );

    if (!isGerente) {
      return res.status(403).json({ error: "Acesso negado: apenas gerentes podem excluir o projeto" });
    }

    await prisma.projeto.delete({
      where: { id_projeto: id },
    });

    return res.json({ mensagem: "Projeto removido com sucesso" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao deletar projeto" });
  }
};

/* =========================
   ADICIONAR MEMBRO
========================= */
export const adicionarMembro = async (req, res) => {
  const { id } = req.params;
  const { id_usuario, perfil } = req.body;

  try {
    // validar projeto
    const projeto = await prisma.projeto.findUnique({
      where: { id_projeto: id },
    });

    if (!projeto) {
      return res.status(404).json({ error: "Projeto não encontrado" });
    }

    // validar usuário
    const usuario = await prisma.usuario.findUnique({
      where: { id_usuario },
    });

    if (!usuario) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    // evitar duplicidade
    const membroExistente = await prisma.membroProjeto.findUnique({
      where: {
        id_projeto_id_usuario: {
          id_projeto: id,
          id_usuario,
        },
      },
    });

    if (membroExistente) {
      return res.status(400).json({
        error: "Usuário já é membro do projeto",
      });
    }

    // criar membro
    const membro = await prisma.membroProjeto.create({
      data: {
        id_projeto: id,
        id_usuario,
        perfil,
      },
    });

    return res.status(201).json(membro);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao adicionar membro" });
  }
};