import prisma from "../lib/prisma.js";
import { obterMembroProjeto } from "../utils/projetoAuth.js";

// Valores válidos: Fibonacci [1, 2, 3, 5, 8, 13, 21] ou -1 (para representar "não sei")
const VALORES_POKER_VALIDOS = [-1, 1, 2, 3, 5, 8, 13, 21];

/**
 * Listar todos os votos de um card
 */
export const listarVotosCard = async (req, res) => {
  try {
    const { idCard } = req.params;

    const card = await prisma.card.findUnique({
      where: { id_card: idCard },
      select: { id_projeto: true },
    });

    if (!card) {
      return res.status(404).json({
        error: "Card não encontrado",
      });
    }

    // Verificar se o usuário autenticado pertence ao projeto do card
    const membro = await obterMembroProjeto(card.id_projeto, req.user.email);
    if (!membro) {
      return res.status(403).json({
        error: "Acesso negado: você não é membro deste projeto",
      });
    }

    const votos = await prisma.votoPoker.findMany({
      where: {
        id_card: idCard,
      },
      include: {
        usuario: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return res.status(200).json(votos);

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Erro ao listar votos",
    });
  }
};

/**
 * Buscar voto de um usuário em um card
 */
export const buscarVoto = async (req, res) => {
  try {
    const { idCard, idUsuario } = req.params;

    const card = await prisma.card.findUnique({
      where: { id_card: idCard },
      select: { id_projeto: true },
    });

    if (!card) {
      return res.status(404).json({
        error: "Card não encontrado",
      });
    }

    // Verificar se o usuário autenticado pertence ao projeto do card
    const membro = await obterMembroProjeto(card.id_projeto, req.user.email);
    if (!membro) {
      return res.status(403).json({
        error: "Acesso negado: você não é membro deste projeto",
      });
    }

    const voto = await prisma.votoPoker.findFirst({
      where: {
        id_card: idCard,
        id_usuario: idUsuario,
      },
      include: {
        usuario: true,
        card: true,
      },
    });

    if (!voto) {
      return res.status(404).json({
        error: "Voto não encontrado",
      });
    }

    return res.status(200).json(voto);

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Erro ao buscar voto",
    });
  }
};

/**
 * Criar voto
 */
export const criarVoto = async (req, res) => {
  try {
    const { idCard } = req.params;
    const { valor } = req.body;

    if (valor === undefined) {
      return res.status(400).json({
        error: "Valor do voto é obrigatório",
      });
    }

    if (!VALORES_POKER_VALIDOS.includes(valor)) {
      return res.status(400).json({
        error: "Valor inválido para Planning Poker",
      });
    }

    const card = await prisma.card.findUnique({
      where: {
        id_card: idCard,
      },
      select: { id_projeto: true },
    });

    if (!card) {
      return res.status(404).json({
        error: "Card não encontrado",
      });
    }

    // Obter o usuário a partir do email autenticado
    const usuarioLogado = await prisma.usuario.findUnique({
      where: { email: req.user.email },
    });

    if (!usuarioLogado) {
      return res.status(404).json({
        error: "Usuário autenticado não encontrado no banco de dados",
      });
    }

    // Verificar se o usuário pertence ao projeto do card
    const membro = await obterMembroProjeto(card.id_projeto, req.user.email);
    if (!membro) {
      return res.status(403).json({
        error: "Acesso negado: você não é membro deste projeto",
      });
    }

    // Verificar se o usuário já votou
    const votoExistente = await prisma.votoPoker.findFirst({
      where: {
        id_card: idCard,
        id_usuario: usuarioLogado.id_usuario,
      },
    });

    if (votoExistente) {
      return res.status(409).json({
        error: "Usuário já votou neste card. Atualize o voto existente.",
      });
    }

    const voto = await prisma.votoPoker.create({
      data: {
        id_card: idCard,
        id_usuario: usuarioLogado.id_usuario,
        valor,
      },
      include: {
        usuario: true,
        card: true,
      },
    });

    return res.status(201).json(voto);

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Erro ao registrar voto",
    });
  }
};

/**
 * Atualizar voto
 */
export const atualizarVoto = async (req, res) => {
  try {
    const { id } = req.params;
    const { valor } = req.body;

    if (valor === undefined) {
      return res.status(400).json({
        error: "Valor do voto é obrigatório",
      });
    }

    if (!VALORES_POKER_VALIDOS.includes(valor)) {
      return res.status(400).json({
        error: "Valor inválido para Planning Poker",
      });
    }

    const voto = await prisma.votoPoker.findUnique({
      where: {
        id_voto: id,
      },
    });

    if (!voto) {
      return res.status(404).json({
        error: "Voto não encontrado",
      });
    }

    // Obter o usuário a partir do email autenticado
    const usuarioLogado = await prisma.usuario.findUnique({
      where: { email: req.user.email },
    });

    if (!usuarioLogado || voto.id_usuario !== usuarioLogado.id_usuario) {
      return res.status(403).json({
        error: "Acesso negado: você só pode alterar o seu próprio voto",
      });
    }

    const votoAtualizado = await prisma.votoPoker.update({
      where: {
        id_voto: id,
      },
      data: {
        valor,
      },
    });

    return res.status(200).json(votoAtualizado);

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Erro ao atualizar voto",
    });
  }
};

/**
 * Remover voto
 */
export const deletarVoto = async (req, res) => {
  try {
    const { id } = req.params;

    const voto = await prisma.votoPoker.findUnique({
      where: {
        id_voto: id,
      },
    });

    if (!voto) {
      return res.status(404).json({
        error: "Voto não encontrado",
      });
    }

    // Obter o usuário a partir do email autenticado
    const usuarioLogado = await prisma.usuario.findUnique({
      where: { email: req.user.email },
    });

    if (!usuarioLogado || voto.id_usuario !== usuarioLogado.id_usuario) {
      return res.status(403).json({
        error: "Acesso negado: você só pode remover o seu próprio voto",
      });
    }

    await prisma.votoPoker.delete({
      where: {
        id_voto: id,
      },
    });

    return res.status(200).json({
      mensagem: "Voto removido com sucesso",
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Erro ao remover voto",
    });
  }
};

/**
 * Reiniciar votação
 */
export const reiniciarVotacao = async (req, res) => {
  try {
    const { idCard } = req.params;

    const card = await prisma.card.findUnique({
      where: {
        id_card: idCard,
      },
      select: { id_projeto: true },
    });

    if (!card) {
      return res.status(404).json({
        error: "Card não encontrado",
      });
    }

    // Verificar se o usuário autenticado é PO ou Gerente do projeto
    const membro = await obterMembroProjeto(card.id_projeto, req.user.email);
    if (!membro) {
      return res.status(403).json({
        error: "Acesso negado: você não é membro deste projeto",
      });
    }

    if (membro.perfil !== "GERENTE" && membro.perfil !== "PO") {
      return res.status(403).json({
        error: "Acesso negado: apenas PO e Gerente podem reiniciar a votação",
      });
    }

    await prisma.votoPoker.deleteMany({
      where: {
        id_card: idCard,
      },
    });

    return res.status(200).json({
      mensagem: "Votação reiniciada com sucesso",
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Erro ao reiniciar votação",
    });
  }
};
