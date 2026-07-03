import prisma from "../lib/prisma.js";

export const registrarLog = async ({
  id_usuario,
  acao,
  tipo_acao,
  status_log = "SUCESSO",
  id_card = null,
  id_sprint = null,
}) => {
  try {
    return await prisma.logAcoes.create({
      data: {
        id_usuario,
        acao,
        tipo_acao,
        status_log,
        id_card: id_card || null,
        id_sprint: id_sprint || null,
      },
    });
  } catch (error) {
    console.error("Erro ao registrar log:", error);
  }
};
