import prisma from "../lib/prisma.js";

/* =========================
   LISTAR PROJETOS
========================= */
export const listarProjetos = async (req, res) => {
  try {
    const projetos = await prisma.projeto.findMany({
      include: {
        membros: true,
        sprints: true,
        cards: true,
      },
    });

    return res.json(projetos);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao listar projetos" });
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
        membros: true,
        sprints: true,
        cards: true,
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

    const projeto = await prisma.projeto.create({
      data: {
        nome,
        descricao,
        data_prazo: data_prazo ? new Date(data_prazo) : null,
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
  const { nome, descricao, data_prazo } = req.body;

  try {
    const projetoExistente = await prisma.projeto.findUnique({
      where: { id_projeto: id },
    });

    if (!projetoExistente) {
      return res.status(404).json({ error: "Projeto não encontrado" });
    }

    const projeto = await prisma.projeto.update({
      where: { id_projeto: id },
      data: {
        ...(nome !== undefined && { nome }),
        ...(descricao !== undefined && { descricao }),
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
    });

    if (!projeto) {
      return res.status(404).json({ error: "Projeto não encontrado" });
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