import prisma from "../lib/prisma.js";

/* =========================
   CRIAR CARD EM UM PROJETO
========================= */
export const criarCard = async (req, res) => {
  const { id } = req.params; // id do projeto
  const { titulo, descricao, prioridade, tags, id_responsavel, id_sprint } = req.body;

  try {
    if (!titulo) {
      return res.status(400).json({ error: "Título do card é obrigatório" });
    }

    // Verificar se o projeto existe
    const projeto = await prisma.projeto.findUnique({
      where: { id_projeto: id },
    });

    if (!projeto) {
      return res.status(404).json({ error: "Projeto não encontrado" });
    }

    const card = await prisma.card.create({
      data: {
        id_projeto: id,
        titulo,
        descricao: descricao || null,
        prioridade: prioridade || "MEDIA",
        status: "A_FAZER",
        tags: tags || [],
        id_responsavel: id_responsavel || null,
        id_sprint: id_sprint || null,
      },
      include: {
        responsavel: true,
      },
    });

    return res.status(201).json(card);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao criar card" });
  }
};

/* =========================
   ATUALIZAR STATUS DO CARD (DRAG & DROP)
========================= */
export const atualizarStatusCard = async (req, res) => {
  const { id } = req.params; // id do card
  const { status } = req.body;

  const validStatuses = ["A_FAZER", "EM_ANDAMENTO", "HOMOLOGACAO", "CONCLUIDO"];

  try {
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Status inválido. Use: ${validStatuses.join(", ")}`,
      });
    }

    const card = await prisma.card.findUnique({
      where: { id_card: id },
    });

    if (!card) {
      return res.status(404).json({ error: "Card não encontrado" });
    }

    const cardAtualizado = await prisma.card.update({
      where: { id_card: id },
      data: { status },
      include: {
        responsavel: true,
      },
    });

    return res.json(cardAtualizado);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao atualizar status do card" });
  }
};
