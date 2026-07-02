import prisma from "../lib/prisma.js";

export const garantirCustomizacaoInicial = async (idProjeto) => {
  // 1. Garantir Colunas
  let colunas = await prisma.coluna.findMany({
    where: { id_projeto: idProjeto },
    orderBy: { ordem: "asc" },
  });

  if (colunas.length === 0) {
    const colunasPadrao = [
      { nome: "A FAZER", cor: "#e2e8f0", ordem: 0 },
      { nome: "EM ANDAMENTO", cor: "#fef3c7", ordem: 1 },
      { nome: "HOMOLOGAÇÃO", cor: "#f3e8ff", ordem: 2 },
      { nome: "CONCLUÍDO", cor: "#d1fae5", ordem: 3 },
    ];

    colunas = [];
    for (const col of colunasPadrao) {
      const novaCol = await prisma.coluna.create({
        data: {
          id_projeto: idProjeto,
          nome: col.nome,
          cor: col.cor,
          ordem: col.ordem,
        },
      });
      colunas.push(novaCol);
    }
  }

  // 2. Associar cards sem id_coluna às colunas corretas
  const cardsSemColuna = await prisma.card.findMany({
    where: {
      id_projeto: idProjeto,
      id_coluna: null,
    },
  });

  if (cardsSemColuna.length > 0) {
    for (const card of cardsSemColuna) {
      let nomeColuna = "A FAZER";
      if (card.status === "EM_ANDAMENTO") nomeColuna = "EM ANDAMENTO";
      else if (card.status === "HOMOLOGACAO") nomeColuna = "HOMOLOGAÇÃO";
      else if (card.status === "CONCLUIDO") nomeColuna = "CONCLUÍDO";

      const col = colunas.find((c) => c.nome === nomeColuna) || colunas[0];

      await prisma.card.update({
        where: { id_card: card.id_card },
        data: { id_coluna: col.id_coluna },
      });
    }
  }

  // 3. Garantir Etiquetas
  let etiquetas = await prisma.etiqueta.findMany({
    where: { id_projeto: idProjeto },
  });

  if (etiquetas.length === 0) {
    const etiquetasPadrao = [
      { nome: "FRONTEND", cor: "#3B82F6" },
      { nome: "DESIGN", cor: "#EC4899" },
      { nome: "BACKEND", cor: "#10B981" },
      { nome: "DEVOPS", cor: "#F59E0B" },
    ];

    etiquetas = [];
    for (const et of etiquetasPadrao) {
      const novaEt = await prisma.etiqueta.create({
        data: {
          id_projeto: idProjeto,
          nome: et.nome,
          cor: et.cor,
        },
      });
      etiquetas.push(novaEt);
    }
  }

  // 4. Migrar tags de cards existentes (String[]) para etiquetas (relação no DB)
  const cardsSemEtiquetasRelacionadas = await prisma.card.findMany({
    where: {
      id_projeto: idProjeto,
      etiquetas: {
        none: {},
      },
    },
  });

  for (const card of cardsSemEtiquetasRelacionadas) {
    if (card.tags && card.tags.length > 0) {
      const idsEtiquetasParaConectar = [];
      for (const t of card.tags) {
        const etiquetaObj = etiquetas.find((e) => e.nome.toUpperCase() === t.toUpperCase());
        if (etiquetaObj) {
          idsEtiquetasParaConectar.push({ id_etiqueta: etiquetaObj.id_etiqueta });
        }
      }

      if (idsEtiquetasParaConectar.length > 0) {
        await prisma.card.update({
          where: { id_card: card.id_card },
          data: {
            etiquetas: {
              connect: idsEtiquetasParaConectar,
            },
          },
        });
      }
    }
  }

  return { colunas, etiquetas };
};
