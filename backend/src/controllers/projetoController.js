import prisma from "../lib/prisma.js";
import { garantirCustomizacaoInicial } from "../utils/garantirCustomizacaoInicial.js";

// Perfis válidos do sistema
const PERFIS_VALIDOS = ['ADMIN', 'GERENTE', 'PO', 'DEV', 'TESTER'];

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
    // Garantir colunas e etiquetas padrão se não existirem
    await garantirCustomizacaoInicial(id);

    const projeto = await prisma.projeto.findUnique({
      where: { id_projeto: id },
      include: {
        membros: {
          include: { usuario: true },
        },
        sprints: true,
        colunas: {
          orderBy: { ordem: "asc" },
        },
        etiquetas: true,
        cards: {
          where: { deletado_em: null },
          include: {
            responsavel: true,
            etiquetas: true,
          },
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
    });

    // Inicializar as colunas e etiquetas padrões imediatamente
    await garantirCustomizacaoInicial(projeto.id_projeto);

    // Buscar o projeto completo com as colunas e etiquetas inicializadas
    const projetoCompleto = await prisma.projeto.findUnique({
      where: { id_projeto: projeto.id_projeto },
      include: {
        membros: {
          include: { usuario: true },
        },
        sprints: true,
        colunas: {
          orderBy: { ordem: "asc" },
        },
        etiquetas: true,
        cards: {
          where: { deletado_em: null },
          include: {
            responsavel: true,
            etiquetas: true,
          },
        },
      },
    });

    return res.status(201).json(projetoCompleto);
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
      (membro) => membro.usuario.email === emailUsuario && (membro.perfil === 'GERENTE' || membro.perfil === 'ADMIN')
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
   ADICIONAR MEMBRO (ENVIAR CONVITE)
========================= */
export const adicionarMembro = async (req, res) => {
  const { id } = req.params;
  const { email, perfil } = req.body;

  try {
    // validar projeto
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

    const emailUsuarioLogado = req.user.email;
    const canInvite = projeto.membros.some(
      (membro) => membro.usuario.email === emailUsuarioLogado && (membro.perfil === 'GERENTE' || membro.perfil === 'ADMIN' || membro.perfil === 'PO')
    );

    if (!canInvite) {
      return res.status(403).json({ error: "Acesso negado: apenas gerentes e POs podem convidar membros" });
    }

    if (!perfil || !PERFIS_VALIDOS.includes(perfil)) {
      return res.status(400).json({ error: `Perfil inválido. Perfis válidos: ${PERFIS_VALIDOS.join(', ')}` });
    }

    // validar usuário a ser convidado
    const usuario = await prisma.usuario.findUnique({
      where: { email },
    });

    if (!usuario) {
      return res.status(404).json({ error: "O usuário com este e-mail ainda não se cadastrou/logou no sistema." });
    }

    // evitar duplicidade - membro ativo
    const membroExistente = await prisma.membroProjeto.findUnique({
      where: {
        id_projeto_id_usuario: {
          id_projeto: id,
          id_usuario: usuario.id_usuario,
        },
      },
    });

    if (membroExistente) {
      return res.status(400).json({
        error: "Usuário já é membro do projeto",
      });
    }

    // evitar duplicidade - convite pendente
    const convitePendente = await prisma.notificacao.findFirst({
      where: {
        id_usuario_destino: usuario.id_usuario,
        id_projeto_origem: id,
        lida: false,
      },
    });

    if (convitePendente) {
      return res.status(400).json({
        error: "Convite pendente já enviado para este usuário",
      });
    }

    // criar notificação de convite
    const mensagem = `Você foi convidado para participar do projeto "${projeto.nome}" como ${perfil}.`;
    const notificacao = await prisma.notificacao.create({
      data: {
        id_usuario_destino: usuario.id_usuario,
        id_projeto_origem: id,
        convite_perfil: perfil,
        mensagem,
      },
    });

    // Emitir notificação em tempo real via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${usuario.id_usuario}`).emit('nova_notificacao', notificacao);
    }

    return res.status(201).json({
      message: "Convite enviado com sucesso",
      notificacao,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao convidar membro" });
  }
};

/* =========================
   REMOVER MEMBRO
========================= */
export const removerMembro = async (req, res) => {
  const { id, idUsuario } = req.params;

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

    const emailUsuarioLogado = req.user.email;
    const isGerente = projeto.membros.some(
      (membro) => membro.usuario.email === emailUsuarioLogado && (membro.perfil === 'GERENTE' || membro.perfil === 'ADMIN')
    );

    if (!isGerente) {
      return res.status(403).json({ error: "Acesso negado: apenas gerentes podem remover membros" });
    }

    // Impedir remoção do último gerente do projeto
    const membroAlvo = projeto.membros.find(m => m.id_usuario === idUsuario);
    if (membroAlvo && membroAlvo.perfil === 'GERENTE') {
      const totalGerentes = projeto.membros.filter(m => m.perfil === 'GERENTE').length;
      if (totalGerentes <= 1) {
        return res.status(400).json({ error: "Não é possível remover o último gerente do projeto. Promova outro membro a gerente antes." });
      }
    }

    await prisma.membroProjeto.delete({
      where: {
        id_projeto_id_usuario: {
          id_projeto: id,
          id_usuario: idUsuario
        }
      }
    });

    return res.json({ mensagem: "Membro removido com sucesso" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao remover membro" });
  }
};

/* =========================
   ATUALIZAR PERFIL DO MEMBRO
========================= */
export const atualizarMembro = async (req, res) => {
  const { id, idUsuario } = req.params;
  const { perfil } = req.body;

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

    const emailUsuarioLogado = req.user.email;
    const isGerente = projeto.membros.some(
      (membro) => membro.usuario.email === emailUsuarioLogado && (membro.perfil === 'GERENTE' || membro.perfil === 'ADMIN')
    );

    if (!isGerente) {
      return res.status(403).json({ error: "Acesso negado: apenas gerentes podem atualizar perfis de membros" });
    }

    if (!perfil || !PERFIS_VALIDOS.includes(perfil)) {
      return res.status(400).json({ error: `Perfil inválido. Perfis válidos: ${PERFIS_VALIDOS.join(', ')}` });
    }

    const membroAtualizado = await prisma.membroProjeto.update({
      where: {
        id_projeto_id_usuario: {
          id_projeto: id,
          id_usuario: idUsuario
        }
      },
      data: {
        perfil
      },
      include: {
        usuario: true
      }
    });

    return res.json(membroAtualizado);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao atualizar membro" });
  }
};