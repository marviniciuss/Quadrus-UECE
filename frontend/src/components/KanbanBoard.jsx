import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../utils/api.js';
import { socket, joinProjectRoom, leaveProjectRoom } from '../utils/socket.js';
import {
  FolderKanban,
  Calendar,
  TrendingUp,
  Settings,
  Plus,
  Search,
  Filter,
  MessageSquare,
  Paperclip,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  X,
  UserPlus,
  Sparkles,
  Menu,
  Trash2,
  Archive,
  Loader2,
  ChevronsRight
} from 'lucide-react';

// Componente de Toast para notificações inline
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const styles = {
    success: 'bg-emerald-50 border-emerald-300 text-emerald-800',
    error: 'bg-rose-50 border-rose-300 text-rose-800',
    info: 'bg-blue-50 border-blue-300 text-blue-800',
  };

  return (
    <div className={`fixed top-6 right-6 z-[100] px-5 py-3 rounded-xl border shadow-lg text-sm font-semibold animate-scale-up flex items-center gap-2 ${styles[type] || styles.info}`}>
      {type === 'success' && <CheckCircle2 size={16} />}
      {type === 'error' && <AlertTriangle size={16} />}
      <span>{message}</span>
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100 transition-opacity"><X size={14} /></button>
    </div>
  );
}

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

export default function KanbanBoard({ project, onUpdateProject, userDisplayName, currentUserEmail, onProjectAction }) {
  // Ref para acessar o projeto atualizado dentro de callbacks de socket
  const projectRef = useRef(project);
  useEffect(() => {
    projectRef.current = project;
  }, [project]);

  // Socket.io: entrar na sala do projeto e escutar eventos de movimentação
  useEffect(() => {
    joinProjectRoom(project.id_projeto);

    const handleCardMoved = (updatedCard) => {
      const currentProject = projectRef.current;
      if (updatedCard.id_projeto !== currentProject.id_projeto) return;

      const currentCards = currentProject.cards || [];
      const exists = currentCards.some(c => c.id_card === updatedCard.id_card);
      const updatedCards = exists
        ? currentCards.map(c => c.id_card === updatedCard.id_card ? updatedCard : c)
        : [...currentCards, updatedCard];

      onUpdateProject({
        ...currentProject,
        cards: updatedCards,
      });
    };

    const handleUsuarioAtualizado = (data) => {
      const currentProject = projectRef.current;
      if (!currentProject) return;

      // Update members list
      const updatedMembros = (currentProject.membros || []).map(m => {
        const uId = m.usuario?.id_usuario || m.id_usuario;
        if (uId === data.id_usuario) {
          if (m.usuario) {
            return {
              ...m,
              usuario: {
                ...m.usuario,
                nome: data.nome,
                foto: data.foto
              }
            };
          } else {
            return {
              ...m,
              nome: data.nome,
              foto: data.foto
            };
          }
        }
        return m;
      });

      // Update cards responsavel
      const updatedCards = (currentProject.cards || []).map(c => {
        if (c.responsavel?.id_usuario === data.id_usuario) {
          return {
            ...c,
            responsavel: {
              ...c.responsavel,
              nome: data.nome,
              foto: data.foto
            }
          };
        }
        return c;
      });

      onUpdateProject({
        ...currentProject,
        membros: updatedMembros,
        cards: updatedCards
      });
    };

    socket.on('card_moved', handleCardMoved);
    socket.on('usuario_atualizado', handleUsuarioAtualizado);

    return () => {
      leaveProjectRoom(project.id_projeto);
      socket.off('card_moved', handleCardMoved);
      socket.off('usuario_atualizado', handleUsuarioAtualizado);
    };
  }, [project.id_projeto, onUpdateProject]);

  // Estado para controlar a aba ativa no Menu Lateral
  const [activeTab, setActiveTab] = useState('board'); // 'board', 'sprint', 'metrics', 'settings'

  // Controle do menu lateral em telas menores
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Estados de Busca e Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState(''); // Filtro por tag (BACKEND, FRONTEND, etc.)

  // Controle de Modais
  const [isNewCardModalOpen, setIsNewCardModalOpen] = useState(false);

  // Formulário para Nova Atividade
  const [newCardTitle, setNewCardTitle] = useState('');
  const [newCardPriority, setNewCardPriority] = useState('MEDIA');
  const [newCardTags, setNewCardTags] = useState([]);
  const [newCardMember, setNewCardMember] = useState('');
  const [creatingCard, setCreatingCard] = useState(false);

  // Real Sprints State
  const [sprints, setSprints] = useState([]);
  const [sprintsLoading, setSprintsLoading] = useState(false);
  const [selectedSprintId, setSelectedSprintId] = useState('backlog');
  const [sprintDropdownOpen, setSprintDropdownOpen] = useState(false);

  // Sprint Creation Form
  const [newSprintNome, setNewSprintNome] = useState('');
  const [newSprintDataInicio, setNewSprintDataInicio] = useState('');
  const [newSprintDataFim, setNewSprintDataFim] = useState('');
  const [newSprintObjetivo, setNewSprintObjetivo] = useState('');
  const [creatingSprint, setCreatingSprint] = useState(false);

  const isManager = (project.membros || []).some(
    m => m.perfil === 'GERENTE' && m.usuario?.email === currentUserEmail
  );

  const isPO = (project.membros || []).some(
    m => m.perfil === 'PO' && m.usuario?.email === currentUserEmail
  );

  const canInvite = isManager || isPO;

  const [editNome, setEditNome] = useState(project.nome || '');
  const [editDescricao, setEditDescricao] = useState(project.descricao || '');
  const [editPrazo, setEditPrazo] = useState(project.data_prazo ? project.data_prazo.split('T')[0] : '');
  const [updatingSettings, setUpdatingSettings] = useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Toast notification state
  const [toast, setToast] = useState(null);
  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type });
  }, []);

  // Estados do modal de convite
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePerfil, setInvitePerfil] = useState('DEV');
  const [invitingMember, setInvitingMember] = useState(false);

  // Estados do autocomplete de usuários (busca server-side)
  const [searchResults, setSearchResults] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchEmail, setSearchEmail] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchTimerRef = useRef(null);

  // Modal de confirmação para remoção de membro
  const [isRemoveMemberModalOpen, setIsRemoveMemberModalOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState(null);

  // Reset invite modal state when closed
  useEffect(() => {
    if (!isInviteModalOpen) {
      setSearchEmail('');
      setSelectedUser(null);
      setInviteEmail('');
      setInvitePerfil('DEV');
      setShowDropdown(false);
      setSearchResults([]);
    }
  }, [isInviteModalOpen]);

  // Debounced server-side search for users
  const handleSearchUsers = useCallback((query) => {
    setSearchEmail(query);
    setSelectedUser(null);
    setInviteEmail('');
    setShowDropdown(true);

    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    searchTimerRef.current = setTimeout(async () => {
      setLoadingUsers(true);
      try {
        const res = await api.get(`/api/usuarios/buscar?q=${encodeURIComponent(query.trim())}&limit=20`);
        // Filter out users already in the project
        const filtered = res.data.filter(
          u => !project.membros?.some(m => m.usuario?.email === u.email)
        );
        setSearchResults(filtered);
      } catch (err) {
        console.error(err);
        setSearchResults([]);
      } finally {
        setLoadingUsers(false);
      }
    }, 300);
  }, [project.membros]);

  const fetchSprints = useCallback(async () => {
    setSprintsLoading(true);
    try {
      const res = await api.get(`/api/projetos/${project.id_projeto}/sprints`);
      setSprints(res.data);

      const active = res.data.find(s => s.status === 'ATIVA');
      if (active) {
        setSelectedSprintId(active.id_sprint);
      } else {
        setSelectedSprintId(prev => {
          if (prev && prev !== 'backlog' && res.data.some(s => s.id_sprint === prev)) {
            return prev;
          }
          return 'backlog';
        });
      }
    } catch (err) {
      console.error('Erro ao buscar sprints:', err);
    } finally {
      setSprintsLoading(false);
    }
  }, [project.id_projeto]);

  useEffect(() => {
    fetchSprints();
  }, [project.id_projeto, fetchSprints]);

  const handleUpdateSettings = async (e) => {
    e.preventDefault();
    if (!isManager) return;
    setUpdatingSettings(true);
    try {
      const res = await api.patch(`/api/projetos/${project.id_projeto}`, {
        nome: editNome,
        descricao: editDescricao,
        data_prazo: editPrazo ? new Date(editPrazo).toISOString() : null,
      });
      onUpdateProject(res.data);
      showToast('Configurações salvas com sucesso!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Erro ao salvar as configurações.', 'error');
    } finally {
      setUpdatingSettings(false);
    }
  };

  const handleArchiveProject = async () => {
    if (!isManager) return;
    try {
      await api.patch(`/api/projetos/${project.id_projeto}`, { arquivado: !project.arquivado });
      if (onProjectAction) onProjectAction();
    } catch (err) {
      console.error(err);
      showToast('Erro ao alterar status de arquivamento do projeto.', 'error');
    }
  };

  const handleDeleteProject = async () => {
    if (!isManager) return;
    try {
      await api.delete(`/api/projetos/${project.id_projeto}`);
      if (onProjectAction) onProjectAction();
    } catch (err) {
      console.error(err);
      showToast('Erro ao excluir projeto.', 'error');
    }
  };

  const handleInviteMember = async (e) => {
    e.preventDefault();
    if (!canInvite) return;
    setInvitingMember(true);
    try {
      await api.post(`/api/projetos/${project.id_projeto}/membros`, {
        email: inviteEmail,
        perfil: invitePerfil
      });
      setIsInviteModalOpen(false);
      showToast('Convite enviado com sucesso!', 'success');
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.error || 'Erro ao convidar membro.', 'error');
    } finally {
      setInvitingMember(false);
    }
  };

  const handleUpdateMemberProfile = async (idUsuario, newPerfil) => {
    if (!isManager) return;
    try {
      const res = await api.patch(`/api/projetos/${project.id_projeto}/membros/${idUsuario}`, {
        perfil: newPerfil
      });
      const updatedProject = {
        ...project,
        membros: project.membros.map(m => m.id_usuario === idUsuario ? res.data : m)
      };
      onUpdateProject(updatedProject);
      showToast('Perfil do membro atualizado.', 'success');
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.error || 'Erro ao atualizar perfil do membro.', 'error');
    }
  };

  const confirmRemoveMember = (member) => {
    setMemberToRemove(member);
    setIsRemoveMemberModalOpen(true);
  };

  const handleRemoveMember = async () => {
    if (!isManager || !memberToRemove) return;
    try {
      await api.delete(`/api/projetos/${project.id_projeto}/membros/${memberToRemove.id_usuario}`);
      const updatedProject = {
        ...project,
        membros: project.membros.filter(m => m.id_usuario !== memberToRemove.id_usuario)
      };
      onUpdateProject(updatedProject);
      showToast('Membro removido com sucesso.', 'success');
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.error || 'Erro ao remover membro.', 'error');
    } finally {
      setIsRemoveMemberModalOpen(false);
      setMemberToRemove(null);
    }
  };

  // Pegar todos os membros do projeto para exibição e atribuição
  // A API retorna membros com { perfil, usuario: { id_usuario, nome, email } }
  const members = (project.membros || []).map(m => ({
    id_usuario: m.usuario?.id_usuario || m.id_usuario,
    nome: m.usuario?.nome || m.nome || 'Membro',
    email: m.usuario?.email || '',
    perfil: m.perfil || 'DEV',
    foto: m.usuario?.foto || m.foto || null,
  }));

  // Categorias de colunas (Status)
  const columns = [
    { id: 'A_FAZER', label: 'A FAZER', color: 'bg-slate-200 text-slate-700' },
    { id: 'EM_ANDAMENTO', label: 'EM ANDAMENTO', color: 'bg-amber-100 text-amber-800' },
    { id: 'HOMOLOGACAO', label: 'HOMOLOGAÇÃO', color: 'bg-purple-100 text-purple-800' },
    { id: 'CONCLUIDO', label: 'CONCLUÍDO', color: 'bg-emerald-100 text-emerald-800' },
  ];

  // ================= DRAG AND DROP NATIVO =================
  const handleDragStart = (e, cardId) => {
    e.dataTransfer.setData('text/plain', cardId);
    e.currentTarget.classList.add('opacity-40');
  };

  const handleDragEnd = (e) => {
    e.currentTarget.classList.remove('opacity-40');
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, targetStatus) => {
    e.preventDefault();
    const cardId = e.dataTransfer.getData('text/plain');
    if (!cardId) return;

    const cardObj = (project.cards || []).find(c => c.id_card === cardId);
    if (!cardObj || cardObj.status === targetStatus) return;

    // Auto-atribuição otimista: se o card não tem responsável, atribui ao usuário que moveu
    let optimisticResponsavel = cardObj.responsavel;
    let optimisticResponsavelId = cardObj.id_responsavel;

    if (!cardObj.id_responsavel) {
      const currentMember = members.find(m => m.email === currentUserEmail);
      if (currentMember) {
        optimisticResponsavel = {
          id_usuario: currentMember.id_usuario,
          nome: currentMember.nome,
          email: currentMember.email,
        };
        optimisticResponsavelId = currentMember.id_usuario;
      }
    }

    // Salvar estado anterior para rollback
    const previousCards = project.cards;

    // Atualização otimista
    const updatedCards = project.cards.map(card => {
      if (card.id_card === cardId) {
        return {
          ...card,
          status: targetStatus,
          id_responsavel: optimisticResponsavelId,
          responsavel: optimisticResponsavel,
        };
      }
      return card;
    });

    onUpdateProject({
      ...project,
      cards: updatedCards,
    });

    // Persistir no backend
    api.patch(`/api/cards/${cardId}/status`, { status: targetStatus })
      .then(res => {
        // Sincronizar com a resposta do servidor (inclui auto-atribuição confirmada)
        const serverCards = project.cards.map(card =>
          card.id_card === cardId ? res.data : card
        );
        onUpdateProject({
          ...project,
          cards: serverCards,
        });
      })
      .catch(err => {
        console.error('Erro ao persistir movimentação:', err);
        showToast('Erro ao movimentar card.', 'error');
        // Rollback
        onUpdateProject({
          ...project,
          cards: previousCards,
        });
      });
  };

  // Mover cartão via clique (acessibilidade / mobile-friendly)
  const moveCard = (cardId, targetStatus) => {
    const cardObj = (project.cards || []).find(c => c.id_card === cardId);
    if (!cardObj || cardObj.status === targetStatus) return;

    // Auto-atribuição otimista
    let optimisticResponsavel = cardObj.responsavel;
    let optimisticResponsavelId = cardObj.id_responsavel;

    if (!cardObj.id_responsavel) {
      const currentMember = members.find(m => m.email === currentUserEmail);
      if (currentMember) {
        optimisticResponsavel = {
          id_usuario: currentMember.id_usuario,
          nome: currentMember.nome,
          email: currentMember.email,
        };
        optimisticResponsavelId = currentMember.id_usuario;
      }
    }

    const previousCards = project.cards;

    const updatedCards = project.cards.map(card => {
      if (card.id_card === cardId) {
        return {
          ...card,
          status: targetStatus,
          id_responsavel: optimisticResponsavelId,
          responsavel: optimisticResponsavel,
        };
      }
      return card;
    });

    onUpdateProject({
      ...project,
      cards: updatedCards,
    });

    // Persistir no backend
    api.patch(`/api/cards/${cardId}/status`, { status: targetStatus })
      .then(res => {
        const serverCards = project.cards.map(card =>
          card.id_card === cardId ? res.data : card
        );
        onUpdateProject({
          ...project,
          cards: serverCards,
        });
      })
      .catch(err => {
        console.error('Erro ao persistir movimentação:', err);
        showToast('Erro ao movimentar card.', 'error');
        onUpdateProject({
          ...project,
          cards: previousCards,
        });
      });
  };

  // ================= FILTRO E BUSCA DE CARDS =================
  const filteredCards = (project.cards || []).filter(card => {
    const matchesSearch = card.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      card.id_card.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTag = selectedTag ? (card.tags || []).includes(selectedTag) : true;
    const matchesSprint = selectedSprintId === 'backlog'
      ? (!card.id_sprint)
      : (card.id_sprint === selectedSprintId);
    return matchesSearch && matchesTag && matchesSprint;
  });

  // ================= SUBMISSÃO DE NOVA ATIVIDADE =================
  const handleCreateCard = async (e) => {
    e.preventDefault();
    if (!newCardTitle) return;

    setCreatingCard(true);

    try {
      // Achar membro atribuído
      const assignedMember = members.find(m => m.nome === newCardMember);

      const res = await api.post(`/api/projetos/${project.id_projeto}/cards`, {
        titulo: newCardTitle,
        prioridade: newCardPriority,
        tags: newCardTags,
        id_responsavel: assignedMember?.id_usuario || null,
        id_sprint: selectedSprintId === 'backlog' ? null : selectedSprintId,
      });

      const newCard = res.data;

      onUpdateProject({
        ...project,
        cards: [...(project.cards || []), newCard]
      });

      // Resetar formulário
      setNewCardTitle('');
      setNewCardPriority('MEDIA');
      setNewCardTags([]);
      setNewCardMember('');
      setIsNewCardModalOpen(false);

      // Refresh sprints to count the new card
      fetchSprints();
    } catch (error) {
      console.error('Erro ao criar atividade:', error);
    } finally {
      setCreatingCard(false);
    }
  };

  // Alternar tag nos inputs de nova atividade
  const toggleFormTag = (tag) => {
    if (newCardTags.includes(tag)) {
      setNewCardTags(newCardTags.filter(t => t !== tag));
    } else {
      setNewCardTags([...newCardTags, tag]);
    }
  };

  // ================= GERENCIAMENTO DE SPRINTS =================
  const handleCreateSprint = async (e) => {
    e.preventDefault();
    if (!newSprintNome.trim()) return;

    if (newSprintDataInicio && newSprintDataFim) {
      if (new Date(newSprintDataFim) < new Date(newSprintDataInicio)) {
        showToast('A data de término não pode ser anterior à data de início.', 'error');
        return;
      }
    }

    setCreatingSprint(true);
    try {
      const res = await api.post(`/api/projetos/${project.id_projeto}/sprints`, {
        nome: newSprintNome,
        data_inicio: newSprintDataInicio || null,
        data_fim: newSprintDataFim || null,
        objetivo: newSprintObjetivo || null,
      });

      setSprints(prev => [...prev, res.data]);
      showToast('Sprint criada com sucesso!', 'success');

      setNewSprintNome('');
      setNewSprintDataInicio('');
      setNewSprintDataFim('');
      setNewSprintObjetivo('');
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.error || 'Erro ao criar sprint.', 'error');
    } finally {
      setCreatingSprint(false);
    }
  };

  const handleStartSprint = async (sprintId) => {
    try {
      const res = await api.patch(`/api/sprints/${sprintId}/iniciar`);
      setSprints(prev => prev.map(s => s.id_sprint === sprintId ? res.data : s));
      setSelectedSprintId(sprintId);
      showToast('Sprint iniciada com sucesso!', 'success');

      // Update cards in project to synchronize status
      if (onProjectAction) onProjectAction();
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.error || 'Erro ao iniciar sprint.', 'error');
    }
  };

  const handleFinishSprint = async (sprintId) => {
    try {
      const res = await api.patch(`/api/sprints/${sprintId}/finalizar`);
      setSprints(prev => prev.map(s => s.id_sprint === sprintId ? res.data : s));
      showToast('Sprint concluída com sucesso!', 'success');

      if (onProjectAction) onProjectAction();
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.error || 'Erro ao finalizar sprint.', 'error');
    }
  };

  const handleMigrateCard = async (cardId, targetSprintId) => {
    try {
      await api.post(`/api/sprints/${targetSprintId}/migrar-cards`, {
        cardIds: [cardId]
      });

      // Update card in project state locally
      const updatedCards = project.cards.map(c => c.id_card === cardId ? { ...c, id_sprint: targetSprintId } : c);
      onUpdateProject({
        ...project,
        cards: updatedCards
      });

      // Reload sprints to update card lists
      fetchSprints();
      showToast('Tarefa migrada com sucesso!', 'success');
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.error || 'Erro ao migrar tarefa.', 'error');
    }
  };

  return (
    <div className="flex flex-col md:flex-row flex-grow md:h-full md:overflow-hidden -mx-6 md:-mx-8 relative">

      {/* Toast Notifications */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Botão de Menu Flutuante para Mobile */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="md:hidden fixed bottom-6 right-6 z-50 bg-brand-600 text-white p-4 rounded-full shadow-lg active:scale-95 transition-all"
      >
        <Menu size={24} />
      </button>

      {/* ================= 1. MENU LATERAL (SIDEBAR) ================= */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 pt-20 px-4 flex flex-col justify-between transition-transform duration-300 ease-in-out
        md:translate-x-0 md:static md:h-full md:pt-6
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="space-y-6">
          {/* Logo e Nome em Mobile (pois em desktop já está no header) */}
          <div className="flex md:hidden items-center gap-2 px-2 pb-4 border-b border-slate-100">
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 select-none">
              <rect width="100" height="100" rx="30" fill="#320066" />
              <polygon points="50,23 74,37 74,63 50,77 26,63 26,37" fill="white" stroke="white" strokeWidth="6" strokeLinejoin="round" />
            </svg>
            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-brand-600 to-indigo-600 bg-clip-text text-transparent">
              Quadrus
            </span>
          </div>

          {/* Links do Menu */}
          <nav className="space-y-1.5 text-left">
            <button
              onClick={() => { setActiveTab('board'); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-bold border-l-4 transition-all ${activeTab === 'board'
                  ? 'bg-brand-50 text-brand-700 shadow-sm border-brand-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}
            >
              <FolderKanban size={18} />
              <span className="whitespace-nowrap">Painel de Tarefas</span>
            </button>

            <button
              onClick={() => { setActiveTab('sprint'); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-bold border-l-4 transition-all ${activeTab === 'sprint'
                  ? 'bg-brand-50 text-brand-700 shadow-sm border-brand-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}
            >
              <Calendar size={18} />
              <span className="whitespace-nowrap">Planejamento de Sprint</span>
            </button>

            <button
              onClick={() => { setActiveTab('metrics'); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-bold border-l-4 transition-all ${activeTab === 'metrics'
                  ? 'bg-brand-50 text-brand-700 shadow-sm border-brand-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}
            >
              <TrendingUp size={18} />
              <span className="whitespace-nowrap">Métricas</span>
            </button>

            <button
              onClick={() => { setActiveTab('settings'); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-bold border-l-4 transition-all ${activeTab === 'settings'
                  ? 'bg-brand-50 text-brand-700 shadow-sm border-brand-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}
            >
              <Settings size={18} />
              <span className="whitespace-nowrap">Configurações</span>
            </button>
          </nav>
        </div>

        {/* Informações Inferiores do Menu */}
        <div className="border-t border-slate-100 py-4 text-left">
          <div className="flex items-center gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-100">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Workspace Ativo</span>
          </div>
        </div>
      </aside>

      {/* Backdrop para mobile */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-30 md:hidden"
        />
      )}

      {/* ================= 2. CONTEÚDO PRINCIPAL DA TELA ================= */}
      <main className="flex-1 p-6 md:p-8 flex flex-col bg-slate-50 overflow-y-auto h-full overflow-x-auto min-h-0 text-left">

        {activeTab === 'board' ? (
          <>
            {/* ================= BARRA DE FERRAMENTAS / TOOLBAR ================= */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 shadow-sm mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">

              {/* Esquerda: Membros e Filtros Rápidos */}
              <div className="flex flex-wrap items-center gap-4">

                {/* Lista de Membros do Projeto */}
                <div className="flex items-center">
                  <div className="flex -space-x-2.5">
                    {members.slice(0, 4).map((member, i) => (
                      <AvatarWithFallback
                        key={member.id_usuario || i}
                        nome={member.nome}
                        foto={member.foto}
                        title={`${member.nome} (${member.perfil})`}
                        className="w-8 h-8 rounded-full border-2 border-white object-cover shadow-sm"
                      />
                    ))}
                    {members.length > 4 && (
                      <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[10px] font-extrabold text-slate-600 shadow-sm shrink-0">
                        +{members.length - 4}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      if (canInvite) {
                        setIsInviteModalOpen(true);
                      } else {
                        alert('Acesso negado: apenas gerentes e POs podem convidar membros.');
                      }
                    }}
                    className="ml-3 p-1.5 rounded-lg border border-dashed border-slate-300 text-slate-400 hover:text-brand-600 hover:border-brand-500 transition-colors"
                    title="Adicionar Membro"
                  >
                    <UserPlus size={15} />
                  </button>
                </div>

                <div className="h-6 w-px bg-slate-200 hidden md:block" />

                {/* Filtros de Tags */}
                <div className="flex items-center gap-1.5">
                  {['FRONTEND', 'DESIGN', 'BACKEND', 'DEVOPS'].map(tag => (
                    <button
                      key={tag}
                      onClick={() => setSelectedTag(selectedTag === tag ? '' : tag)}
                      className={`px-3 py-1.5 rounded-lg font-semibold text-[10px] border transition-all active:scale-95 ${selectedTag === tag
                          ? 'bg-brand-600 border-brand-600 text-white shadow-sm'
                          : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>

                {/* Dropdown de Sprint */}
                <div className="relative">
                  <button
                    onClick={() => setSprintDropdownOpen(!sprintDropdownOpen)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-900 hover:bg-brand-850 text-white font-bold text-[11px] border border-brand-800 transition-all active:scale-95 uppercase tracking-wide shadow-sm"
                  >
                    <span>{selectedSprintId === 'backlog' ? 'BACKLOG' : (sprints.find(s => s.id_sprint === selectedSprintId)?.nome || 'SELECIONAR SPRINT')}</span>
                    <ChevronDown size={12} className={`transition-transform duration-200 ${sprintDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {sprintDropdownOpen && (
                    <div className="absolute left-0 mt-1.5 w-44 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-30 text-left animate-fade-in">
                      <button
                        onClick={() => {
                          setSelectedSprintId('backlog');
                          setSprintDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs font-semibold hover:bg-slate-50 transition-colors ${selectedSprintId === 'backlog' ? 'text-brand-600 bg-brand-50/50' : 'text-slate-700'
                          }`}
                      >
                        BACKLOG
                      </button>
                      {sprints.map((sprint) => (
                        <button
                          key={sprint.id_sprint}
                          onClick={() => {
                            setSelectedSprintId(sprint.id_sprint);
                            setSprintDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs font-semibold hover:bg-slate-50 transition-colors ${selectedSprintId === sprint.id_sprint ? 'text-brand-600 bg-brand-50/50' : 'text-slate-700'
                            }`}
                        >
                          {sprint.nome} {sprint.status === 'ATIVA' && ' (Atual)'}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* Direita: Campo de Pesquisa e Filtros */}
              <div className="flex items-center gap-2 w-full lg:w-auto">
                <div className="relative flex-1 lg:w-64">
                  <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                  <input
                    type="text"
                    placeholder="Pesquisar tarefas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all placeholder-slate-400"
                  />
                </div>
                <button
                  onClick={() => { setSelectedTag(''); setSearchTerm(''); }}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors shrink-0"
                  title="Limpar Filtros"
                >
                  <Filter size={16} />
                </button>
              </div>

            </div>

            {/* ================= QUADRO KANBAN ================= */}
            <div className="flex gap-5 min-h-[500px] items-stretch select-none pb-6 overflow-x-auto">

              {/* Loop pelas colunas do Kanban */}
              {columns.map(col => {
                const columnCards = filteredCards.filter(card => card.status === col.id);

                return (
                  <div
                    key={col.id}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, col.id)}
                    className="flex flex-col bg-slate-100 border border-slate-200/60 rounded-2xl w-72 p-4 shrink-0 shadow-sm"
                  >
                    {/* Header da Coluna */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-slate-800 tracking-tight">{col.label}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
                          {columnCards.length}
                        </span>
                      </div>
                      <span className="text-slate-400 text-sm font-bold cursor-pointer hover:text-slate-600">•••</span>
                    </div>

                    {/* Botão Nova Atividade na coluna A_FAZER */}
                    {col.id === 'A_FAZER' && (
                      <button
                        onClick={() => setIsNewCardModalOpen(true)}
                        className="mb-4 w-full flex items-center justify-center gap-2 bg-[#320066] hover:bg-[#26004d] text-white font-extrabold text-xs py-3 rounded-xl transition-all shadow-md shadow-brand-500/10 active:scale-[0.98]"
                      >
                        <Plus size={16} />
                        Nova Atividade
                      </button>
                    )}

                    {/* Área de rolagem dos cartões na coluna */}
                    <div className="space-y-3 flex-1 min-h-[300px] overflow-y-auto max-h-[600px] pr-1">
                      {columnCards.length > 0 ? (
                        columnCards.map(card => {
                          const isAlta = card.prioridade === 'ALTA';
                          const isMedia = card.prioridade === 'MEDIA';
                          const isBaixa = card.prioridade === 'BAIXA';

                          // Cor do accent da esquerda dependendo do status e prioridade
                          let borderAccentColor = 'border-l-4 border-l-slate-400';
                          if (col.id === 'CONCLUIDO') borderAccentColor = 'border-l-4 border-l-emerald-500';
                          else if (isAlta) borderAccentColor = 'border-l-4 border-l-rose-500';
                          else if (isMedia) borderAccentColor = 'border-l-4 border-l-indigo-500';
                          else if (isBaixa) borderAccentColor = 'border-l-4 border-l-slate-400';

                          return (
                            <div
                              key={card.id_card}
                              draggable
                              onDragStart={(e) => handleDragStart(e, card.id_card)}
                              onDragEnd={handleDragEnd}
                              className={`
                                group bg-white border border-slate-200 rounded-xl p-4.5 p-4 text-left shadow-sm hover:shadow-md hover:border-brand-300 cursor-grab active:cursor-grabbing transition-all duration-200 relative
                                ${borderAccentColor}
                              `}
                            >
                              {/* Topo do Card: Badge de Prioridade */}
                              <div className="flex items-center justify-between gap-2 mb-2">
                                {col.id === 'CONCLUIDO' ? (
                                  <span className="flex items-center gap-1 font-bold text-[9px] text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md">
                                    <CheckCircle2 size={10} className="text-emerald-500" />
                                    CONCLUÍDO
                                  </span>
                                ) : (
                                  <span className={`font-bold text-[9px] px-2 py-0.5 rounded-md border ${isAlta
                                      ? 'text-rose-700 bg-rose-50 border-rose-100'
                                      : isMedia
                                        ? 'text-brand-700 bg-brand-50 border-brand-100'
                                        : 'text-slate-600 bg-slate-50 border-slate-100'
                                    }`}>
                                    {isAlta ? 'ALTA PRIORIDADE' : isMedia ? 'MÉDIA PRIORIDADE' : 'BAIXA PRIORIDADE'}
                                  </span>
                                )}
                              </div>

                              {/* Título do Card */}
                              <h4 className="font-extrabold text-sm text-slate-800 leading-snug group-hover:text-brand-700 transition-colors">
                                {card.titulo}
                              </h4>

                              {/* Warning de Atraso */}
                              {card.atrasado && (
                                <div className="mt-2.5 flex items-center gap-1.5 bg-orange-50 border border-orange-100 text-orange-800 text-[9px] font-bold px-2 py-1 rounded-lg">
                                  <AlertTriangle size={11} className="text-orange-500 shrink-0" />
                                  <span>ATRASO SINALIZADO</span>
                                </div>
                              )}

                              {/* Tags do Card */}
                              {card.tags && card.tags.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-1">
                                  {card.tags.map(t => (
                                    <span key={t} className="text-[9px] font-bold bg-slate-50 border border-slate-100 px-2 py-0.5 rounded text-slate-400">
                                      {t}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {/* Divisor */}
                              <div className="my-3 border-t border-slate-100" />

                              {/* Rodapé do Card */}
                              <div className="flex items-center justify-between">
                                {/* Avatar do responsável */}
                                <div className="flex -space-x-1.5">
                                  {card.responsavel && (
                                    <AvatarWithFallback
                                      nome={card.responsavel.nome}
                                      foto={card.responsavel.foto}
                                      title={card.responsavel.nome}
                                      className="w-6 h-6 rounded-full border border-white bg-slate-50"
                                    />
                                  )}
                                </div>

                                {/* Metadados do card */}
                                <div className="flex items-center gap-2.5 text-[10px] font-bold text-slate-400">
                                  {(card.story_points !== undefined && card.story_points !== null) && (
                                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-50 border border-slate-100 text-slate-500 font-mono text-[9px]" title="Pontos de História">
                                      {card.story_points} SP
                                    </span>
                                  )}
                                </div>
                              </div>

                            </div>
                          );
                        })
                      ) : (
                        <div className="flex flex-col items-center justify-center py-12 border border-dashed border-slate-200 rounded-xl text-slate-400 bg-white/50">
                          <span className="text-xs font-semibold">Nenhuma atividade</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Coluna "Nova Coluna" */}
              <div className="flex flex-col border border-dashed border-slate-300 rounded-2xl w-72 p-4 shrink-0 items-center justify-center text-slate-400 hover:border-brand-500 hover:text-brand-600 transition-all cursor-pointer bg-white/30 hover:bg-white/50 select-none">
                <Plus size={20} className="mb-1" />
                <span className="font-extrabold text-xs tracking-wider uppercase">Nova Coluna</span>
              </div>

            </div>
          </>
        ) : activeTab === 'sprint' ? (
          /* ================= TELA PLANEJAMENTO DE SPRINT E CICLOS ================= */
          <div className="flex flex-col w-full text-left">
            {/* Header da Tela */}
            <div className="text-left mb-6 md:mb-8">
              <h1 className="text-2xl font-extrabold text-slate-800">Planejamento de Sprint e Ciclos</h1>
              <p className="text-slate-500 text-sm mt-1">Gerencie a velocidade da sua engenharia. Inicialize novos ciclos e realize transições limpas entre sprints com a transferência automática de trabalhos incompletos.</p>
            </div>

            {/* Grid Principal */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left items-start">

              {/* Esquerda: Criar Sprint */}
              <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                  <Calendar className="text-brand-600" size={20} />
                  <h2 className="text-md font-extrabold text-slate-800 uppercase tracking-wider">Criar Sprint</h2>
                </div>

                <form onSubmit={handleCreateSprint} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Nome da Sprint</label>
                    <input
                      type="text"
                      required
                      placeholder="Sprint 24 - Orion Project"
                      value={newSprintNome}
                      onChange={(e) => setNewSprintNome(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all placeholder-slate-400"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Início</label>
                      <input
                        type="date"
                        value={newSprintDataInicio}
                        onChange={(e) => setNewSprintDataInicio(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all text-slate-700"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Término</label>
                      <input
                        type="date"
                        value={newSprintDataFim}
                        onChange={(e) => setNewSprintDataFim(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all text-slate-700"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Objetivo da Sprint</label>
                    <textarea
                      rows="3"
                      placeholder="Defina o objetivo primário da sprint..."
                      value={newSprintObjetivo}
                      onChange={(e) => setNewSprintObjetivo(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all placeholder-slate-400 resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={creatingSprint}
                    className="w-full bg-[#320066] hover:bg-[#25004d] text-white font-bold text-sm py-3 px-6 rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {creatingSprint && <Loader2 size={16} className="animate-spin" />}
                    Criar Sprint
                  </button>
                </form>
              </div>

              {/* Direita: Encerrar / Transição de Sprint */}
              <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm min-h-[400px] flex flex-col justify-between">
                {(() => {
                  const activeSprint = sprints.find(s => s.status === 'ATIVA');
                  const nextSprint = sprints.find(s => s.status === 'PLANEJAMENTO');

                  if (activeSprint) {
                    const unfinishedCards = (activeSprint.cards || []).filter(c => c.status !== 'CONCLUIDO');
                    const finishedCards = (activeSprint.cards || []).filter(c => c.status === 'CONCLUIDO');

                    return (
                      <div className="flex flex-col h-full justify-between gap-6">
                        <div>
                          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                            <div>
                              <h2 className="text-md font-extrabold text-slate-800">Encerrar Sprint</h2>
                              <p className="text-slate-500 text-xs mt-0.5">A {activeSprint.nome} termina hoje. Tarefas incompletas serão migradas.</p>
                            </div>
                          </div>

                          <div className="flex flex-col md:flex-row items-stretch gap-4 mt-4">
                            {/* Coluna Sprint Atual */}
                            <div className="flex-1 bg-slate-50/50 border border-slate-200/60 rounded-xl p-4">
                              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-rose-600 uppercase tracking-wide mb-3">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
                                {activeSprint.nome} (Atual)
                              </span>
                              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                                {unfinishedCards.map(card => (
                                  <div key={card.id_card} className="bg-white border border-slate-200/80 rounded-lg p-2.5 shadow-sm text-xs text-left">
                                    <div className="flex justify-between items-center gap-2 mb-1">
                                      <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded ${card.prioridade === 'ALTA' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                                          card.prioridade === 'MEDIA' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                                            'bg-slate-50 text-slate-600 border border-slate-100'
                                        }`}>
                                        {card.prioridade}
                                      </span>
                                    </div>
                                    <p className="font-bold text-slate-700">{card.titulo}</p>
                                  </div>
                                ))}
                                {finishedCards.map(card => (
                                  <div key={card.id_card} className="bg-slate-50/80 border border-slate-200/40 rounded-lg p-2.5 text-xs opacity-60 text-left">
                                    <p className="font-semibold text-slate-400 line-through">{card.titulo}</p>
                                    <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 mt-1.5 inline-block">
                                      CONCLUÍDO
                                    </span>
                                  </div>
                                ))}
                                {activeSprint.cards?.length === 0 && (
                                  <p className="text-slate-400 text-xs py-4 text-center">Nenhum card nesta sprint</p>
                                )}
                              </div>
                            </div>

                            {/* Botão de Migração */}
                            <div className="flex flex-row md:flex-col items-center justify-center gap-2 shrink-0 self-center">
                              <button
                                onClick={() => {
                                  if (!nextSprint) {
                                    showToast('Você precisa ter uma próxima sprint em planejamento para migrar as tarefas.', 'info');
                                    return;
                                  }
                                  unfinishedCards.forEach(c => handleMigrateCard(c.id_card, nextSprint.id_sprint));
                                }}
                                disabled={unfinishedCards.length === 0 || !nextSprint}
                                className="p-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-600 rounded-full transition-all hover:scale-105 active:scale-95 flex flex-col items-center gap-0.5 shadow-sm"
                                title="Migrar tarefas pendentes para a próxima sprint"
                              >
                                <ChevronsRight size={18} />
                                <span className="text-[8px] font-extrabold uppercase tracking-wider">MIGRAR</span>
                              </button>
                            </div>

                            {/* Coluna Sprint Próxima */}
                            <div className="flex-1 bg-slate-50/50 border border-slate-200/60 rounded-xl p-4 flex flex-col justify-between">
                              <div>
                                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-blue-600 uppercase tracking-wide mb-3">
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                                  {nextSprint ? `${nextSprint.nome} (Próxima)` : 'Próxima Sprint'}
                                </span>
                                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                                  {nextSprint ? (
                                    (nextSprint.cards || []).map(card => (
                                      <div key={card.id_card} className="bg-white border border-slate-200/80 rounded-lg p-2.5 shadow-sm text-xs text-left">
                                        <p className="font-bold text-slate-700">{card.titulo}</p>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="flex flex-col items-center justify-center py-8 text-center text-slate-400">
                                      <Calendar size={20} className="mb-1" />
                                      <p className="text-[10px] font-semibold">Nenhuma sprint planejada</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div
                                onClick={() => {
                                  if (nextSprint) {
                                    setSelectedSprintId(nextSprint.id_sprint);
                                    setActiveTab('board');
                                  } else {
                                    showToast('Crie uma próxima sprint no painel ao lado primeiro.', 'info');
                                  }
                                }}
                                className="border border-dashed border-slate-300 rounded-lg p-3 text-center text-[10px] font-bold text-slate-400 mt-4 bg-white/50 cursor-pointer hover:border-brand-500 hover:text-brand-600 transition-all select-none"
                              >
                                Adicionar mais itens do backlog...
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Botão Concluir/Fechar */}
                        <div className="flex justify-end pt-4 border-t border-slate-100">
                          <button
                            onClick={() => handleFinishSprint(activeSprint.id_sprint)}
                            className="px-5 py-2.5 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-50 text-rose-600 hover:text-rose-700 font-bold text-xs transition-all shadow-sm active:scale-95 flex items-center gap-1.5"
                          >
                            <CheckCircle2 size={15} />
                            Fechar Sprint Atual
                          </button>
                        </div>
                      </div>
                    );
                  }

                  // Se não houver sprint ativa
                  return (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <Calendar className="text-slate-300 mb-3 animate-pulse" size={48} />
                      <h3 className="text-md font-extrabold text-slate-700">Nenhuma Sprint Ativa</h3>
                      <p className="text-slate-400 text-xs max-w-sm mt-1 leading-relaxed">
                        Não há nenhuma sprint ativa no momento. Planeje suas tarefas e inicie uma das sprints listadas abaixo ou crie uma nova no painel ao lado.
                      </p>

                      {/* Lista de Sprints em Planejamento para Iniciar */}
                      {sprints.filter(s => s.status === 'PLANEJAMENTO').length > 0 && (
                        <div className="w-full mt-6 max-w-md border border-slate-100 rounded-xl p-3 bg-slate-50/50">
                          <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider mb-2 text-left">Sprints Planejadas:</p>
                          <div className="space-y-2">
                            {sprints.filter(s => s.status === 'PLANEJAMENTO').map(s => (
                              <div key={s.id_sprint} className="bg-white border border-slate-200 rounded-lg p-3 flex items-center justify-between text-xs shadow-sm">
                                <div className="text-left">
                                  <p className="font-bold text-slate-800">{s.nome}</p>
                                  {s.objetivo && <p className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[200px]">{s.objetivo}</p>}
                                </div>
                                <button
                                  onClick={() => handleStartSprint(s.id_sprint)}
                                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] transition-all active:scale-95 shadow-sm"
                                >
                                  Iniciar Sprint
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

            </div>

            {/* Rodapé: Métricas baseadas na Sprint Ativa */}
            {(() => {
              const activeSprint = sprints.find(s => s.status === 'ATIVA');
              const totalCards = activeSprint ? (activeSprint.cards || []).length : 0;
              const completedCards = activeSprint ? (activeSprint.cards || []).filter(c => c.status === 'CONCLUIDO') : [];
              const completedCount = completedCards.length;

              const completedPoints = completedCards.reduce((acc, c) => acc + (c.story_points || 0), 0);
              const unfinishedCount = totalCards - completedCount;
              const percentage = totalCards > 0 ? Math.round((completedCount / totalCards) * 100) : 0;

              return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                  {/* Card 1: Pontuação */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Pontuação das Tarefas Concluídas</span>
                    <span className="text-3xl font-extrabold text-[#320066] mt-2 font-mono">{completedPoints} <span className="text-xs font-semibold text-slate-400 uppercase tracking-normal">pts</span></span>
                  </div>

                  {/* Card 2: Tarefas a migrar */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Tarefas a Serem Migradas</span>
                    <span className="text-3xl font-extrabold text-rose-600 mt-2 font-mono">{String(unfinishedCount).padStart(2, '0')} <span className="text-xs font-semibold text-slate-400 uppercase tracking-normal">tarefas</span></span>
                  </div>

                  {/* Card 3: Porcentagem */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Porcentagem de Concluídas</span>
                    <span className="text-3xl font-extrabold text-blue-600 mt-2 font-mono">{percentage} <span className="text-xs font-semibold text-slate-400 uppercase tracking-normal">%</span></span>
                  </div>
                </div>
              );
            })()}

          </div>
        ) : activeTab === 'metrics' ? (
          /* ================= TELA MÉTRICAS ================= */
          <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm text-center max-w-lg mx-auto mt-10">
            <TrendingUp className="mx-auto text-brand-600 mb-4 animate-pulse" size={40} />
            <h2 className="text-xl font-extrabold text-slate-800">Métricas de Equipe e Performance</h2>
            <p className="text-slate-500 mt-2 text-sm leading-relaxed">
              Visualize gráficos automatizados de Velocity, veja o burndown da sprint atual e acompanhe a governança da sprint através dos logs automáticos de RDA.
            </p>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 mt-6 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-200">
              <Sparkles size={12} />
              Em breve nesta branch!
            </div>
          </div>
        ) : (
          /* ================= TELA CONFIGURAÇÕES ================= */
          <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm max-w-2xl mx-auto mt-6 text-left">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
              <Settings className="text-brand-600" size={28} />
              <div>
                <h2 className="text-xl font-extrabold text-slate-800">Configurações do Projeto</h2>
                <p className="text-slate-500 text-sm">Gerencie os detalhes básicos, prazos e encerramento do projeto.</p>
              </div>
            </div>

            {!isManager ? (
              <div className="flex flex-col items-center justify-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                <AlertTriangle size={36} className="text-orange-400 mb-3" />
                <h3 className="text-lg font-bold text-slate-700">Acesso Restrito</h3>
                <p className="text-sm text-slate-500 text-center max-w-sm mt-1">Apenas os usuários com perfil de <strong className="text-brand-600">GERENTE</strong> podem visualizar ou alterar as configurações deste projeto.</p>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Formulário de Edição */}
                <form onSubmit={handleUpdateSettings} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Nome do Projeto</label>
                    <input
                      type="text"
                      required
                      value={editNome}
                      onChange={(e) => setEditNome(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all placeholder-slate-400"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Descrição</label>
                    <textarea
                      required
                      rows="3"
                      value={editDescricao}
                      onChange={(e) => setEditDescricao(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all placeholder-slate-400 resize-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Prazo (Deadline)</label>
                    <input
                      type="date"
                      value={editPrazo}
                      onChange={(e) => setEditPrazo(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all text-slate-700"
                    />
                  </div>
                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={updatingSettings}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-bold text-sm transition-all shadow-md active:scale-95 flex items-center gap-2 disabled:opacity-50"
                    >
                      {updatingSettings && <Loader2 size={16} className="animate-spin" />}
                      Salvar Configurações
                    </button>
                  </div>
                </form>

                {/* Seção: Membros da Equipe */}
                <div className="pt-6 border-t border-slate-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                      <UserPlus size={16} /> Membros da Equipe
                    </h3>
                    <button
                      onClick={() => setIsInviteModalOpen(true)}
                      className="text-xs font-bold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <Plus size={14} /> Convidar Membro
                    </button>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
                    <ul className="divide-y divide-slate-200 max-h-64 overflow-y-auto">
                      {members.map((m) => (
                        <li key={m.id_usuario} className="p-3 flex items-center justify-between hover:bg-slate-100 transition-colors">
                          <div className="flex items-center gap-3">
                            <AvatarWithFallback nome={m.nome} foto={m.foto} className="w-8 h-8 rounded-full border border-slate-300" />
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-slate-800">{m.nome}</span>
                              <span className="text-xs text-slate-500">{m.email || 'Email não disponível'}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            {isManager && m.email !== currentUserEmail ? (
                              <>
                                <select
                                  value={m.perfil}
                                  onChange={(e) => handleUpdateMemberProfile(m.id_usuario, e.target.value)}
                                  className="text-xs font-bold px-2 py-1 rounded-lg bg-white border border-slate-300 text-slate-700 outline-none hover:border-brand-300 focus:border-brand-500 transition-all cursor-pointer"
                                >
                                  <option value="ADMIN">ADMIN</option>
                                  <option value="GERENTE">GERENTE</option>
                                  <option value="PO">PO</option>
                                  <option value="DEV">DEV</option>
                                  <option value="TESTER">TESTER</option>
                                </select>
                                <button
                                  onClick={() => confirmRemoveMember(m)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                  title="Remover membro"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </>
                            ) : (
                              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-200 text-slate-700 border border-slate-300">
                                {m.perfil}
                              </span>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Área de Perigo (Danger Zone) */}
                <div className="pt-6 border-t border-slate-200">
                  <h3 className="text-sm font-bold text-rose-600 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <AlertTriangle size={16} /> Zona de Perigo
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border border-orange-200 bg-orange-50/50 flex flex-col justify-between">
                      <div>
                        <h4 className="font-bold text-orange-800 text-sm">
                          {project.arquivado ? 'Desarquivar Projeto' : 'Arquivar Projeto'}
                        </h4>
                        <p className="text-xs text-orange-700 mt-1 mb-4 leading-relaxed">
                          {project.arquivado
                            ? 'O projeto voltará a aparecer no seu Dashboard principal e ficará ativo novamente.'
                            : 'O projeto não aparecerá mais no Dashboard principal. Todas as tarefas e dados ficarão salvos para consultas futuras.'
                          }
                        </p>
                      </div>
                      <button
                        onClick={() => setIsArchiveModalOpen(true)}
                        className="w-full px-4 py-2 bg-orange-100 hover:bg-orange-200 text-orange-800 font-bold text-xs rounded-lg transition-colors flex justify-center items-center gap-2"
                      >
                        <Archive size={14} /> {project.arquivado ? 'Desarquivar' : 'Arquivar'}
                      </button>
                    </div>

                    <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/50 flex flex-col justify-between">
                      <div>
                        <h4 className="font-bold text-rose-800 text-sm">Excluir Definitivamente</h4>
                        <p className="text-xs text-rose-700 mt-1 mb-4 leading-relaxed">
                          Isso apagará o projeto permanentemente e todas as tarefas associadas. Essa ação não pode ser desfeita!
                        </p>
                      </div>
                      <button
                        onClick={() => setIsDeleteModalOpen(true)}
                        className="w-full px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg transition-colors flex justify-center items-center gap-2 shadow-sm"
                      >
                        <Trash2 size={14} /> Excluir Projeto
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      </main>

      {/* ================================= MODAL DE NOVA ATIVIDADE ================================= */}
      {isNewCardModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">

          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl relative overflow-hidden text-left p-6 md:p-8 animate-scale-up">

            {/* Header */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-extrabold text-brand-700 flex items-center gap-2">
                  <FolderKanban size={18} />
                  Criar Nova Atividade (Cartão)
                </h2>
                <p className="text-xs text-slate-400 mt-1">Preencha os campos para adicionar um novo item ao Kanban.</p>
              </div>
              <button
                onClick={() => setIsNewCardModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Formulário */}
            <form onSubmit={handleCreateCard} className="space-y-4">

              {/* Título */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Título da Atividade</label>
                <input
                  type="text"
                  required
                  placeholder="Descreva a atividade de forma clara..."
                  value={newCardTitle}
                  onChange={(e) => setNewCardTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                />
              </div>

              {/* Responsável (Membro) */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Atribuir a (Membro)</label>
                <select
                  value={newCardMember}
                  onChange={(e) => setNewCardMember(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-slate-700"
                >
                  <option value="">Selecione um membro...</option>
                  {members.map(m => (
                    <option key={m.id_usuario} value={m.nome}>{m.nome} ({m.perfil})</option>
                  ))}
                </select>
              </div>

              {/* Prioridade */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Nível de Prioridade</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'BAIXA', label: 'BAIXA', color: 'border-slate-200 text-slate-500 bg-slate-50 hover:bg-slate-100' },
                    { id: 'MEDIA', label: 'MÉDIA', color: 'border-brand-200 text-brand-600 bg-brand-50/50 hover:bg-brand-50' },
                    { id: 'ALTA', label: 'ALTA', color: 'border-rose-200 text-rose-600 bg-rose-50/50 hover:bg-rose-50' }
                  ].map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setNewCardPriority(p.id)}
                      className={`py-2 px-3 border rounded-xl text-center font-bold text-[10px] transition-all ${newCardPriority === p.id
                          ? 'border-brand-600 bg-brand-600 text-white shadow-sm scale-[0.98]'
                          : p.color
                        }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide font-semibold">Tags Relacionadas</label>
                <div className="flex flex-wrap gap-1.5">
                  {['FRONTEND', 'DESIGN', 'BACKEND', 'DEVOPS'].map(tag => {
                    const isSelected = newCardTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleFormTag(tag)}
                        className={`px-3 py-1.5 rounded-lg border font-bold text-[9px] transition-all ${isSelected
                            ? 'bg-slate-800 border-slate-800 text-white'
                            : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'
                          }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Rodapé do Modal */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsNewCardModalOpen(false)}
                  disabled={creatingCard}
                  className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 font-semibold text-xs transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingCard}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-bold text-xs transition-all shadow-md shadow-brand-500/10 active:scale-[0.98] disabled:opacity-50"
                >
                  {creatingCard ? 'Criando...' : 'Criar Atividade'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ================================= MODAL DE ARQUIVAMENTO ================================= */}
      {isArchiveModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 animate-scale-up text-center shadow-2xl">
            <div className="mx-auto w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mb-4">
              <Archive size={24} />
            </div>
            <h3 className="text-lg font-extrabold text-slate-800 mb-2">
              {project.arquivado ? 'Desarquivar este projeto?' : 'Arquivar este projeto?'}
            </h3>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              {project.arquivado
                ? <>Tem certeza que deseja desarquivar <strong>{project.nome}</strong>? Ele voltará a aparecer na sua lista de projetos ativos.</>
                : <>Tem certeza que deseja arquivar <strong>{project.nome}</strong>? Ele deixará de aparecer no dashboard principal, mas seus dados continuarão salvos.</>
              }
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setIsArchiveModalOpen(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleArchiveProject}
                className="px-5 py-2.5 rounded-xl bg-orange-500 text-white font-bold text-sm hover:bg-orange-600 shadow-md active:scale-95 transition-all"
              >
                {project.arquivado ? 'Sim, Desarquivar' : 'Sim, Arquivar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================= MODAL DE EXCLUSÃO ================================= */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 animate-scale-up text-center shadow-2xl">
            <div className="mx-auto w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-4">
              <Trash2 size={24} />
            </div>
            <h3 className="text-lg font-extrabold text-slate-800 mb-2">Excluir projeto definitivamente?</h3>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              Você está prestes a excluir <strong>{project.nome}</strong> permanentemente. Todas as tarefas, logs e membros serão removidos. <br /><br />Esta ação é irreversível. Deseja continuar?
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteProject}
                className="px-5 py-2.5 rounded-xl bg-rose-600 text-white font-bold text-sm hover:bg-rose-700 shadow-md active:scale-95 transition-all"
              >
                Sim, Excluir Definitivamente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================= MODAL DE CONVITE DE MEMBRO ================================= */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl relative overflow-hidden text-left p-6 md:p-8 animate-scale-up">

            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-extrabold text-brand-700 flex items-center gap-2">
                  <UserPlus size={18} />
                  Convidar Membro
                </h2>
                <p className="text-xs text-slate-400 mt-1">Adicione um novo colega ao projeto.</p>
              </div>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleInviteMember} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  E-mail do Usuário
                </label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="Digite o e-mail do usuário..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all placeholder-slate-400 text-slate-700"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Perfil de Acesso
                </label>
                <select
                  value={invitePerfil}
                  onChange={(e) => setInvitePerfil(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all text-slate-700 appearance-none"
                >
                  <option value="ADMIN">ADMIN</option>
                  <option value="GERENTE">GERENTE</option>
                  <option value="PO">PO</option>
                  <option value="DEV">DEV</option>
                  <option value="TESTER">TESTER</option>
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={invitingMember}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-bold text-sm transition-all shadow-md active:scale-95 flex items-center gap-2 disabled:opacity-50"
                >
                  {invitingMember && <Loader2 size={16} className="animate-spin" />}
                  Convidar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================= MODAL DE REMOÇÃO DE MEMBRO ================================= */}
      {isRemoveMemberModalOpen && memberToRemove && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 animate-scale-up text-center shadow-2xl">
            <div className="mx-auto w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-4">
              <Trash2 size={24} />
            </div>
            <h3 className="text-lg font-extrabold text-slate-800 mb-2">Remover membro do projeto?</h3>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              Tem certeza que deseja remover <strong>{memberToRemove.nome}</strong> do projeto? O membro perderá acesso a todas as tarefas e recursos.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => { setIsRemoveMemberModalOpen(false); setMemberToRemove(null); }}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleRemoveMember}
                className="px-5 py-2.5 rounded-xl bg-rose-600 text-white font-bold text-sm hover:bg-rose-700 shadow-md active:scale-95 transition-all"
              >
                Sim, Remover
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
