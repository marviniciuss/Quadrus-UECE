import prisma from "../lib/prisma.js";
import { obterMembroProjeto } from "../utils/projetoAuth.js";

/**
 * Listar todos os membros de um projeto
 */
export const listarMembrosProjeto = async (req, res) => {
  try {
    const { idProjeto } = req.params;

    // Verificar se o usuário autenticado pertence ao projeto
    const membroRequisitante = await obterMembroProjeto(idProjeto, req.user.email);
    if (!membroRequisitante) {
      return res.status(403).json({
        error: "Acesso negado: você não é membro deste projeto",
      });
    }

    const membros = await prisma.membroProjeto.findMany({
      where: {
        id_projeto: idProjeto,
      },
      include: {
        usuario: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return res.status(200).json(membros);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Erro ao listar membros do projeto",
    });
  }
};

/**
 * Buscar um membro específico
 */
export const buscarMembroPorId = async (req, res) => {
  try {
    const { idProjeto, idUsuario } = req.params;

    // Verificar se o usuário autenticado pertence ao projeto
    const membroRequisitante = await obterMembroProjeto(idProjeto, req.user.email);
    if (!membroRequisitante) {
      return res.status(403).json({
        error: "Acesso negado: você não é membro deste projeto",
      });
    }

    const membro = await prisma.membroProjeto.findFirst({
      where: {
        id_projeto: idProjeto,
        id_usuario: idUsuario,
      },
      include: {
        usuario: true,
        projeto: true,
      },
    });

    if (!membro) {
      return res.status(404).json({
        error: "Membro não encontrado",
      });
    }

    return res.status(200).json(membro);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Erro ao buscar membro",
    });
  }
};
