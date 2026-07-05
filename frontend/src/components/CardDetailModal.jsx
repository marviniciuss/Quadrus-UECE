import React, { useState, useEffect } from 'react';
import api from '../utils/api.js';
import { socket, joinPokerRoom, leavePokerRoom } from '../utils/socket.js';
import {
  Calendar,
  X,
  Plus,
  Send,
  Link,
  Trash2,
  AlertTriangle,
  RotateCcw,
  Edit,
  Check,
  Award
} from 'lucide-react';

// Helper para gerar iniciais de fallback para avatares
function AvatarWithFallback({ nome, foto, className = '', title }) {
  const initials = (nome || 'U').split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
  const seed = foto || nome;
  return (
    <img
      title={title || nome}
      src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(seed)}`}
      alt={nome}
      className={`${className} bg-white`}
      onError={(e) => {
        e.target.style.display = 'none';
        const fallback = document.createElement('div');
        fallback.className = `${className} bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold`;
        fallback.textContent = initials;
        e.target.parentNode.insertBefore(fallback, e.target);
      }}
    />
  );
}

const presetColors = {
  "#EF4444": { bg: "#FEE2E2", text: "#991B1B", border: "#FCA5A5" },
  "#F59E0B": { bg: "#FEF3C7", text: "#92400E", border: "#FCD34D" },
  "#10B981": { bg: "#D1FAE5", text: "#065F46", border: "#6EE7B7" },
  "#3B82F6": { bg: "#DBEAFE", text: "#1E40AF", border: "#93C5FD" },
  "#6366F1": { bg: "#E0E7FF", text: "#3730A3", border: "#A5B4FC" },
  "#8B5CF6": { bg: "#F3E8FF", text: "#5B21B6", border: "#C084FC" },
  "#EC4899": { bg: "#FCE7F3", text: "#9D174D", border: "#F9A8D4" },
  "#64748B": { bg: "#F1F5F9", text: "#334155", border: "#CBD5E1" },
  "#7C3AED": { bg: "#EDE9FE", text: "#5B21B6", border: "#C4B5FD" }
};

const getColors = (hex) => {
  return presetColors[hex] || { bg: "#F1F5F9", text: "#334155", border: "#CBD5E1" };
};

export default function CardDetailModal({ cardId, project, currentUserEmail, onClose, onUpdateProject, showToast }) {
  const [selectedCard, setSelectedCard] = useState(null);
  const [loadingCard, setLoadingCard] = useState(true);

  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [newDescriptionText, setNewDescriptionText] = useState('');
  const [newCommentText, setNewCommentText] = useState('');
  const [newAttachmentName, setNewAttachmentName] = useState('');
  const [newAttachmentUrl, setNewAttachmentUrl] = useState('');
  const [addingAttachment, setAddingAttachment] = useState(false);
  const [pokerSelectedCard, setPokerSelectedCard] = useState(null);
  const [pokerDuration, setPokerDuration] = useState('1'); // Duração padrão em horas (1h)
  const [timeLeft, setTimeLeft] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionComment, setRejectionComment] = useState('');
  const [showRiscoInput, setShowRiscoInput] = useState(false);
  const [riscoJustificativa, setRiscoJustificativa] = useState('');

  // --- Helpers de Parse e Serialização (Markdown + Metadata) ---
  const parseCardDesc = (desc) => {
    let rawText = desc || '';
    let poker = { active: false, expiresAt: null };
    let comments = [];

    // 1. Extrair poker metadata se houver
    const pokerRegex = /<!-- POKER_METADATA:\s*({.*?})\s*-->/;
    const pokerMatch = rawText.match(pokerRegex);
    if (pokerMatch) {
      try {
        poker = JSON.parse(pokerMatch[1]);
      } catch (e) {
        console.error("Erro ao parsear poker metadata", e);
      }
      rawText = rawText.replace(pokerRegex, '').trim();
    }

    // 2. Extrair comentários se houver
    const commentsRegex = /<!-- DISCUSSION:\s*(\[.*?\])\s*-->/;
    const commentsMatch = rawText.match(commentsRegex);
    if (commentsMatch) {
      try {
        comments = JSON.parse(commentsMatch[1]);
      } catch (e) {
        console.error("Erro ao parsear comentários", e);
      }
      rawText = rawText.replace(commentsRegex, '').trim();
    }

    // 3. Separar Descrição de Cenários de Teste (Checklist)
    let descriptionText = rawText;
    let checklistText = '';
    const separatorRegex = /(###?\s*CENÁRIOS DE TESTE|CENÁRIOS DE TESTE)/i;
    const separatorMatch = rawText.match(separatorRegex);

    if (separatorMatch) {
      const idx = separatorMatch.index;
      descriptionText = rawText.substring(0, idx).trim();
      checklistText = rawText.substring(idx).trim();
    }

    // 4. Parsear itens do checklist a partir do checklistText
    const checklistItems = [];
    if (checklistText) {
      const lines = checklistText.split('\n');
      lines.forEach((line, index) => {
        const match = line.match(/^(\s*[-*])\s+\[([ xX])\]\s+(.+)$/);
        if (match) {
          checklistItems.push({
            lineIndex: index,
            checked: match[2].toLowerCase() === 'x',
            text: match[3],
            prefix: match[1]
          });
        }
      });
    }

    return {
      descriptionText,
      checklistText,
      checklistItems,
      poker,
      comments
    };
  };

  const serializeCardDesc = (descriptionText, checklistText, poker, comments) => {
    let output = descriptionText || '';
    if (checklistText && checklistText.trim()) {
      output = output.trim() + '\n\n' + checklistText.trim();
    }
    if (poker) {
      output = output.trim() + `\n\n<!-- POKER_METADATA: ${JSON.stringify(poker)} -->`;
    }
    if (comments && comments.length > 0) {
      output = output.trim() + `\n\n<!-- DISCUSSION: ${JSON.stringify(comments)} -->`;
    }
    return output.trim();
  };

  const reloadCardDetail = async (id) => {
    try {
      const res = await api.get(`/api/cards/${id}`);
      setSelectedCard(res.data);
      setNewDescriptionText(parseCardDesc(res.data.descricao).descriptionText);
      setTempTitle(res.data.titulo);

      const updatedProject = {
        ...project,
        cards: (project.cards || []).map(c => c.id_card === id ? res.data : c)
      };
      onUpdateProject(updatedProject);
    } catch (err) {
      console.error("Erro ao carregar card no subcomponente:", err);
    }
  };

  useEffect(() => {
    if (cardId) {
      setLoadingCard(true);
      setPokerSelectedCard(null);
      reloadCardDetail(cardId).finally(() => setLoadingCard(false));
    }
  }, [cardId]);

  // Countdown timer para votação ativa
  useEffect(() => {
    if (!selectedCard) {
      setTimeLeft('');
      return;
    }
    const parsed = parseCardDesc(selectedCard.descricao);
    if (!parsed.poker?.active || !parsed.poker?.expiresAt) {
      setTimeLeft('');
      return;
    }

    let expiredTriggered = false;

    const updateTimer = () => {
      const expires = new Date(parsed.poker.expiresAt).getTime();
      const now = Date.now();
      const diff = expires - now;

      if (diff <= 0) {
        setTimeLeft('Expirado');
        if (!expiredTriggered) {
          expiredTriggered = true;
          reloadCardDetail(selectedCard.id_card);
        }
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [selectedCard]);

  // Real-time socket updates for Planning Poker
  useEffect(() => {
    if (!selectedCard?.id_card) return;

    const idCard = selectedCard.id_card;
    joinPokerRoom(idCard);

    const handlePokerUpdate = () => {
      console.log("Recebida atualização de Planning Poker para o card:", idCard);
      reloadCardDetail(idCard);
    };

    socket.on('poker_session_update', handlePokerUpdate);

    return () => {
      leavePokerRoom(idCard);
      socket.off('poker_session_update', handlePokerUpdate);
    };
  }, [selectedCard?.id_card]);

  // Sync modal state with Kanban Board updates
  useEffect(() => {
    if (project?.cards && selectedCard) {
      const updated = project.cards.find(c => c.id_card === selectedCard.id_card);
      if (updated && JSON.stringify(updated) !== JSON.stringify(selectedCard)) {
        setSelectedCard(updated);
        setNewDescriptionText(parseCardDesc(updated.descricao).descriptionText);
        setTempTitle(updated.titulo);
      }
    }
  }, [project?.cards, selectedCard?.id_card]);

  // --- Manipuladores ---
  const handleSaveDescription = async () => {
    if (!selectedCard) return;
    try {
      const parsed = parseCardDesc(selectedCard.descricao);
      const updatedDesc = serializeCardDesc(newDescriptionText, parsed.checklistText, parsed.poker, parsed.comments);
      const res = await api.patch(`/api/cards/${selectedCard.id_card}`, { descricao: updatedDesc });
      setSelectedCard(res.data);
      setIsEditingDescription(false);
      await reloadCardDetail(selectedCard.id_card);
      showToast("Descrição atualizada com sucesso.", "success");
    } catch (err) {
      console.error("Erro ao salvar descrição:", err);
      showToast("Erro ao salvar descrição.", "error");
    }
  };

  const handleToggleChecklistItem = async (itemIndex) => {
    if (!selectedCard) return;
    try {
      const parsed = parseCardDesc(selectedCard.descricao);
      let lines = parsed.checklistText.split('\n');

      let matchedCount = -1;
      for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(/^(\s*[-*])\s+\[([ xX])\]\s+(.+)$/);
        if (match) {
          matchedCount++;
          if (matchedCount === itemIndex) {
            const newCheckedState = match[2].toLowerCase() === 'x' ? ' ' : 'x';
            lines[i] = `${match[1]} [${newCheckedState}] ${match[3]}`;
            break;
          }
        }
      }

      const updatedChecklistText = lines.join('\n');
      const updatedDesc = serializeCardDesc(parsed.descriptionText, updatedChecklistText, parsed.poker, parsed.comments);
      const res = await api.patch(`/api/cards/${selectedCard.id_card}`, { descricao: updatedDesc });
      setSelectedCard(res.data);
      await reloadCardDetail(selectedCard.id_card);
    } catch (err) {
      console.error("Erro ao alternar cenário:", err);
      showToast("Erro ao atualizar cenário de teste.", "error");
    }
  };

  const handleCreateChecklistItem = async () => {
    if (!selectedCard || !newScenarioText.trim()) return;
    setAddingScenario(true);
    try {
      const parsed = parseCardDesc(selectedCard.descricao);
      let checklistText = parsed.checklistText || '';
      if (!checklistText.trim()) {
        checklistText = `### CENÁRIOS DE TESTE\n- [ ] ${newScenarioText.trim()}`;
      } else {
        checklistText = checklistText.trim() + `\n- [ ] ${newScenarioText.trim()}`;
      }

      const updatedDesc = serializeCardDesc(parsed.descriptionText, checklistText, parsed.poker, parsed.comments);
      const res = await api.patch(`/api/cards/${selectedCard.id_card}`, { descricao: updatedDesc });
      setSelectedCard(res.data);
      setNewScenarioText('');
      setAddingScenario(false);
      await reloadCardDetail(selectedCard.id_card);
      showToast("Cenário de teste adicionado.", "success");
    } catch (err) {
      console.error("Erro ao adicionar cenário:", err);
      showToast("Erro ao adicionar cenário de teste.", "error");
      setAddingScenario(false);
    }
  };

  const handlePostComment = async () => {
    if (!selectedCard || !newCommentText.trim()) return;
    try {
      const parsed = parseCardDesc(selectedCard.descricao);
      const meuMembro = project.membros?.find(m => m.usuario?.email === currentUserEmail);
      const autorNome = meuMembro?.usuario?.nome || currentUserEmail.split('@')[0];
      const autorFoto = meuMembro?.usuario?.foto || null;

      const newComment = {
        id_comentario: Date.now().toString(),
        autor: autorNome,
        foto: autorFoto,
        texto: newCommentText.trim(),
        createdAt: new Date().toISOString()
      };

      const updatedComments = [...parsed.comments, newComment];
      const updatedDesc = serializeCardDesc(parsed.descriptionText, parsed.checklistText, parsed.poker, updatedComments);
      const res = await api.patch(`/api/cards/${selectedCard.id_card}`, { descricao: updatedDesc });
      setSelectedCard(res.data);
      setNewCommentText('');
      await reloadCardDetail(selectedCard.id_card);
      showToast("Comentário postado.", "success");
    } catch (err) {
      console.error("Erro ao postar comentário:", err);
      showToast("Erro ao postar comentário.", "error");
    }
  };

  const handleStartPoker = async (hours) => {
    if (!selectedCard) return;
    try {
      const parsed = parseCardDesc(selectedCard.descricao);
      const expiresAt = new Date(Date.now() + parseFloat(hours) * 60 * 60 * 1000).toISOString();
      const updatedPoker = { active: true, expiresAt };

      await api.delete(`/api/cards/${selectedCard.id_card}/votos`);

      const updatedDesc = serializeCardDesc(parsed.descriptionText, parsed.checklistText, updatedPoker, parsed.comments);
      const res = await api.patch(`/api/cards/${selectedCard.id_card}`, { descricao: updatedDesc });

      setSelectedCard(res.data);
      setPokerSelectedCard(null);
      await reloadCardDetail(selectedCard.id_card);
      showToast("Votação do Planning Poker iniciada!", "success");
    } catch (err) {
      console.error("Erro ao iniciar poker:", err);
      showToast("Erro ao iniciar Planning Poker.", "error");
    }
  };

  const handleVote = async (value) => {
    if (!selectedCard) return;
    try {
      const meuVoto = selectedCard.votos?.find(v => v.usuario?.email === currentUserEmail);
      if (meuVoto) {
        await api.patch(`/api/votos/${meuVoto.id_voto}`, { valor: value });
      } else {
        await api.post(`/api/cards/${selectedCard.id_card}/votos`, { valor: value });
      }
      await reloadCardDetail(selectedCard.id_card);
      showToast("Voto registrado com sucesso!", "success");
    } catch (err) {
      console.error("Erro ao votar:", err);
      showToast(err.response?.data?.error || "Erro ao registrar voto.", "error");
    }
  };

  const handleCancelVote = async () => {
    if (!selectedCard) return;
    try {
      const meuVoto = selectedCard.votos?.find(v => v.usuario?.email === currentUserEmail);
      if (meuVoto) {
        await api.delete(`/api/votos/${meuVoto.id_voto}`);
        await reloadCardDetail(selectedCard.id_card);
        showToast("Voto cancelado.", "info");
      }
    } catch (err) {
      console.error("Erro ao cancelar voto:", err);
      showToast("Erro ao cancelar voto.", "error");
    }
  };

  const handleDecidePoints = async (points) => {
    if (!selectedCard) return;
    try {
      const parsed = parseCardDesc(selectedCard.descricao);
      const updatedPoker = { active: false, expiresAt: null };
      const updatedDesc = serializeCardDesc(parsed.descriptionText, parsed.checklistText, updatedPoker, parsed.comments);
      const pts = points === '?' ? null : parseInt(points);

      await api.patch(`/api/cards/${selectedCard.id_card}`, {
        story_points: pts,
        descricao: updatedDesc
      });
      await reloadCardDetail(selectedCard.id_card);
      showToast("Pontuação decidida com sucesso!", "success");
    } catch (err) {
      console.error("Erro ao decidir pontuação:", err);
      showToast("Erro ao definir pontuação do card.", "error");
    }
  };

  const handleResetPoker = async () => {
    if (!selectedCard) return;
    try {
      const parsed = parseCardDesc(selectedCard.descricao);
      const updatedPoker = { active: false, expiresAt: null };

      await api.delete(`/api/cards/${selectedCard.id_card}/votos`);

      const updatedDesc = serializeCardDesc(parsed.descriptionText, parsed.checklistText, updatedPoker, parsed.comments);
      await api.patch(`/api/cards/${selectedCard.id_card}`, { descricao: updatedDesc });

      await reloadCardDetail(selectedCard.id_card);
      showToast("Sessão de votação reiniciada.", "info");
    } catch (err) {
      console.error("Erro ao reiniciar poker:", err);
      showToast("Erro ao reiniciar votação.", "error");
    }
  };

  const handleAprovarCard = async () => {
    if (!selectedCard) return;
    try {
      const res = await api.patch(`/api/cards/${selectedCard.id_card}/aprovar`);
      setSelectedCard(res.data);
      await reloadCardDetail(selectedCard.id_card);
      showToast("Card aprovado e movido para Concluído com sucesso!", "success");
    } catch (err) {
      console.error("Erro ao aprovar card:", err);
      showToast(err.response?.data?.error || "Erro ao aprovar card.", "error");
    }
  };

  const handleReprovarCard = async () => {
    if (!selectedCard) return;
    if (!rejectionComment.trim()) {
      showToast("Por favor, informe os passos para reprodução.", "warning");
      return;
    }
    try {
      const res = await api.patch(`/api/cards/${selectedCard.id_card}/reprovar`, {
        comentario: rejectionComment.trim()
      });
      setSelectedCard(res.data);
      setRejectionComment('');
      setIsRejecting(false);
      await reloadCardDetail(selectedCard.id_card);
      showToast("Card reprovado e movido para Em Andamento.", "success");
    } catch (err) {
      console.error("Erro ao reprovar card:", err);
      showToast(err.response?.data?.error || "Erro ao reprovar card.", "error");
    }
  };

  const handleEnviarParaTestes = async () => {
    if (!selectedCard || !project.colunas) return;
    const colHomologacao = project.colunas.find(c => c.nome === "HOMOLOGAÇÃO");
    if (!colHomologacao) {
      showToast("Coluna de Homologação não encontrada.", "error");
      return;
    }
    try {
      const res = await api.patch(`/api/cards/${selectedCard.id_card}/status`, {
        status: "HOMOLOGACAO",
        id_coluna: colHomologacao.id_coluna
      });
      setSelectedCard(res.data);
      await reloadCardDetail(selectedCard.id_card);
      showToast("Card enviado para homologação!", "success");
    } catch (err) {
      console.error("Erro ao enviar card para testes:", err);
      showToast(err.response?.data?.error || "Erro ao enviar card para testes.", "error");
    }
  };

  const handleAddAttachment = async () => {
    if (!selectedCard || !newAttachmentName.trim() || !newAttachmentUrl.trim()) return;
    setAddingAttachment(true);
    try {
      let url = newAttachmentUrl.trim();
      if (!/^https?:\/\//i.test(url)) {
        url = 'https://' + url;
      }
      await api.post(`/api/cards/${selectedCard.id_card}/anexos`, {
        nome_arquivo: newAttachmentName.trim(),
        url_arquivo: url,
        tipo_anexo: 'LINK_EXTERNO'
      });
      setNewAttachmentName('');
      setNewAttachmentUrl('');
      await reloadCardDetail(selectedCard.id_card);
      showToast("Link adicionado aos anexos.", "success");
    } catch (err) {
      console.error("Erro ao adicionar anexo:", err);
      showToast("Erro ao adicionar link.", "error");
    } finally {
      setAddingAttachment(false);
    }
  };

  const handleDeleteAttachment = async (anexoId) => {
    try {
      await api.delete(`/api/anexos/${anexoId}`);
      setSelectedCard(prev => ({
        ...prev,
        anexos: (prev.anexos || []).filter(a => a.id_anexo !== anexoId)
      }));
      showToast("Anexo removido.", "success");
    } catch (err) {
      console.error("Erro ao deletar anexo:", err);
      showToast("Erro ao remover anexo.", "error");
    }
  };

  const handleDeleteCard = async () => {
    if (!selectedCard) return;
    if (!window.confirm("Tem certeza que deseja excluir esta atividade definitivamente?")) return;

    try {
      await api.delete(`/api/cards/${selectedCard.id_card}`);
      showToast("Atividade excluída com sucesso.", "success");
      onClose();
      // Atualizar o projeto para remover o card da lista
      const updatedProject = {
        ...project,
        cards: (project.cards || []).filter(c => c.id_card !== selectedCard.id_card)
      };
      onUpdateProject(updatedProject);
    } catch (err) {
      console.error("Erro ao excluir card:", err);
      showToast("Erro ao excluir atividade.", "error");
    }
  };

  const handleUpdateCardField = async (fieldName, value) => {
    if (!selectedCard) return;
    try {
      const res = await api.patch(`/api/cards/${selectedCard.id_card}`, {
        [fieldName]: value
      });
      setSelectedCard(res.data);
      await reloadCardDetail(selectedCard.id_card);
    } catch (err) {
      console.error(`Erro ao atualizar campo ${fieldName}:`, err);
      showToast("Erro ao atualizar o card.", "error");
    }
  };

  const handleToggleRisco = async () => {
    if (!selectedCard) return;

    try {
      const isActivating = !selectedCard.em_risco;

      let updatedDesc = selectedCard.descricao;
      if (isActivating) {
        if (!riscoJustificativa.trim()) {
          showToast("A justificativa é obrigatória.", "error");
          return;
        }
        const parsed = parseCardDesc(selectedCard.descricao);
        const meuMembro = project.membros?.find(m => m.usuario?.email === currentUserEmail);
        const autorNome = meuMembro?.usuario?.nome || currentUserEmail.split('@')[0];
        const autorFoto = meuMembro?.usuario?.foto || null;

        const newComment = {
          id_comentario: Date.now().toString(),
          autor: autorNome,
          foto: autorFoto,
          texto: `⚠️ *SINALIZOU ATRASO:* ${riscoJustificativa.trim()}`,
          createdAt: new Date().toISOString()
        };
        const updatedComments = [...parsed.comments, newComment];
        updatedDesc = serializeCardDesc(parsed.descriptionText, parsed.checklistText, parsed.poker, updatedComments);
      }

      const res = await api.patch(`/api/cards/${selectedCard.id_card}/risco`, {
        em_risco: isActivating,
        nova_descricao: updatedDesc
      });

      setSelectedCard(res.data);
      setShowRiscoInput(false);
      setRiscoJustificativa('');
      await reloadCardDetail(selectedCard.id_card);
      showToast(isActivating ? "Risco de atraso sinalizado com sucesso!" : "Sinal de atraso removido.", "success");
    } catch (err) {
      console.error("Erro ao atualizar status de risco:", err);
      showToast(err.response?.data?.error || "Erro ao atualizar status de risco.", "error");
    }
  };

  const handleToggleCardEtiqueta = async (idEtiqueta) => {
    if (!selectedCard) return;
    const currentEtIds = selectedCard.etiquetas?.map(et => et.id_etiqueta) || [];
    let updatedList;
    if (currentEtIds.includes(idEtiqueta)) {
      updatedList = currentEtIds.filter(id => id !== idEtiqueta);
    } else {
      updatedList = [...currentEtIds, idEtiqueta];
    }
    await handleUpdateCardField('id_etiquetas', updatedList);
  };

  if (loadingCard || !selectedCard) {
    return (
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl p-8 text-center flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-650 rounded-full animate-spin mb-4" />
          <p className="text-sm font-bold text-slate-500">Carregando detalhes do card...</p>
        </div>
      </div>
    );
  }

  const parsed = parseCardDesc(selectedCard.descricao);
  const isPokerActive = parsed.poker?.active && parsed.poker?.expiresAt && new Date(parsed.poker.expiresAt) > new Date();
  const isPokerExpired = parsed.poker?.active && parsed.poker?.expiresAt && new Date(parsed.poker.expiresAt) <= new Date();

  const voteCounts = {};
  selectedCard.votos?.forEach(v => {
    voteCounts[v.valor] = (voteCounts[v.valor] || 0) + 1;
  });
  const totalVotes = selectedCard.votos?.length || 0;
  const meuVoto = selectedCard.votos?.find(v => v.usuario?.email === currentUserEmail);

  const meuMembro = project.membros?.find(m => m.usuario?.email === currentUserEmail);
  const isDev = meuMembro?.perfil === 'DEV';
  const isPO = meuMembro?.perfil === 'PO';
  const isGerente = meuMembro?.perfil === 'GERENTE' || meuMembro?.perfil === 'ADMIN';
  const isTester = meuMembro?.perfil === 'TESTER';
  const isAuthorizedToHomologate = isTester || isGerente;

  const dbComments = (selectedCard.comentarios || []).map(c => ({
    id_comentario: c.id_comentario,
    autor: c.usuario?.nome || 'Usuário',
    foto: c.usuario?.foto || null,
    texto: c.conteudo,
    createdAt: c.createdAt
  }));

  const allComments = [...parsed.comments, ...dbComments].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const canManagePoker = isPO || isGerente;
  const canEditOrDelete = isGerente || isPO || !selectedCard.id_criador || selectedCard.id_criador === meuMembro?.id_usuario;
  const canSignalRisco = isGerente || isPO || selectedCard.id_responsavel === meuMembro?.id_usuario;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in text-slate-700">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-5xl shadow-2xl relative overflow-hidden text-left flex flex-col max-h-[90vh] animate-scale-up">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-brand-50 border border-brand-100 text-brand-700 rounded-md">
              {selectedCard.status}
            </span>
            {selectedCard.sprint && (
              <span className="text-xs text-slate-400 font-bold flex items-center gap-1">
                <Calendar size={12} />
                {selectedCard.sprint.nome}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {canEditOrDelete && (
              <button
                onClick={handleDeleteCard}
                className="p-1.5 text-rose-500 hover:text-rose-750 hover:bg-rose-50 rounded-lg transition-colors"
                title="Excluir Atividade"
              >
                <Trash2 size={18} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 flex flex-col md:flex-row gap-8">

          {/* Coluna Esquerda: Descrição, Cenários, Discussão */}
          <div className="flex-1 space-y-8 min-w-0 pb-8">

            {/* Título (Editável inline) */}
            <div className="space-y-1.5">
              {editingTitle ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={tempTitle}
                    onChange={(e) => setTempTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleUpdateCardField('titulo', tempTitle);
                        setEditingTitle(false);
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 text-lg font-extrabold text-slate-800 focus:outline-none focus:border-brand-500"
                  />
                  <button
                    onClick={() => {
                      handleUpdateCardField('titulo', tempTitle);
                      setEditingTitle(false);
                    }}
                    className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"
                  >
                    <Check size={16} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3 group">
                  <h2 className="text-xl font-extrabold text-slate-800 leading-snug">
                    {selectedCard.titulo}
                  </h2>
                  {canEditOrDelete && (
                    <button
                      onClick={() => { setTempTitle(selectedCard.titulo); setEditingTitle(true); }}
                      className="p-1 text-slate-400 hover:text-brand-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Edit size={14} />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Descrição */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Descrição</h3>
                {!isEditingDescription && canEditOrDelete && (
                  <button
                    onClick={() => { setNewDescriptionText(parsed.descriptionText); setIsEditingDescription(true); }}
                    className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
                  >
                    <Edit size={12} />
                    Editar
                  </button>
                )}
              </div>
              {isEditingDescription ? (
                <div className="space-y-3">
                  <textarea
                    rows={4}
                    value={newDescriptionText}
                    onChange={(e) => setNewDescriptionText(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:border-brand-500 text-slate-700"
                    placeholder="Escreva a descrição do quadro..."
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setIsEditingDescription(false)}
                      className="px-3 py-1.5 border border-slate-250 hover:bg-slate-50 text-slate-550 rounded-lg text-xs font-semibold"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSaveDescription}
                      className="px-3 py-1.5 bg-[#320066] hover:bg-[#26004d] text-white rounded-lg text-xs font-bold"
                    >
                      Salvar
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-650 leading-relaxed whitespace-pre-wrap">
                  {parsed.descriptionText || <span className="text-slate-400 italic">Nenhuma descrição informada.</span>}
                </p>
              )}
            </div>



            {/* Discussão */}
            <div className="space-y-4">
              <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">
                Discussão
              </h3>

              {/* Lista de Comentários */}
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                {allComments.map((comment) => (
                  <div key={comment.id_comentario} className="flex gap-3 text-left">
                    <AvatarWithFallback
                      nome={comment.autor}
                      foto={comment.foto}
                      className="w-8 h-8 rounded-full border border-slate-255 bg-slate-100 shrink-0"
                    />
                    <div className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl p-3 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-extrabold text-slate-800">{comment.autor}</span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(comment.createdAt).toLocaleDateString()} às {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-slate-650 whitespace-pre-wrap">{comment.texto}</p>
                    </div>
                  </div>
                ))}
                {allComments.length === 0 && (
                  <p className="text-xs text-slate-450 italic text-center py-4">Nenhum comentário postado ainda. Seja o primeiro!</p>
                )}
              </div>

              {/* Caixa de Texto de Comentário */}
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <textarea
                    rows={2}
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    placeholder="Escreva um comentário... use @ para mencionar alguém"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:border-brand-500 text-slate-700"
                  />
                  <div className="flex justify-end mt-1.5">
                    <button
                      onClick={handlePostComment}
                      className="px-4 py-2 bg-[#320066] hover:bg-[#26004d] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all shadow-sm shadow-brand-500/10"
                    >
                      <Send size={12} />
                      Postar
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Coluna Direita: Atributos, Planning Poker, Anexos */}
          <div className="w-full md:w-[320px] shrink-0 space-y-6 pb-8">

            {/* Planning Poker */}
            <div className="bg-slate-50 border border-slate-150 rounded-2xl p-5 space-y-4">

              {/* HEADER PLANNING POKER */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase bg-brand-100 text-brand-850 px-2 py-0.5 rounded">
                  Poker Planning
                </span>
                {isPokerActive && (
                  <span className="text-[10px] font-bold text-slate-500 font-mono">
                    {totalVotes} {totalVotes === 1 ? 'voto' : 'votos'}
                  </span>
                )}
              </div>

              {/* STATE 1: NOT STARTED */}
              {!isPokerActive && !isPokerExpired && selectedCard.story_points === null && (
                <div className="space-y-3 text-center">
                  <p className="text-xs text-slate-500">Nenhuma votação de Planning Poker está ativa para este card.</p>
                  {canManagePoker ? (
                    <div className="pt-2 space-y-3">
                      <div className="space-y-1 text-left">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase">Duração máxima</label>
                        <select
                          value={pokerDuration}
                          onChange={(e) => setPokerDuration(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-brand-500 text-slate-700 font-bold"
                        >
                          <option value="0.08">5 minutos</option>
                          <option value="0.25">15 minutos</option>
                          <option value="1">1 hora</option>
                          <option value="4">4 horas</option>
                          <option value="8">8 horas</option>
                          <option value="24">24 horas</option>
                        </select>
                      </div>
                      <button
                        onClick={() => handleStartPoker(pokerDuration)}
                        className="w-full py-2.5 bg-[#320066] hover:bg-[#26004d] text-white rounded-xl text-xs font-bold transition-all active:scale-95 shadow-md shadow-brand-500/10"
                      >
                        Iniciar Votação
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">Aguarde o PO ou o Gerente iniciar a votação.</p>
                  )}
                </div>
              )}

              {/* STATE 2 & 3: ACTIVE OR EXPIRED */}
              {(isPokerActive || isPokerExpired) && (
                <div className="space-y-4">
                  {/* Countdown / Status */}
                  {isPokerActive ? (
                    <div className="text-center p-2.5 bg-brand-50 border border-brand-100 rounded-xl">
                      <p className="text-[10px] font-bold text-brand-600 uppercase">Tempo Restante</p>
                      <p className="text-lg font-extrabold text-brand-700 font-mono mt-0.5">{timeLeft}</p>
                    </div>
                  ) : (
                    <div className="text-center p-2.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs font-bold">
                      Tempo esgotado! Aguardando definição da pontuação.
                    </div>
                  )}

                  {/* Deck de Cartas */}
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 5, 8, 13, 21, '?'].map((val) => {
                      const dbVal = val === '?' ? -1 : val;
                      const voteCountOnCard = voteCounts[dbVal] || 0;

                      // Determina se este card está selecionado pelo usuário ativo
                      const isSelected = pokerSelectedCard === val;
                      const userVotedThis = isPokerActive && meuVoto && meuVoto.valor === dbVal;

                      // Highlight final selection for PO/Gerente during expiration
                      const isDecidedSelection = isPokerExpired && isSelected;

                      // Classes de estilo
                      let cardClass = "";
                      if (userVotedThis || isDecidedSelection) {
                        cardClass = "border-[#320066] bg-[#320066] text-white shadow-md";
                      } else if (voteCountOnCard > 0) {
                        cardClass = "border-[#b8a2cf] bg-[#b8a2cf] text-white";
                      } else if (isSelected) {
                        cardClass = "border-[#320066] bg-purple-50 text-[#320066] scale-105 shadow-sm";
                      } else {
                        cardClass = "border-slate-200 bg-slate-100 text-slate-500 hover:bg-slate-150";
                      }

                      // Interatividade:
                      // - Se ativo: apenas DEV pode votar.
                      // - Se expirado: apenas PO/Gerente pode selecionar pontuação.
                      const canClick = isPokerActive ? isDev : (isPokerExpired && canManagePoker);

                      return (
                        <button
                          key={val}
                          type="button"
                          onClick={() => canClick && setPokerSelectedCard(val)}
                          className={`h-24 border rounded-2xl flex flex-col items-center justify-center p-2 relative transition-all ${cardClass}`}
                          disabled={!canClick}
                        >
                          <span className="font-extrabold text-2xl">{val}</span>
                          {voteCountOnCard > 0 && (
                            <span className="text-[10px] font-medium mt-1">
                              {voteCountOnCard} {voteCountOnCard === 1 ? 'voto' : 'votos'}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Botoes de Acao de Voto (Apenas durante Votação Ativa e para DEV) */}
                  {isPokerActive && isDev && (
                    <div className="pt-2 text-center">
                      {meuVoto && !pokerSelectedCard ? (
                        <div className="space-y-2">
                          <button
                            type="button"
                            className="w-full py-2.5 bg-[#320066] text-white rounded-xl text-xs font-bold opacity-90 cursor-default"
                          >
                            Voto Enviado
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelVote}
                            className="text-xs font-bold text-rose-600 hover:text-rose-700"
                          >
                            Cancelar Voto
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleVote(pokerSelectedCard === '?' ? -1 : pokerSelectedCard)}
                          disabled={pokerSelectedCard === null}
                          className="w-full py-2.5 bg-[#320066] hover:bg-[#26004d] text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {meuVoto ? 'Alterar Voto' : 'Votar'}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Botoes de Encerramento (Apenas para PO/Gerente durante Votação Ativa) */}
                  {isPokerActive && canManagePoker && (
                    <div className="pt-2 border-t border-slate-200">
                      <button
                        onClick={() => handleDecidePoints('?')}
                        className="w-full py-2 border border-slate-300 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-semibold"
                      >
                        Encerrar Votação
                      </button>
                    </div>
                  )}

                  {/* Votos Detalhados (Exibidos apenas quando a votação está Expirada) */}
                  {isPokerExpired && (
                    <div className="space-y-2 text-left pt-2 border-t border-slate-200">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Votos Detalhados</h4>
                      <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden max-h-36 overflow-y-auto">
                        {selectedCard.votos?.map((v) => (
                          <div key={v.id_voto} className="p-2.5 flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-700">{v.usuario.nome}</span>
                            <span className="font-mono font-extrabold text-[#320066] bg-purple-50 px-1.5 py-0.5 rounded">
                              {v.valor === -1 ? '?' : v.valor}
                            </span>
                          </div>
                        ))}
                        {(!selectedCard.votos || selectedCard.votos.length === 0) && (
                          <p className="p-3 text-xs italic text-slate-400 text-center">Nenhum voto registrado.</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Botoes de Decisao Final (Apenas para PO/Gerente durante Expirado) */}
                  {isPokerExpired && (
                    canManagePoker ? (
                      <div className="space-y-2 pt-2">
                        <button
                          onClick={() => handleDecidePoints(pokerSelectedCard)}
                          disabled={pokerSelectedCard === null}
                          className="w-full py-2.5 bg-[#320066] hover:bg-[#26004d] text-white rounded-xl text-xs font-bold disabled:opacity-50"
                        >
                          Decidir Pontuação
                        </button>
                        <button
                          onClick={handleResetPoker}
                          className="w-full py-2 border border-slate-200 text-slate-500 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"
                        >
                          <RotateCcw size={12} />
                          Reiniciar Votação
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic text-center pt-2">
                        Aguardando o PO salvar a pontuação final.
                      </p>
                    )
                  )}
                </div>
              )}

              {/* STATE 4: DECIDED */}
              {!isPokerActive && !isPokerExpired && selectedCard.story_points !== null && (
                <div className="space-y-4 text-left">
                  <div className="space-y-2 flex flex-col items-start">
                    <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider font-semibold">Pontuação Decidida</h4>
                    <div className="w-24 h-32 bg-[#320066] hover:bg-[#26004d] text-white border border-[#320066] rounded-2xl flex items-center justify-center shadow-lg shadow-[#320066]/20 transition-all select-none">
                      <span className="font-extrabold text-4xl font-mono">{selectedCard.story_points}</span>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Botão Enviar para Testes (Dev → QA) */}
            {selectedCard.status !== "HOMOLOGACAO" && selectedCard.status !== "CONCLUIDO" && (
              <button
                type="button"
                onClick={handleEnviarParaTestes}
                className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-750 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-purple-600/10 transition-all active:scale-[0.98]"
              >
                <Send size={14} />
                Enviar para testes
              </button>
            )}

            {/* Seção Homologação */}
            {selectedCard.status === "HOMOLOGACAO" && (
              <div className="space-y-4 text-left p-3.5 bg-purple-50/50 border border-purple-100 rounded-2xl">
                <h4 className="text-[10px] font-extrabold text-purple-750 uppercase tracking-wider">Ações de Homologação</h4>

                {isAuthorizedToHomologate ? (
                  isRejecting ? (
                    <div className="space-y-3">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Passos para Reprodução (Motivo da Reprovação)
                      </label>
                      <textarea
                        rows={3}
                        value={rejectionComment}
                        onChange={(e) => setRejectionComment(e.target.value)}
                        placeholder="Informe os passos para reprodução..."
                        className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-none focus:border-purple-650 text-slate-700 font-medium"
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setIsRejecting(false);
                            setRejectionComment('');
                          }}
                          className="px-3 py-1.5 border border-slate-250 hover:bg-slate-50 text-slate-550 rounded-lg text-xs font-semibold"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={handleReprovarCard}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-750 text-white rounded-lg text-xs font-bold"
                        >
                          Confirmar Reprovação
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleAprovarCard}
                        className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-750 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/10 transition-all"
                      >
                        <Check size={14} />
                        Aprovar Card
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsRejecting(true)}
                        className="flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-750 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-rose-600/10 transition-all"
                      >
                        <X size={14} />
                        Reprovar Card
                      </button>
                    </div>
                  )
                ) : (
                  <p className="text-xs text-slate-500 italic">
                    Aguardando homologação de um Tester.
                  </p>
                )}
              </div>
            )}

            {/* Responsável */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Responsável</label>
              <select
                value={selectedCard.id_responsavel || ''}
                onChange={(e) => handleUpdateCardField('id_responsavel', e.target.value || null)}
                disabled={!canEditOrDelete}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs focus:outline-none focus:border-[#320066] text-slate-700 font-bold disabled:opacity-75 disabled:cursor-not-allowed"
              >
                <option value="">Ninguém atribuído</option>
                {project.membros?.map(m => (
                  <option key={m.usuario.id_usuario} value={m.usuario.id_usuario}>
                    {m.usuario.nome} ({m.perfil})
                  </option>
                ))}
              </select>
            </div>

            {/* Prioridade */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-semibold">Prioridade</label>
              <select
                value={selectedCard.prioridade}
                onChange={(e) => handleUpdateCardField('prioridade', e.target.value)}
                disabled={!canEditOrDelete}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs focus:outline-none focus:border-[#320066] text-slate-700 font-bold disabled:opacity-75 disabled:cursor-not-allowed"
              >
                <option value="BAIXA">BAIXA</option>
                <option value="MEDIA">MÉDIA</option>
                <option value="ALTA">ALTA</option>
              </select>
            </div>

            {/* Etiquetas */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Etiquetas</label>
              <div className="flex flex-wrap gap-1.5">
                {project.etiquetas?.map(et => {
                  const isSelected = selectedCard.etiquetas?.some(cardEt => cardEt.id_etiqueta === et.id_etiqueta);
                  return (
                    <button
                      key={et.id_etiqueta}
                      onClick={() => canEditOrDelete && handleToggleCardEtiqueta(et.id_etiqueta)}
                      className={`px-2.5 py-1.5 rounded-lg border font-bold text-[9px] transition-all ${isSelected
                        ? 'bg-[#320066] border-[#320066] text-white shadow-sm'
                        : 'bg-[#EAECEF] border-transparent text-[#475569] hover:bg-[#DEE2E6]'
                        } ${!canEditOrDelete ? 'opacity-75 cursor-not-allowed' : ''}`}
                    >
                      {et.nome}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Anexos (Apenas Links) */}
            <div className="space-y-3 bg-slate-50/50 border border-slate-100 rounded-2xl p-4.5 p-4 text-left">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Anexos</h4>

              {/* Lista de Anexos */}
              <div className="space-y-2">
                {selectedCard.anexos?.map((anexo) => (
                  <div
                    key={anexo.id_anexo}
                    className="flex items-center justify-between p-2.5 bg-white border border-slate-200/80 rounded-xl hover:border-slate-350 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Link size={14} className="text-slate-400 shrink-0" />
                      <a
                        href={anexo.url_arquivo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-[#320066] hover:text-purple-750 truncate"
                      >
                        {anexo.nome_arquivo}
                      </a>
                    </div>
                    {canEditOrDelete && (
                      <button
                        onClick={() => handleDeleteAttachment(anexo.id_anexo)}
                        className="text-slate-400 hover:text-rose-600 p-0.5 rounded"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                ))}
                {(!selectedCard.anexos || selectedCard.anexos.length === 0) && (
                  <p className="text-[11px] text-slate-400 italic">Nenhum anexo adicionado.</p>
                )}
              </div>

              {/* Form para Adicionar Anexo */}
              {canEditOrDelete && (
                addingAttachment ? (
                  <div className="space-y-2 mt-3 pt-3 border-t border-slate-200 text-left">
                    <div className="space-y-1">
                      <label className="block text-[9px] font-bold text-slate-400 uppercase">Nome do link</label>
                      <input
                        type="text"
                        value={newAttachmentName}
                        onChange={(e) => setNewAttachmentName(e.target.value)}
                        placeholder="Ex: Documento de Requisitos"
                        className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-2.5 text-xs focus:outline-none focus:border-[#320066] text-slate-700"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[9px] font-bold text-slate-400 uppercase">Endereço (URL)</label>
                      <input
                        type="text"
                        value={newAttachmentUrl}
                        onChange={(e) => setNewAttachmentUrl(e.target.value)}
                        placeholder="Ex: google.com"
                        className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-2.5 text-xs focus:outline-none focus:border-[#320066] text-slate-700"
                      />
                    </div>
                    <div className="flex gap-1.5 justify-end mt-1">
                      <button
                        onClick={() => { setAddingAttachment(false); setNewAttachmentName(''); setNewAttachmentUrl(''); }}
                        className="px-2.5 py-1 border border-slate-200 text-slate-500 rounded-lg text-[10px] font-semibold"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleAddAttachment}
                        className="px-3 py-1 bg-[#320066] hover:bg-[#26004d] text-white rounded-lg text-[10px] font-bold"
                      >
                        Salvar Link
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingAttachment(true)}
                    className="w-full mt-2 flex items-center justify-center gap-1.5 border border-dashed border-slate-200 hover:border-slate-350 hover:bg-white text-slate-500 text-[11px] py-2 rounded-xl font-bold transition-all"
                  >
                    <Plus size={12} />
                    Adicionar Item
                  </button>
                )
              )}
            </div>

            {/* Sinalizar Atraso */}
            <div className="space-y-2">
              {!showRiscoInput || selectedCard.em_risco ? (
                <button
                  onClick={() => {
                    if (selectedCard.em_risco) {
                      handleToggleRisco();
                    } else {
                      setShowRiscoInput(true);
                    }
                  }}
                  disabled={!canSignalRisco}
                  className={`w-full py-3 rounded-xl font-extrabold text-xs transition-all active:scale-[0.98] shadow-sm flex items-center justify-center gap-1.5 ${selectedCard.em_risco
                      ? 'bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100/50'
                      : 'bg-orange-600 hover:bg-orange-700 text-white shadow-orange-500/10'
                    } disabled:opacity-75 disabled:cursor-not-allowed`}
                >
                  <AlertTriangle size={14} />
                  {selectedCard.em_risco ? 'Remover Sinal de Atraso' : 'Sinalizar Atraso'}
                </button>
              ) : (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 space-y-2 animate-fade-in">
                  <label className="block text-[10px] font-bold text-orange-800 uppercase">
                    Justificativa de Atraso
                  </label>
                  <textarea
                    rows={2}
                    value={riscoJustificativa}
                    onChange={(e) => setRiscoJustificativa(e.target.value)}
                    placeholder="Descreva o motivo do bloqueio/atraso..."
                    className="w-full bg-white border border-orange-200 rounded-lg p-2 text-xs focus:outline-none focus:border-orange-500 text-slate-700"
                  />
                  <div className="flex gap-1.5 justify-end mt-1">
                    <button
                      onClick={() => { setShowRiscoInput(false); setRiscoJustificativa(''); }}
                      className="px-2.5 py-1.5 border border-orange-200 text-orange-700 hover:bg-orange-100 rounded-lg text-[10px] font-bold transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleToggleRisco}
                      className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-[10px] font-bold transition-colors shadow-sm"
                    >
                      Confirmar
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Espaçador para evitar que o conteúdo seja cortado ao rolar */}
            <div className="h-8" />

          </div>

        </div>

      </div>
    </div>
  );
}
