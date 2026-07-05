import prisma from "../lib/prisma.js";
import { obterMembroProjeto } from "../utils/projetoAuth.js";

/**
 * Validar Acesso de Gerente
 */
const validarAcessoGerente = async (projectId, email) => {
  const membro = await obterMembroProjeto(projectId, email);
  if (!membro || membro.perfil !== "GERENTE") {
    throw new Error("Acesso negado: Apenas o GERENTE pode acessar os relatórios");
  }
  return membro;
};

/**
 * Obter Relatório Diário de Atividades (RDA)
 * Exporta apenas tarefas Concluídas.
 */
export const obterRDA = async (req, res) => {
  const { projectId } = req.params;

  try {
    await validarAcessoGerente(projectId, req.user.email);

    // Buscar cards concluídos do projeto e seu último log de movimentação
    const cardsConcluidos = await prisma.card.findMany({
      where: {
        id_projeto: projectId,
        status: "CONCLUIDO",
        deletado_em: null,
      },
      include: {
        sprint: true,
        logs: {
          where: { tipo_acao: "MOVIMENTACAO" },
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { usuario: true },
        },
        responsavel: true,
      },
    });

    const rdaData = cardsConcluidos.map((card) => {
      const ultimoLog = card.logs[0];
      const concluidoEm = ultimoLog ? ultimoLog.createdAt : card.updatedAt;
      const concluidoPor = ultimoLog ? ultimoLog.usuario.nome : "Desconhecido";

      // Calcular se houve atraso (baseado na data final da sprint)
      let atrasoDias = 0;
      let comAtraso = false;

      if (card.sprint && card.sprint.data_fim) {
        const dataFimSprint = new Date(card.sprint.data_fim);
        const dataConclusao = new Date(concluidoEm);
        
        if (dataConclusao > dataFimSprint) {
          comAtraso = true;
          const diffTime = Math.abs(dataConclusao - dataFimSprint);
          atrasoDias = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }
      }

      return {
        id: card.id_card,
        nome: card.titulo,
        pontos: card.story_points || 0,
        responsavel: card.responsavel ? card.responsavel.nome : "Não atribuído",
        concluidoPor,
        dataConclusao: concluidoEm,
        sprint: card.sprint ? card.sprint.nome : "Sem Sprint",
        comAtraso,
        atrasoDias,
      };
    });

    return res.json(rdaData);
  } catch (error) {
    if (error.message.includes("Acesso negado")) {
      return res.status(403).json({ error: error.message });
    }
    console.error("Erro ao gerar RDA:", error);
    return res.status(500).json({ error: "Erro ao gerar RDA" });
  }
};

/**
 * Obter dados para o Placar de Pontos (Velocity)
 * Agrupamento por sprint, dia ou semana.
 */
export const obterVelocity = async (req, res) => {
  const { projectId } = req.params;
  const { agrupamento = "sprint" } = req.query; // 'sprint', 'dia', 'semana'

  try {
    await validarAcessoGerente(projectId, req.user.email);

    const cardsConcluidos = await prisma.card.findMany({
      where: {
        id_projeto: projectId,
        status: "CONCLUIDO",
        deletado_em: null,
      },
      include: {
        sprint: true,
        logs: {
          where: { tipo_acao: "MOVIMENTACAO" },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    let dadosAgrupados = {};

    cardsConcluidos.forEach((card) => {
      const pontos = card.story_points || 0;
      const ultimoLog = card.logs[0];
      const dataConclusao = ultimoLog ? new Date(ultimoLog.createdAt) : new Date(card.updatedAt);

      let chaveAgrupamento = "Desconhecido";

      if (agrupamento === "sprint") {
        chaveAgrupamento = card.sprint ? card.sprint.nome : "Sem Sprint";
      } else if (agrupamento === "dia") {
        chaveAgrupamento = dataConclusao.toISOString().split("T")[0]; // YYYY-MM-DD
      } else if (agrupamento === "semana") {
        // Obter o primeiro dia (Domingo) da semana daquela data
        const date = new Date(dataConclusao);
        const day = date.getDay();
        const diff = date.getDate() - day;
        const sunday = new Date(date.setDate(diff));
        chaveAgrupamento = sunday.toISOString().split("T")[0]; // YYYY-MM-DD
      }

      if (!dadosAgrupados[chaveAgrupamento]) {
        dadosAgrupados[chaveAgrupamento] = { pontos: 0, tarefas: 0, nome: chaveAgrupamento };
      }

      dadosAgrupados[chaveAgrupamento].pontos += pontos;
      dadosAgrupados[chaveAgrupamento].tarefas += 1;
    });

    // Converter para array e ordenar (por nome se for sprint, ou cronológico se data)
    let arrayDados = Object.values(dadosAgrupados);

    if (agrupamento === "dia" || agrupamento === "semana") {
      arrayDados.sort((a, b) => new Date(a.nome) - new Date(b.nome));
    } else {
      arrayDados.sort((a, b) => a.nome.localeCompare(b.nome));
    }

    return res.json(arrayDados);
  } catch (error) {
    if (error.message.includes("Acesso negado")) {
      return res.status(403).json({ error: error.message });
    }
    console.error("Erro ao gerar Velocity:", error);
    return res.status(500).json({ error: "Erro ao gerar Velocity" });
  }
};
