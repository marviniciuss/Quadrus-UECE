import prisma from "../lib/prisma.js";

/**
 * Verifica se o usuário é membro do projeto.
 * Retorna o objeto MembroProjeto se for membro, caso contrário retorna null.
 */
export const obterMembroProjeto = async (idProjeto, emailUsuario) => {
  if (!idProjeto || !emailUsuario) return null;
  try {
    return await prisma.membroProjeto.findFirst({
      where: {
        id_projeto: idProjeto,
        usuario: {
          email: emailUsuario,
        },
      },
      include: {
        usuario: true,
      },
    });
  } catch (error) {
    console.error("Erro ao obter membro do projeto:", error);
    return null;
  }
};
