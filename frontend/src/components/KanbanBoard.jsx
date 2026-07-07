import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../utils/api.js';
import { socket, joinProjectRoom, leaveProjectRoom } from '../utils/socket.js';
import CardDetailModal from './CardDetailModal.jsx';
import BoardConfigModal from './BoardConfigModal.jsx';
import InviteMemberModal from './InviteMemberModal.jsx';
import ActivityLogsModal from './ActivityLogsModal.jsx';
import RelatoriosPage from './RelatoriosPage.jsx';
import {
  FolderKanban,
  Calendar,
  TrendingUp,
  Settings,
  Plus,
  Search,
  Filter,
  Lock,
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
  ChevronsRight,
  Sliders,
  ChevronLeft,
  ChevronRight,
  History,
  LogOut
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

export default function KanbanBoard({ project, onUpdateProject, userDisplayName, currentUserEmail, onProjectAction, sidebarOpen, setSidebarOpen, onLogout, initialOpenCardId, onClearInitialOpenCardId, setIsBlockingExit }) {
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
                foto: data.foto,
                username: data.username
              }
            };
          } else {
            return {
              ...m,
              nome: data.nome,
              foto: data.foto,
              username: data.username
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
              foto: data.foto,
              username: data.username
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

  // Controle do menu lateral em telas menores (removido do estado local, agora recebido por props)

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

  // Sprint Closing Modal Local State
  const [sprintClosingMoves, setSprintClosingMoves] = useState({}); // { [id_card]: 'left' | 'right' }
  const [isBacklogModalOpen, setIsBacklogModalOpen] = useState(false);
  const [isFinishingSprint, setIsFinishingSprint] = useState(false);
  const [migratedCardIds, setMigratedCardIds] = useState([]);
  const [isClosingFlowStep2, setIsClosingFlowStep2] = useState(false);

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

  useEffect(() => {
    if (setIsBlockingExit) {
      setIsBlockingExit(isClosingFlowStep2 && migratedCardIds.length > 0);
    }
  }, [isClosingFlowStep2, migratedCardIds, setIsBlockingExit]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isClosingFlowStep2 && migratedCardIds.length > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isClosingFlowStep2, migratedCardIds]);

  // Estados do modal de convite
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePerfil, setInvitePerfil] = useState('DEV');
  const [invitingMember, setInvitingMember] = useState(false);

  // --- Customização de Board e Etiquetas ---
  const PRESET_COLORS = [
    "#EF4444", // Vermelho
    "#F59E0B", // Laranja
    "#10B981", // Verde
    "#3B82F6", // Azul
    "#6366F1", // ÍNDIGO
    "#8B5CF6", // Roxo
    "#EC4899", // Rosa
    "#64748B", // Cinza
    "#7C3AED"  // Violeta
  ];

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

  const [newCardEtiquetas, setNewCardEtiquetas] = useState([]);
  const [isBoardConfigModalOpen, setIsBoardConfigModalOpen] = useState(false);
  const [isActivityLogsModalOpen, setIsActivityLogsModalOpen] = useState(false);
  const [boardConfigTab, setBoardConfigTab] = useState('columns'); // 'columns' | 'tags'

  // Colunas states
  const [newColName, setNewColName] = useState('');
  const [newColColor, setNewColColor] = useState('#64748B');
  const [editingColId, setEditingColId] = useState(null);
  const [editingColName, setEditingColName] = useState('');
  const [editingColColor, setEditingColColor] = useState('');

  // Estados para criação e gerenciamento inline de colunas
  const [isCreatingColumnInline, setIsCreatingColumnInline] = useState(false);
  const [inlineColumnName, setInlineColumnName] = useState('');
  const [activeColumnMenu, setActiveColumnMenu] = useState(null);
  const [editingColumnHeaderId, setEditingColumnHeaderId] = useState(null);
  const [editingColumnHeaderName, setEditingColumnHeaderName] = useState('');

  // Etiquetas states
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3B82F6');
  const [editingTagId, setEditingTagId] = useState(null);
  const [editingTagName, setEditingTagName] = useState('');
  const [editingTagColor, setEditingTagColor] = useState('');

  // Estados de filtros estruturados
  const [selectedMemberFilter, setSelectedMemberFilter] = useState('');
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState('');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);

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

  // Card Detail Modal State
  const [selectedCardId, setSelectedCardId] = useState(null);

  // Drag and Drop States
  const [draggedCardId, setDraggedCardId] = useState(null);
  const [dragOverCardId, setDragOverCardId] = useState(null);

  // Auto-open card from notification/external deep link
  useEffect(() => {
    if (initialOpenCardId) {
      setSelectedCardId(initialOpenCardId);
      if (onClearInitialOpenCardId) {
        onClearInitialOpenCardId();
      }
    }
  }, [initialOpenCardId]);

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
          if (res.data.length > 0) {
            return res.data[0].id_sprint;
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

  useEffect(() => {
    if (!project.cards || sprints.length === 0) return;

    setSprints(prevSprints => {
      let changed = false;
      const nextSprints = prevSprints.map(s => {
        if (!s.cards) return s;
        const nextCards = s.cards.map(sc => {
          const found = project.cards.find(pc => pc.id_card === sc.id_card);
          if (found && (found.status !== sc.status || found.id_coluna !== sc.id_coluna || found.story_points !== sc.story_points || found.titulo !== sc.titulo || found.descricao !== sc.descricao)) {
            changed = true;
            return found;
          }
          return sc;
        });
        return { ...s, cards: nextCards };
      });
      return changed ? nextSprints : prevSprints;
    });
  }, [project.cards, sprints.length]);

  const refreshProject = async () => {
    try {
      const res = await api.get(`/api/projetos/${project.id_projeto}`);
      onUpdateProject(res.data);
    } catch (err) {
      console.error('Erro ao atualizar projeto:', err);
    }
  };

  const getNextSprintName = () => {
    let maxNum = 0;
    sprints.forEach(s => {
      const match = s.nome.match(/^Sprint (\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) {
          maxNum = num;
        }
      }
    });
    return `Sprint ${maxNum + 1}`;
  };

  const isOutsideSprintPeriod = () => {
    const activeSprint = sprints.find(s => s.status === 'ATIVA');
    if (!activeSprint) return false;
    if (!activeSprint.data_inicio || !activeSprint.data_fim) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const start = new Date(activeSprint.data_inicio);
    start.setHours(0, 0, 0, 0);

    const end = new Date(activeSprint.data_fim);
    end.setHours(0, 0, 0, 0);

    return today < start || today > end;
  };

  const formatSprintText = (sprint) => {
    if (!sprint) return '';
    if (!sprint.data_inicio || !sprint.data_fim) {
      return `${sprint.nome}${sprint.status === 'ATIVA' ? ' (Atual)' : ''}`;
    }
    // Usar UTC ou o fuso horário local corretamente (evitando mudança de dia por fuso)
    const parseLocalDate = (dateStr) => {
      const parts = dateStr.split('T')[0].split('-');
      return new Date(parts[0], parts[1] - 1, parts[2]);
    };
    const start = parseLocalDate(sprint.data_inicio);
    const end = parseLocalDate(sprint.data_fim);
    
    const pad = (n) => String(n).padStart(2, '0');
    
    const startStr = `${pad(start.getDate())}/${pad(start.getMonth() + 1)}/${String(start.getFullYear()).slice(-2)}`;
    const endStr = `${pad(end.getDate())}/${pad(end.getMonth() + 1)}/${String(end.getFullYear()).slice(-2)}`;
    
    return `${sprint.nome} - ${startStr} a ${endStr}${sprint.status === 'ATIVA' ? ' (Atual)' : ''}`;
  };

  const formatTerminationText = (dateStr) => {
    if (!dateStr) return 'termina hoje';
    
    const parseLocalDate = (dateStr) => {
      const parts = dateStr.split('T')[0].split('-');
      return new Date(parts[0], parts[1] - 1, parts[2]);
    };
    
    const endDate = parseLocalDate(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    if (endDate.getTime() === today.getTime()) {
      return 'termina hoje';
    } else if (endDate.getTime() < today.getTime()) {
      return 'já terminou';
    } else {
      const pad = (n) => String(n).padStart(2, '0');
      const dateFormatted = `${pad(endDate.getDate())}/${pad(endDate.getMonth() + 1)}/${String(endDate.getFullYear()).slice(-2)}`;
      return `termina em ${dateFormatted}`;
    }
  };

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
  const columns = (project.colunas && project.colunas.length > 0)
    ? project.colunas.map(col => {
      const colColors = getColors(col.cor);
      return {
        id: col.id_coluna,
        label: col.nome,
        colorHex: col.cor,
        bg: colColors.bg,
        text: colColors.text,
        border: colColors.border,
      };
    })
    : [
      { id: 'A_FAZER', label: 'A FAZER', colorHex: '#64748B', bg: '#f1f5f9', text: '#334155', border: '#cbd5e1' },
      { id: 'EM_ANDAMENTO', label: 'EM ANDAMENTO', colorHex: '#F59E0B', bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
      { id: 'HOMOLOGACAO', label: 'HOMOLOGAÇÃO', colorHex: '#8B5CF6', bg: '#f3e8ff', text: '#5b21b6', border: '#c084fc' },
      { id: 'CONCLUIDO', label: 'CONCLUÍDO', colorHex: '#10B981', bg: '#d1fae5', text: '#065f46', border: '#6ee7b7' },
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
    if (isOutsideSprintPeriod()) {
      alert("A sprint atual está fora do prazo. Por favor, ajuste as datas ou encerre-a na tela de planejamento.");
      setActiveTab('sprint');
      return;
    }
    const cardId = e.dataTransfer.getData('text/plain');
    if (!cardId) return;

    const cardObj = (project.cards || []).find(c => c.id_card === cardId);
    if (!cardObj || cardObj.id_coluna === targetStatus) return;

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

    // Encontrar status legado correspondente
    const targetColObj = (project.colunas || []).find(c => c.id_coluna === targetStatus);
    let legacyStatus = "A_FAZER";
    if (targetColObj) {
      if (targetColObj.nome === "EM ANDAMENTO") legacyStatus = "EM_ANDAMENTO";
      else if (targetColObj.nome === "HOMOLOGAÇÃO") legacyStatus = "HOMOLOGACAO";
      else if (targetColObj.nome === "CONCLUÍDO") legacyStatus = "CONCLUIDO";
    }

    // Encontrar maxOrdem atual da coluna de destino para manter a ordenação local correta
    const targetColCards = (project.cards || [])
      .filter(c => c.id_coluna === targetStatus && c.id_card !== cardId);
    const maxOrdem = targetColCards.length > 0
      ? Math.max(...targetColCards.map(c => c.ordem || 0))
      : 0;

    // Atualização otimista
    const updatedCards = project.cards.map(card => {
      if (card.id_card === cardId) {
        return {
          ...card,
          id_coluna: targetStatus,
          status: legacyStatus,
          id_responsavel: optimisticResponsavelId,
          responsavel: optimisticResponsavel,
          ordem: maxOrdem + 1,
        };
      }
      return card;
    });

    onUpdateProject({
      ...project,
      cards: updatedCards,
    });

    // Persistir no backend
    api.patch(`/api/cards/${cardId}/status`, { id_coluna: targetStatus })
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

  const handleDropOnCard = (e, targetCardId, targetColumnId) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverCardId(null);

    const cardId = e.dataTransfer.getData('text/plain') || draggedCardId;
    if (!cardId || cardId === targetCardId) return;

    if (isOutsideSprintPeriod()) {
      alert("A sprint atual está fora do prazo. Por favor, ajuste as datas ou encerre-a na tela de planejamento.");
      setActiveTab('sprint');
      return;
    }

    const previousCards = project.cards;

    // 1. Encontrar o card arrastado e o card alvo
    let cards = [...(project.cards || [])];
    const draggedCard = cards.find(c => c.id_card === cardId);
    const targetCard = cards.find(c => c.id_card === targetCardId);
    if (!draggedCard || !targetCard) return;

    // Determinar status legado correspondente
    const targetColObj = (project.colunas || []).find(c => c.id_coluna === targetColumnId);
    let legacyStatus = "A_FAZER";
    if (targetColObj) {
      if (targetColObj.nome === "EM ANDAMENTO") legacyStatus = "EM_ANDAMENTO";
      else if (targetColObj.nome === "HOMOLOGAÇÃO") legacyStatus = "HOMOLOGACAO";
      else if (targetColObj.nome === "CONCLUÍDO") legacyStatus = "CONCLUIDO";
    }

    // Auto-atribuição otimista
    let optimisticResponsavel = draggedCard.responsavel;
    let optimisticResponsavelId = draggedCard.id_responsavel;
    if (!draggedCard.id_responsavel) {
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

    // 2. Filtrar cards na coluna destino excluindo o card arrastado, e ordenar por ordem
    const targetColCards = cards
      .filter(c => c.id_coluna === targetColumnId && c.id_card !== cardId)
      .sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

    // Achar o index do card alvo
    const targetIndex = targetColCards.findIndex(c => c.id_card === targetCardId);
    
    // Inserir o card arrastado no index do card alvo (ficando antes dele)
    const newDraggedCard = {
      ...draggedCard,
      id_coluna: targetColumnId,
      status: legacyStatus,
      id_responsavel: optimisticResponsavelId,
      responsavel: optimisticResponsavel,
    };
    targetColCards.splice(targetIndex, 0, newDraggedCard);

    // 3. Atualizar a ordem (1-indexed) de todos os cards daquela coluna
    const updatedColCards = targetColCards.map((c, index) => ({
      ...c,
      ordem: index + 1,
    }));

    // 4. Montar a lista atualizada de cards do projeto
    const updatedCards = cards.map(c => {
      const foundInUpdated = updatedColCards.find(uc => uc.id_card === c.id_card);
      if (foundInUpdated) {
        return foundInUpdated;
      }
      if (c.id_card === cardId) {
        return newDraggedCard;
      }
      return c;
    });

    onUpdateProject({
      ...project,
      cards: updatedCards,
    });

    // 5. Persistir no backend
    const payload = updatedColCards.map(c => ({
      id_card: c.id_card,
      ordem: c.ordem,
      id_coluna: c.id_coluna,
    }));

    api.patch(`/api/cards/${cardId}/reordenar`, { cards: payload })
      .then(() => {
        // Sucesso silencioso
      })
      .catch(err => {
        console.error('Erro ao persistir reordenação:', err);
        showToast('Erro ao reordenar card.', 'error');
        // Rollback
        onUpdateProject({
          ...project,
          cards: previousCards,
        });
      });
  };

  // Mover cartão via clique (acessibilidade / mobile-friendly)
  const moveCard = (cardId, targetStatus) => {
    if (isOutsideSprintPeriod()) {
      alert("A sprint atual está fora do prazo. Por favor, ajuste as datas ou encerre-a na tela de planejamento.");
      setActiveTab('sprint');
      return;
    }
    const cardObj = (project.cards || []).find(c => c.id_card === cardId);
    if (!cardObj || cardObj.id_coluna === targetStatus) return;

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

    const targetColObj = (project.colunas || []).find(c => c.id_coluna === targetStatus);
    let legacyStatus = "A_FAZER";
    if (targetColObj) {
      if (targetColObj.nome === "EM ANDAMENTO") legacyStatus = "EM_ANDAMENTO";
      else if (targetColObj.nome === "HOMOLOGAÇÃO") legacyStatus = "HOMOLOGACAO";
      else if (targetColObj.nome === "CONCLUÍDO") legacyStatus = "CONCLUIDO";
    }

    const updatedCards = project.cards.map(card => {
      if (card.id_card === cardId) {
        return {
          ...card,
          id_coluna: targetStatus,
          status: legacyStatus,
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
    api.patch(`/api/cards/${cardId}/status`, { id_coluna: targetStatus })
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

    const matchesTag = selectedTag
      ? (
        (card.etiquetas || []).some(e => e.nome === selectedTag) ||
        (card.tags || []).includes(selectedTag)
      )
      : true;

    const matchesSprint = selectedSprintId === 'backlog'
      ? (!card.id_sprint)
      : (card.id_sprint === selectedSprintId);

    const matchesMember = !selectedMemberFilter
      ? true
      : (selectedMemberFilter === 'unassigned'
        ? (!card.id_responsavel && !card.responsavel)
        : (String(card.id_responsavel || card.responsavel?.id_usuario) === String(selectedMemberFilter))
      );

    const matchesPriority = !selectedPriorityFilter
      ? true
      : (card.prioridade === selectedPriorityFilter);

    return matchesSearch && matchesTag && matchesSprint && matchesMember && matchesPriority;
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
        id_responsavel: assignedMember?.id_usuario || null,
        id_sprint: selectedSprintId === 'backlog' ? null : selectedSprintId,
        id_etiquetas: newCardEtiquetas,
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
      setNewCardEtiquetas([]);
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

  // Alternar etiqueta nos inputs de nova atividade
  const toggleFormEtiqueta = (idEtiqueta) => {
    if (newCardEtiquetas.includes(idEtiqueta)) {
      setNewCardEtiquetas([]);
    } else {
      // Selecionar apenas essa (substitui qualquer anterior)
      setNewCardEtiquetas([idEtiqueta]);
    }
  };

  // ================= GERENCIAMENTO DE COLUNAS =================
  const handleCreateColumn = async (e) => {
    e.preventDefault();
    if (!newColName.trim()) return;

    try {
      // Garantir colunas padrão carregadas caso não existam no estado do projeto
      const currentCols = (project.colunas && project.colunas.length > 0)
        ? project.colunas
        : [
          { id_coluna: 'A_FAZER', nome: 'A FAZER', cor: '#64748B' },
          { id_coluna: 'EM_ANDAMENTO', nome: 'EM ANDAMENTO', cor: '#F59E0B' },
          { id_coluna: 'HOMOLOGACAO', nome: 'HOMOLOGAÇÃO', cor: '#8B5CF6' },
          { id_coluna: 'CONCLUIDO', nome: 'CONCLUÍDO', cor: '#10B981' },
        ];

      const res = await api.post(`/api/projetos/${project.id_projeto}/colunas`, {
        nome: newColName.trim().toUpperCase(),
        cor: newColColor
      });

      onUpdateProject({
        ...project,
        colunas: [...currentCols, res.data]
      });

      setNewColName('');
      showToast('Coluna criada com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao criar coluna:', error);
      showToast(error.response?.data?.error || 'Erro ao criar coluna.', 'error');
    }
  };

  const handleCreateColumnInline = async (name) => {
    if (!name.trim()) return;
    try {
      const currentCols = (project.colunas && project.colunas.length > 0)
        ? project.colunas
        : [
          { id_coluna: 'A_FAZER', nome: 'A FAZER', cor: '#64748B' },
          { id_coluna: 'EM_ANDAMENTO', nome: 'EM ANDAMENTO', cor: '#F59E0B' },
          { id_coluna: 'HOMOLOGACAO', nome: 'HOMOLOGAÇÃO', cor: '#8B5CF6' },
          { id_coluna: 'CONCLUIDO', nome: 'CONCLUÍDO', cor: '#10B981' },
        ];

      const res = await api.post(`/api/projetos/${project.id_projeto}/colunas`, {
        nome: name.trim().toUpperCase(),
        cor: '#64748B' // Default Slate color
      });

      onUpdateProject({
        ...project,
        colunas: [...currentCols, res.data]
      });

      setIsCreatingColumnInline(false);
      setInlineColumnName('');
      showToast('Coluna criada com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao criar coluna inline:', error);
      showToast(error.response?.data?.error || 'Erro ao criar coluna.', 'error');
    }
  };

  const handleRenameColumnHeader = async (id, newName, cor) => {
    if (!newName.trim()) return;
    try {
      const currentCols = (project.colunas && project.colunas.length > 0)
        ? project.colunas
        : [
          { id_coluna: 'A_FAZER', nome: 'A FAZER', cor: '#64748B' },
          { id_coluna: 'EM_ANDAMENTO', nome: 'EM ANDAMENTO', cor: '#F59E0B' },
          { id_coluna: 'HOMOLOGACAO', nome: 'HOMOLOGAÇÃO', cor: '#8B5CF6' },
          { id_coluna: 'CONCLUIDO', nome: 'CONCLUÍDO', cor: '#10B981' },
        ];

      const res = await api.put(`/api/colunas/${id}`, {
        nome: newName.trim().toUpperCase(),
        cor: cor || '#64748B'
      });

      onUpdateProject({
        ...project,
        colunas: currentCols.map(c => c.id_coluna === id ? res.data : c)
      });

      setEditingColumnHeaderId(null);
      showToast('Coluna renomeada com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao renomear coluna:', error);
      showToast(error.response?.data?.error || 'Erro ao renomear coluna.', 'error');
    }
  };

  const handleUpdateColumn = async (id) => {
    if (!editingColName.trim()) return;
    try {
      const currentCols = (project.colunas && project.colunas.length > 0)
        ? project.colunas
        : [
          { id_coluna: 'A_FAZER', nome: 'A FAZER', cor: '#64748B' },
          { id_coluna: 'EM_ANDAMENTO', nome: 'EM ANDAMENTO', cor: '#F59E0B' },
          { id_coluna: 'HOMOLOGACAO', nome: 'HOMOLOGAÇÃO', cor: '#8B5CF6' },
          { id_coluna: 'CONCLUIDO', nome: 'CONCLUÍDO', cor: '#10B981' },
        ];

      const res = await api.put(`/api/colunas/${id}`, {
        nome: editingColName.trim().toUpperCase(),
        cor: editingColColor
      });

      onUpdateProject({
        ...project,
        colunas: currentCols.map(c => c.id_coluna === id ? res.data : c)
      });

      setEditingColId(null);
      showToast('Coluna atualizada com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao atualizar coluna:', error);
      showToast(error.response?.data?.error || 'Erro ao atualizar coluna.', 'error');
    }
  };

  const handleMoveColumn = async (colId, direction) => {
    const cols = [...(project.colunas || [])];
    const index = cols.findIndex(c => c.id_coluna === colId);
    if (index === -1) return;

    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= cols.length) return;

    // Swap
    const temp = cols[index];
    cols[index] = cols[targetIndex];
    cols[targetIndex] = temp;

    // Atualização otimista do estado
    onUpdateProject({
      ...project,
      colunas: cols
    });

    try {
      await api.put(`/api/projetos/${project.id_projeto}/colunas/reordenar`, {
        idsColunas: cols.map(c => c.id_coluna)
      });
    } catch (error) {
      console.error('Erro ao reordenar colunas:', error);
      showToast('Erro ao salvar nova ordem das colunas.', 'error');
    }
  };

  const handleDeleteColumn = async (colId) => {
    try {
      await api.delete(`/api/colunas/${colId}`);
      onUpdateProject({
        ...project,
        colunas: (project.colunas || []).filter(c => c.id_coluna !== colId)
      });
      showToast('Coluna excluída com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao excluir coluna:', error);
      showToast(error.response?.data?.error || 'Erro ao excluir coluna.', 'error');
    }
  };

  // ================= GERENCIAMENTO DE ETIQUETAS =================
  const handleCreateTag = async (e) => {
    e.preventDefault();
    if (!newTagName.trim()) return;

    try {
      const res = await api.post(`/api/projetos/${project.id_projeto}/etiquetas`, {
        nome: newTagName.trim().toUpperCase(),
        cor: newTagColor
      });

      onUpdateProject({
        ...project,
        etiquetas: [...(project.etiquetas || []), res.data]
      });

      setNewTagName('');
      showToast('Etiqueta criada com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao criar etiqueta:', error);
      showToast(error.response?.data?.error || 'Erro ao criar etiqueta.', 'error');
    }
  };

  const handleUpdateTag = async (id) => {
    if (!editingTagName.trim()) return;
    try {
      const res = await api.put(`/api/etiquetas/${id}`, {
        nome: editingTagName.trim().toUpperCase(),
        cor: editingTagColor
      });

      onUpdateProject({
        ...project,
        etiquetas: (project.etiquetas || []).map(et => et.id_etiqueta === id ? res.data : et),
        cards: (project.cards || []).map(card => ({
          ...card,
          etiquetas: (card.etiquetas || []).map(et => et.id_etiqueta === id ? res.data : et)
        }))
      });

      setEditingTagId(null);
      showToast('Etiqueta atualizada com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao atualizar etiqueta:', error);
      showToast(error.response?.data?.error || 'Erro ao atualizar etiqueta.', 'error');
    }
  };

  const handleDeleteTag = async (id) => {
    try {
      await api.delete(`/api/etiquetas/${id}`);
      onUpdateProject({
        ...project,
        etiquetas: (project.etiquetas || []).filter(et => et.id_etiqueta !== id),
        cards: (project.cards || []).map(card => ({
          ...card,
          etiquetas: (card.etiquetas || []).filter(et => et.id_etiqueta !== id)
        }))
      });
      showToast('Etiqueta excluída com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao excluir etiqueta:', error);
      showToast('Erro ao excluir etiqueta.', 'error');
    }
  };

  const handleNewActivityClick = () => {
    const hasActiveSprint = sprints.some(s => s.status === 'ATIVA');
    if (!hasActiveSprint) {
      alert("Você precisa ter uma sprint ativa para criar uma atividade. Redirecionando para a tela de criação de sprint.");
      setActiveTab('sprint');
      return;
    }
    if (isOutsideSprintPeriod()) {
      alert("A sprint atual está fora do prazo. Por favor, ajuste as datas ou encerre-a na tela de planejamento.");
      setActiveTab('sprint');
      return;
    }
    setIsNewCardModalOpen(true);
  };

  // ================= GERENCIAMENTO DE SPRINTS =================
  const handleCreateSprint = async (e) => {
    e.preventDefault();
    const generatedName = getNextSprintName();

    if (newSprintDataInicio && newSprintDataFim) {
      if (new Date(newSprintDataFim) < new Date(newSprintDataInicio)) {
        showToast('A data de término não pode ser anterior à data de início.', 'error');
        return;
      }
    }

    setCreatingSprint(true);
    try {
      const res = await api.post(`/api/projetos/${project.id_projeto}/sprints`, {
        nome: generatedName,
        data_inicio: newSprintDataInicio || null,
        data_fim: newSprintDataFim || null,
        objetivo: newSprintObjetivo || null,
      });

      const createdSprint = res.data;
      const hasActive = sprints.some(s => s.status === 'ATIVA');
      let finalSprint = createdSprint;

      if (!hasActive) {
        const startRes = await api.patch(`/api/sprints/${createdSprint.id_sprint}/iniciar`);
        finalSprint = startRes.data;
        showToast(`Sprint criada e iniciada automaticamente como ${generatedName}!`, 'success');
        setSelectedSprintId(finalSprint.id_sprint);
      } else {
        showToast(`Sprint ${generatedName} planejada com sucesso!`, 'success');
      }

      if (migratedCardIds.length > 0) {
        await api.post(`/api/sprints/${finalSprint.id_sprint}/migrar-cards`, { cardIds: migratedCardIds });
        setMigratedCardIds([]);
      }

      setSprints(prev => [...prev.filter(s => s.id_sprint !== finalSprint.id_sprint), finalSprint]);

      setNewSprintNome('');
      setNewSprintDataInicio('');
      setNewSprintDataFim('');
      setNewSprintObjetivo('');

      await refreshProject();
      alert("Sprint criada com sucesso!");
      setIsClosingFlowStep2(false);
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

      await refreshProject();
      setActiveTab('board');
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.error || 'Erro ao iniciar sprint.', 'error');
    }
  };

  const handleFinishSprintAction = async (activeSprint, nextSprint, unfinishedCards, nextSprintCards) => {
    setIsFinishingSprint(true);
    try {
      // 1. Determine moves based on local state
      let rightCardIds = nextSprintCards.filter(c => sprintClosingMoves[c.id_card] !== 'left').map(c => c.id_card);
      rightCardIds = [...rightCardIds, ...unfinishedCards.filter(c => sprintClosingMoves[c.id_card] === 'right').map(c => c.id_card)];

      let leftCardIds = unfinishedCards.filter(c => sprintClosingMoves[c.id_card] !== 'right').map(c => c.id_card);
      leftCardIds = [...leftCardIds, ...nextSprintCards.filter(c => sprintClosingMoves[c.id_card] === 'left').map(c => c.id_card)];

      // 2. Execute migrations
      if (rightCardIds.length > 0 && nextSprint) {
        await api.post(`/api/sprints/${nextSprint.id_sprint}/migrar-cards`, { cardIds: rightCardIds });
      }
      if (leftCardIds.length > 0) {
        await api.post(`/api/sprints/null/migrar-cards`, { cardIds: leftCardIds, idProjeto: project.id_projeto });
      }

      // 3. Finish active sprint
      const res = await api.patch(`/api/sprints/${activeSprint.id_sprint}/finalizar`);
      setSprints(prev => prev.map(s => s.id_sprint === activeSprint.id_sprint ? res.data : s));
      
      setSprintClosingMoves({});
      setIsBacklogModalOpen(false);
      showToast('Sprint concluída com sucesso!', 'success');

      // Pré-definir data de início para hoje
      const todayStr = new Date().toISOString().split('T')[0];
      setNewSprintDataInicio(todayStr);

      await refreshProject();
      fetchSprints();
      setIsClosingFlowStep2(true);
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.error || 'Erro ao finalizar sprint.', 'error');
    } finally {
      setIsFinishingSprint(false);
    }
  };

  const handleFinishSprint = async (sprintId) => {
    try {
      const res = await api.patch(`/api/sprints/${sprintId}/finalizar`);
      setSprints(prev => prev.map(s => s.id_sprint === sprintId ? res.data : s));
      showToast('Sprint concluída com sucesso!', 'success');

      const todayStr = new Date().toISOString().split('T')[0];
      setNewSprintDataInicio(todayStr);

      await refreshProject();
      fetchSprints();
      setIsClosingFlowStep2(true);
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

  const colunasList = (project.colunas && project.colunas.length > 0)
    ? project.colunas
    : [
      { id_coluna: 'A_FAZER', nome: 'A FAZER', cor: '#64748B' },
      { id_coluna: 'EM_ANDAMENTO', nome: 'EM ANDAMENTO', cor: '#F59E0B' },
      { id_coluna: 'HOMOLOGACAO', nome: 'HOMOLOGAÇÃO', cor: '#8B5CF6' },
      { id_coluna: 'CONCLUIDO', nome: 'CONCLUÍDO', cor: '#10B981' },
    ];

  return (
    <div className="flex flex-col md:flex-row flex-grow md:h-full md:overflow-hidden -mx-6 md:-mx-8 relative">

      {/* Toast Notifications */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* ================= 1. MENU LATERAL (SIDEBAR) ================= */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 pt-20 px-4 flex flex-col justify-between transition-transform duration-300 ease-in-out
        md:translate-x-0 md:static md:h-full md:pt-6
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="space-y-6">

          {/* Links do Menu */}
          <nav className="space-y-1.5 text-left">
            <button
              onClick={() => {
                if (isClosingFlowStep2 && migratedCardIds.length > 0) {
                  showToast("Você possui cards pendentes a serem migrados. Crie a próxima sprint para concluir a transição.", "error");
                  return;
                }
                setActiveTab('board');
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-bold border-l-4 transition-all ${activeTab === 'board'
                ? 'bg-brand-50 text-brand-700 shadow-sm border-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}
            >
              <FolderKanban size={18} />
              <span className="whitespace-nowrap">Painel de Tarefas</span>
            </button>

            <button
              onClick={() => {
                if (isClosingFlowStep2 && migratedCardIds.length > 0) {
                  showToast("Você possui cards pendentes a serem migrados. Crie a próxima sprint para concluir a transição.", "error");
                  return;
                }
                setActiveTab('sprint');
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-bold border-l-4 transition-all ${activeTab === 'sprint'
                ? 'bg-brand-50 text-brand-700 shadow-sm border-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}
            >
              <Calendar size={18} />
              <span className="whitespace-nowrap">Planejamento de Sprint</span>
            </button>

            <button
              onClick={() => {
                if (isClosingFlowStep2 && migratedCardIds.length > 0) {
                  showToast("Você possui cards pendentes a serem migrados. Crie a próxima sprint para concluir a transição.", "error");
                  return;
                }
                setActiveTab('metrics');
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-bold border-l-4 transition-all ${activeTab === 'metrics'
                ? 'bg-brand-50 text-brand-700 shadow-sm border-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}
            >
              <TrendingUp size={18} />
              <span className="whitespace-nowrap">Métricas</span>
            </button>

            <button
              onClick={() => {
                if (isClosingFlowStep2 && migratedCardIds.length > 0) {
                  showToast("Você possui cards pendentes a serem migrados. Crie a próxima sprint para concluir a transição.", "error");
                  return;
                }
                setActiveTab('settings');
                setSidebarOpen(false);
              }}
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
        <div className="border-t border-slate-100 py-4 text-left space-y-3.5">
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
      <main className={`flex-1 p-6 md:p-8 flex flex-col bg-slate-50 h-full overflow-x-auto min-h-0 text-left ${activeTab === 'board' ? 'overflow-y-hidden' : 'overflow-y-auto'}`}>

        {activeTab === 'board' ? (
          <>
            {/* ================= BARRA DE FERRAMENTAS / TOOLBAR ================= */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 md:py-4.5 md:px-6 shadow-sm mb-6 flex flex-wrap items-center gap-4 w-full">

              {/* Lista de Membros do Projeto */}
              <div className="flex items-center shrink-0">
                <div className="flex -space-x-2.5">
                  {members.slice(0, 4).map((member, i) => (
                    <AvatarWithFallback
                      key={member.id_usuario || i}
                      nome={member.nome}
                      foto={member.foto}
                      title={`${member.nome} (${member.perfil})`}
                      className="w-9 h-9 rounded-full border-2 border-white object-cover shadow-sm"
                    />
                  ))}
                  {members.length > 4 && (
                    <div className="w-9 h-9 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-xs font-extrabold text-slate-600 shadow-sm shrink-0">
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
                  className="ml-3 p-2 rounded-xl border border-dashed border-slate-300 text-slate-400 hover:text-[#320066] hover:border-brand-500 transition-colors"
                  title="Adicionar Membro"
                >
                  <UserPlus size={16} />
                </button>
              </div>

              <div className="hidden md:block h-8 w-px bg-slate-200 shrink-0" />

              {/* Filtros de Tags com Scroll Horizontal e Botão de Gerenciamento */}
              <div className="flex-1 min-w-0 flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth">
                {(project.etiquetas && project.etiquetas.length > 0) ? (
                  project.etiquetas.map(et => {
                    const isSelected = selectedTag === et.nome;
                    return (
                      <button
                        key={et.id_etiqueta}
                        onClick={() => setSelectedTag(selectedTag === et.nome ? '' : et.nome)}
                        className={`px-3.5 py-2 rounded-xl font-bold text-xs border transition-all active:scale-95 shrink-0 ${
                          isSelected
                            ? 'bg-[#320066] border-[#320066] text-white shadow-sm'
                            : 'bg-[#EAECEF] border-transparent text-[#475569] hover:bg-[#DEE2E6]'
                        }`}
                      >
                        {et.nome}
                      </button>
                    );
                  })
                ) : (
                  ['FRONTEND', 'DESIGN', 'BACKEND', 'DEVOPS'].map(tag => (
                    <button
                      key={tag}
                      onClick={() => setSelectedTag(selectedTag === tag ? '' : tag)}
                      className={`px-3.5 py-2 rounded-xl font-bold text-xs border transition-all active:scale-95 shrink-0 ${
                        selectedTag === tag
                          ? 'bg-[#320066] border-[#320066] text-white shadow-sm'
                          : 'bg-[#EAECEF] border-transparent text-[#475569] hover:bg-[#DEE2E6]'
                      }`}
                    >
                      {tag}
                    </button>
                  ))
                )}

                {/* Botão de Adicionar/Gerenciar Etiquetas ao fim da lista */}
                {isManager && (
                  <button
                    onClick={() => {
                      setBoardConfigTab('tags');
                      setIsBoardConfigModalOpen(true);
                    }}
                    className="px-3.5 py-2 rounded-xl border border-dashed border-slate-300 text-slate-400 hover:text-[#320066] hover:border-brand-500 transition-colors flex items-center gap-1.5 shrink-0 bg-white text-xs font-bold"
                    title="Nova Etiqueta"
                  >
                    <Plus size={13} />
                    <span>Nova Etiqueta</span>
                  </button>
                )}
              </div>

              <div className="hidden md:block h-8 w-px bg-slate-200 shrink-0" />

              {/* Dropdown de Sprint ou Botão Criar Sprint */}
              {sprints.length === 0 ? (
                <button
                  onClick={() => setActiveTab('sprint')}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#320066] hover:bg-[#26004d] text-white font-bold text-xs border border-[#26004d] transition-all active:scale-95 uppercase tracking-wide shadow-sm shrink-0 w-36 sm:w-44"
                >
                  <Plus size={14} className="shrink-0" />
                  <span className="truncate">Criar Sprint</span>
                </button>
              ) : (
                <div className="relative shrink-0 w-full sm:w-44">
                  <button
                    onClick={() => setSprintDropdownOpen(!sprintDropdownOpen)}
                    className="flex items-center justify-between w-full gap-2 px-4 py-2.5 rounded-xl bg-[#320066] hover:bg-[#26004d] text-white font-bold text-xs border border-[#26004d] transition-all active:scale-95 uppercase tracking-wide shadow-sm"
                  >
                    <span className="truncate">
                      {selectedSprintId === 'backlog' ? 'BACKLOG' : formatSprintText(sprints.find(s => s.id_sprint === selectedSprintId))}
                    </span>
                    <ChevronDown size={12} className={`transition-transform duration-200 shrink-0 ${sprintDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
 
                  {sprintDropdownOpen && (
                    <div className="absolute right-0 lg:left-0 mt-1.5 w-64 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-30 text-left animate-fade-in">
                      {sprints.map((sprint) => (
                        <button
                          key={sprint.id_sprint}
                          onClick={() => {
                            setSelectedSprintId(sprint.id_sprint);
                            setSprintDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs font-semibold hover:bg-slate-50 transition-colors ${selectedSprintId === sprint.id_sprint ? 'text-[#320066] bg-brand-50/50' : 'text-slate-700'
                            }`}
                        >
                          {formatSprintText(sprint)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="hidden md:block h-8 w-px bg-slate-200 shrink-0" />

              {/* Grupo de Pesquisa + Filtros e Ações */}
              <div className="flex flex-row items-center gap-2 flex-1 min-w-[280px] sm:flex-initial">
                {/* Campo de Pesquisa */}
                <div className="relative flex-1 min-w-[120px] sm:w-48 sm:flex-none">
                  <Search className="absolute left-3.5 top-3.5 text-slate-400" size={15} />
                  <input
                    type="text"
                    placeholder="Pesquisar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-xs focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all placeholder-slate-400"
                  />
                </div>

                {/* Filtros e customização */}
                <div className="flex items-center gap-1.5 shrink-0 relative">
                  <button
                    onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                    className={`p-2.5 border rounded-xl transition-colors shrink-0 flex items-center gap-1.5 ${
                      isFilterDropdownOpen || selectedMemberFilter || selectedPriorityFilter
                        ? 'bg-[#320066]/10 border-brand-500 text-brand-700 font-bold'
                        : 'text-slate-500 hover:text-[#320066] hover:bg-slate-100 border-slate-200'
                    }`}
                    title="Filtrar Atividades"
                  >
                    <Filter size={16} />
                    {(selectedMemberFilter || selectedPriorityFilter) && (
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-600 animate-pulse" />
                    )}
                  </button>

                  {isFilterDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-20"
                        onClick={() => setIsFilterDropdownOpen(false)}
                      />
                      <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 z-30 animate-fade-in text-slate-700 text-left">
                        <h4 className="text-xs font-bold text-[#320066] uppercase tracking-wider mb-3">Filtrar Atividades</h4>
                        
                        <div className="space-y-3.5">
                          {/* Filtro por Responsável */}
                          <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase">Responsável</label>
                            <select
                              value={selectedMemberFilter}
                              onChange={(e) => setSelectedMemberFilter(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-brand-500 text-slate-700 font-semibold"
                            >
                              <option value="">Todos</option>
                              <option value="unassigned">Sem responsável</option>
                              {members.map(m => (
                                <option key={m.id_usuario} value={m.id_usuario}>
                                  {m.nome}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Filtro por Prioridade */}
                          <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase">Prioridade</label>
                            <select
                              value={selectedPriorityFilter}
                              onChange={(e) => setSelectedPriorityFilter(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-brand-500 text-slate-700 font-semibold"
                            >
                              <option value="">Todas</option>
                              <option value="ALTA">Alta</option>
                              <option value="MEDIA">Média</option>
                              <option value="BAIXA">Baixa</option>
                            </select>
                          </div>

                          {/* Botão de Limpar */}
                          {(selectedMemberFilter || selectedPriorityFilter || selectedTag || searchTerm) ? (
                            <button
                              onClick={() => {
                                setSelectedMemberFilter('');
                                setSelectedPriorityFilter('');
                                setSelectedTag('');
                                setSearchTerm('');
                                setIsFilterDropdownOpen(false);
                              }}
                              className="w-full text-center py-2 bg-slate-100 hover:bg-slate-200 text-slate-655 rounded-xl text-xs font-bold transition-all"
                            >
                              Limpar Filtros
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </>
                  )}

                  <button
                    onClick={() => setIsActivityLogsModalOpen(true)}
                    className="p-2.5 text-slate-500 hover:text-[#320066] hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors shrink-0"
                    title="Histórico de Atividades do Quadro"
                  >
                    <History size={16} />
                  </button>

                  <button
                    onClick={() => setIsBoardConfigModalOpen(true)}
                    className="p-2.5 text-slate-500 hover:text-[#320066] hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors shrink-0"
                    title="Configurar Quadro (Colunas e Etiquetas)"
                  >
                    <Sliders size={16} />
                  </button>
                </div>
              </div>

            </div>

            {/* ================= QUADRO KANBAN ================= */}
            <div className="flex-1 flex gap-5 items-stretch select-none pb-6 overflow-x-auto min-h-0">

              {/* Loop pelas colunas do Kanban */}
              {columns.map(col => {
                const columnCards = filteredCards.filter(card => {
                  if (card.id_coluna) return card.id_coluna === col.id;

                  let mappedStatus = col.id;
                  if (col.label === "A FAZER") mappedStatus = "A_FAZER";
                  else if (col.label === "EM ANDAMENTO") mappedStatus = "EM_ANDAMENTO";
                  else if (col.label === "HOMOLOGAÇÃO") mappedStatus = "HOMOLOGACAO";
                  else if (col.label === "CONCLUÍDO") mappedStatus = "CONCLUIDO";

                  return card.status === mappedStatus;
                });

                return (
                  <div
                    key={col.id}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, col.id)}
                    className="flex flex-col bg-slate-100 border border-slate-200/60 rounded-2xl w-64 p-4 shrink-0 shadow-sm h-full min-h-0"
                  >
                    {/* Header da Coluna */}
                    <div className="flex items-center justify-between mb-4 relative">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: col.colorHex || '#64748B' }}
                        />
                        {editingColumnHeaderId === col.id ? (
                          <input
                            type="text"
                            autoFocus
                            value={editingColumnHeaderName}
                            onChange={(e) => setEditingColumnHeaderName(e.target.value)}
                            onBlur={() => handleRenameColumnHeader(col.id, editingColumnHeaderName, col.colorHex)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRenameColumnHeader(col.id, editingColumnHeaderName, col.colorHex);
                              if (e.key === 'Escape') setEditingColumnHeaderId(null);
                            }}
                            className="bg-white border border-slate-350 rounded px-1.5 py-0.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-brand-500 w-full"
                          />
                        ) : (
                          <span
                            className="font-extrabold text-sm text-slate-800 tracking-tight cursor-pointer hover:text-[#320066] truncate"
                            onDoubleClick={() => {
                              if (isManager) {
                                setEditingColumnHeaderId(col.id);
                                setEditingColumnHeaderName(col.label);
                              }
                            }}
                            title="Clique duas vezes para renomear"
                          >
                            {col.label}
                          </span>
                        )}
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 shrink-0">
                          {columnCards.length}
                        </span>
                      </div>

                      {/* Botão de Opções da Coluna */}
                      {isManager && (
                        <div className="relative shrink-0">
                          <button
                            onClick={() => setActiveColumnMenu(activeColumnMenu === col.id ? null : col.id)}
                            className="text-slate-400 text-sm font-bold cursor-pointer hover:text-slate-650 px-1 py-0.5 rounded hover:bg-slate-200 transition-colors"
                          >
                            •••
                          </button>

                          {/* Menu Dropdown de Ações da Coluna */}
                          {activeColumnMenu === col.id && (
                            <>
                              <div
                                className="fixed inset-0 z-10"
                                onClick={() => setActiveColumnMenu(null)}
                              />
                              <div className="absolute right-0 mt-1 w-40 bg-white border border-slate-250 rounded-xl shadow-lg py-1.5 z-20 text-left animate-fade-in text-slate-700">
                                <button
                                  onClick={() => {
                                    setEditingColumnHeaderId(col.id);
                                    setEditingColumnHeaderName(col.label);
                                    setActiveColumnMenu(null);
                                  }}
                                  className="w-full text-left px-3.5 py-2 text-xs font-bold hover:bg-slate-50 transition-colors flex items-center gap-2"
                                >
                                  Renomear
                                </button>
                                <button
                                  onClick={() => {
                                    handleMoveColumn(col.id, 'left');
                                    setActiveColumnMenu(null);
                                  }}
                                  className="w-full text-left px-3.5 py-2 text-xs font-bold hover:bg-slate-50 transition-colors flex items-center gap-2"
                                >
                                  Mover Esquerda
                                </button>
                                <button
                                  onClick={() => {
                                    handleMoveColumn(col.id, 'right');
                                    setActiveColumnMenu(null);
                                  }}
                                  className="w-full text-left px-3.5 py-2 text-xs font-bold hover:bg-slate-50 transition-colors flex items-center gap-2"
                                >
                                  Mover Direita
                                </button>
                                <div className="border-t border-slate-100 my-1" />
                                {!['A FAZER', 'EM ANDAMENTO', 'HOMOLOGAÇÃO', 'CONCLUÍDO'].includes(col.label) && (
                                  <button
                                    onClick={() => {
                                      handleDeleteColumn(col.id);
                                      setActiveColumnMenu(null);
                                    }}
                                    className="w-full text-left px-3.5 py-2 text-xs font-bold hover:bg-slate-50 hover:text-rose-600 text-rose-500 transition-colors flex items-center gap-2"
                                  >
                                    Excluir Coluna
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Botão Nova Atividade na primeira coluna */}
                    {col.id === columns[0]?.id && (
                      <button
                        onClick={handleNewActivityClick}
                        className="mb-4 w-full flex items-center justify-center gap-2 bg-[#320066] hover:bg-[#26004d] text-white font-extrabold text-xs py-3 rounded-xl transition-all shadow-md shadow-brand-500/10 active:scale-[0.98]"
                      >
                        <Plus size={16} />
                        Nova Atividade
                      </button>
                    )}

                    {/* Área de rolagem dos cartões na coluna */}
                    <div className="space-y-3 flex-1 overflow-y-auto pr-1 min-h-0 no-scrollbar">
                      {columnCards.length > 0 ? (
                        columnCards.map(card => {
                          const isAlta = card.prioridade === 'ALTA';
                          const isMedia = card.prioridade === 'MEDIA';
                          const isBaixa = card.prioridade === 'BAIXA';

                          return (
                            <div
                              key={card.id_card}
                              draggable
                              onDragStart={(e) => {
                                handleDragStart(e, card.id_card);
                                setDraggedCardId(card.id_card);
                              }}
                              onDragEnd={(e) => {
                                handleDragEnd(e);
                                setDraggedCardId(null);
                              }}
                              onDragOver={(e) => {
                                e.preventDefault();
                                if (draggedCardId && draggedCardId !== card.id_card) {
                                  setDragOverCardId(card.id_card);
                                }
                              }}
                              onDragLeave={() => {
                                setDragOverCardId(null);
                              }}
                              onDrop={(e) => {
                                setDragOverCardId(null);
                                handleDropOnCard(e, card.id_card, col.id);
                              }}
                              onClick={() => {
                                if (isOutsideSprintPeriod()) {
                                  alert("A sprint atual está fora do prazo. Por favor, ajuste as datas ou encerre-a na tela de planejamento.");
                                  setActiveTab('sprint');
                                  return;
                                }
                                setSelectedCardId(card.id_card);
                              }}
                              className={`group bg-white border border-slate-200 rounded-xl p-4 text-left shadow-sm hover:shadow-md hover:border-brand-300 cursor-pointer active:cursor-grabbing transition-all duration-200 relative border-l-4 ${
                                dragOverCardId === card.id_card ? 'border-t-4 border-t-[#320066]' : ''
                              }`}
                              style={{ borderLeftColor: col.colorHex || '#64748b' }}
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
                                {card.em_risco && (
                                  <AlertTriangle 
                                    size={14} 
                                    className="text-orange-500 animate-pulse shrink-0" 
                                    title="Atraso Sinalizado" 
                                  />
                                )}
                              </div>

                              {/* Título do Card */}
                              <h4 className="font-extrabold text-sm text-slate-800 leading-snug group-hover:text-brand-700 transition-colors">
                                {card.titulo}
                              </h4>

                               {/* Divisor */}
                              <div className="my-3 border-t border-slate-100" />

                              {/* Rodapé do Card */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {/* Avatar do responsável */}
                                  {card.responsavel && (
                                    <div className="flex -space-x-1.5">
                                      <AvatarWithFallback
                                        nome={card.responsavel.nome}
                                        foto={card.responsavel.foto}
                                        title={card.responsavel.nome}
                                        className="w-6 h-6 rounded-full border border-white bg-slate-50"
                                      />
                                    </div>
                                  )}

                                  {/* Etiquetas do Card (limite a 1) */}
                                  {((card.etiquetas && card.etiquetas.length > 0) || (card.tags && card.tags.length > 0)) && (
                                    <span className="text-[9px] font-bold bg-[#EAECEF] text-[#475569] px-2 py-0.5 rounded border border-transparent truncate max-w-[120px]">
                                      {card.etiquetas && card.etiquetas.length > 0 ? card.etiquetas[0].nome : card.tags[0]}
                                    </span>
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
              {isManager && (
                <div className="w-64 shrink-0 flex flex-col items-stretch">
                  {isCreatingColumnInline ? (
                    <div className="flex flex-col bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 flex-1 min-h-[200px]">
                      <input
                        type="text"
                        autoFocus
                        placeholder="Nome da coluna..."
                        value={inlineColumnName}
                        onChange={(e) => setInlineColumnName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleCreateColumnInline(inlineColumnName);
                          if (e.key === 'Escape') {
                            setIsCreatingColumnInline(false);
                            setInlineColumnName('');
                          }
                        }}
                        className="w-full bg-white border border-slate-300 rounded-xl py-2 px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:border-brand-500"
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => {
                            setIsCreatingColumnInline(false);
                            setInlineColumnName('');
                          }}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 font-bold text-[10px]"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => handleCreateColumnInline(inlineColumnName)}
                          className="px-3 py-1.5 rounded-lg bg-[#320066] hover:bg-[#26004d] text-white font-bold text-[10px] shadow-sm"
                        >
                          Confirmar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => setIsCreatingColumnInline(true)}
                      className="flex flex-col border border-dashed border-slate-300 rounded-2xl w-full flex-1 min-h-[150px] items-center justify-center text-slate-400 hover:border-brand-500 hover:text-brand-600 transition-all cursor-pointer bg-white/30 hover:bg-white/50 select-none animate-fade-in"
                    >
                      <Plus size={20} className="mb-1" />
                      <span className="font-extrabold text-xs tracking-wider uppercase">Nova Coluna</span>
                    </div>
                  )}
                </div>
              )}

            </div>
          </>
        ) : activeTab === 'sprint' ? (
          /* ================= TELA PLANEJAMENTO DE SPRINT E CICLOS ================= */
          (() => {
            const activeSprint = sprints.find(s => s.status === 'ATIVA');
            const plannedSprint = sprints.find(s => s.status === 'PLANEJAMENTO');
            const showClosingFlow = activeSprint || isClosingFlowStep2;

            return (
              <div className="flex flex-col w-full text-left">
                {/* Header da Tela */}
                <div className="text-left mb-6 md:mb-8">
                  <h1 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                    <FolderKanban className="text-[#320066]" size={24} />
                    Planejamento de Sprint e Ciclos
                  </h1>
                  <p className="text-slate-400 text-xs mt-1">Gerencie a velocidade da sua engenharia. Inicialize novos ciclos e realize transições limpas entre sprints com a transferência automática de trabalhos incompletos.</p>
                </div>

                {/* Grid Principal */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left items-stretch">
                  
                  {showClosingFlow ? (
                    // Caso haja sprint ativa ou estejamos no passo 2 do encerramento (migração ativa):
                    // Coluna da Esquerda (lg:col-span-2): Encerrar Sprint
                    // Coluna da Direita (lg:col-span-1): Criar Sprint
                    <>
                      {/* Esquerda: Encerrar Sprint */}
                      <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm min-h-[520px] flex flex-col justify-between h-full">
                        {activeSprint ? (() => {
                          const unfinishedCards = (activeSprint.cards || []).filter(c => c.status !== 'CONCLUIDO' && c.id_coluna !== 'CONCLUIDO');
                          const finishedCards = (activeSprint.cards || []).filter(c => c.status === 'CONCLUIDO' || c.id_coluna === 'CONCLUIDO');

                          return (
                            <div className="flex flex-col h-full justify-between gap-6">
                              <div>
                                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                                  <Archive className="text-[#320066]" size={20} />
                                  <h2 className="text-md font-extrabold text-slate-800 uppercase tracking-wider">Encerrar Sprint</h2>
                                </div>
                                <p className="text-slate-500 text-xs mt-0.5 mb-2">A {activeSprint.nome} {formatTerminationText(activeSprint.data_fim)}. Escolha quais tarefas pendentes serão migradas para a próxima sprint.</p>

                                <div className="flex flex-col md:flex-row items-stretch gap-4 mt-4">
                                  {/* Coluna Sprint Atual */}
                                  <div className="flex-1 bg-slate-50/50 border border-slate-200/60 rounded-xl p-4 flex flex-col min-h-[380px]">
                                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-rose-600 uppercase tracking-wide mb-3">
                                      <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
                                      {activeSprint.nome} (Atual) - Pendentes
                                    </span>
                                    <div className="space-y-2 overflow-y-auto pr-1 flex-1 max-h-[340px] flex flex-col">
                                      {unfinishedCards.filter(c => !migratedCardIds.includes(c.id_card)).map(card => (
                                        <div key={card.id_card} onClick={() => setMigratedCardIds(prev => [...prev, card.id_card])} className="bg-white border border-slate-200/80 rounded-lg p-2.5 shadow-sm text-xs text-left cursor-pointer hover:border-blue-300 transition-colors">
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
                                      {unfinishedCards.filter(c => !migratedCardIds.includes(c.id_card)).length === 0 && (
                                        <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 py-8">
                                          <Calendar size={20} className="mb-1" />
                                          <p className="text-[10px] font-semibold">Nenhum card pendente nesta sprint</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Botão de Migração */}
                                  <div className="flex flex-row md:flex-col items-center justify-center gap-2 shrink-0 self-center">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const unmigrated = unfinishedCards.filter(c => !migratedCardIds.includes(c.id_card)).map(c => c.id_card);
                                        setMigratedCardIds(prev => [...prev, ...unmigrated]);
                                      }}
                                      disabled={unfinishedCards.filter(c => !migratedCardIds.includes(c.id_card)).length === 0}
                                      className="p-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-600 rounded-full transition-all hover:scale-105 active:scale-95 flex flex-col items-center gap-0.5 shadow-sm font-bold"
                                      title="Migrar todas para a próxima sprint"
                                    >
                                      <ChevronsRight size={18} />
                                      <span className="text-[8px] font-extrabold uppercase tracking-wider">MIGRAR</span>
                                    </button>
                                  </div>

                                  {/* Coluna Sprint Próxima */}
                                  <div className="flex-1 bg-slate-50/50 border border-slate-200/60 rounded-xl p-4 flex flex-col min-h-[380px]">
                                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-blue-600 uppercase tracking-wide mb-3">
                                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                                      Próxima Sprint - A Migrar
                                    </span>
                                    <div className="space-y-2 overflow-y-auto pr-1 flex-1 max-h-[340px] flex flex-col">
                                      {migratedCardIds.length > 0 ? (
                                        unfinishedCards.filter(c => migratedCardIds.includes(c.id_card)).map(card => (
                                          <div key={card.id_card} onClick={() => setMigratedCardIds(prev => prev.filter(id => id !== card.id_card))} className="bg-white border border-slate-200/80 rounded-lg p-2.5 shadow-sm text-xs text-left cursor-pointer hover:border-blue-300 transition-colors">
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
                                        ))
                                      ) : (
                                        <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 py-8">
                                          <Calendar size={20} className="mb-1" />
                                          <p className="text-[10px] font-semibold">Nenhum card marcado para migrar</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Modal para Adicionar do Backlog */}
                              {isBacklogModalOpen && (
                                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                                  <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl p-6 flex flex-col max-h-[80vh]">
                                    <div className="flex items-center justify-between mb-4">
                                      <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
                                        <FolderKanban size={20} className="text-brand-600" />
                                        Itens do Backlog
                                      </h3>
                                      <button onClick={() => setIsBacklogModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                                        <X size={20} />
                                      </button>
                                    </div>
                                    <div className="flex-1 overflow-y-auto pr-1 space-y-2">
                                      {(() => {
                                        const backlogCards = (project.cards || []).filter(c => !c.id_sprint && c.status !== 'CONCLUIDO');
                                        if (backlogCards.length === 0) {
                                          return <p className="text-sm text-slate-500 text-center py-6">Nenhuma tarefa no backlog.</p>;
                                        }
                                        return backlogCards.map(card => (
                                          <div key={card.id_card} onClick={() => { setSelectedCardId(card.id_card); setIsBacklogModalOpen(false); }} className="flex items-center justify-between p-3 border border-slate-200 rounded-xl hover:border-brand-300 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors">
                                            <div>
                                              <p className="text-sm font-bold text-slate-700">{card.titulo}</p>
                                              <p className="text-xs text-slate-500 mt-1">Prioridade: {card.prioridade}</p>
                                            </div>
                                            <button 
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setMigratedCardIds(prev => [...prev, card.id_card]);
                                                setIsBacklogModalOpen(false);
                                              }}
                                              className="px-3 py-1.5 text-xs font-bold text-white bg-[#320066] rounded-lg hover:bg-brand-700 transition-colors animate-fade-in"
                                            >
                                              Adicionar
                                            </button>
                                          </div>
                                        ));
                                      })()}
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Botão Concluir/Fechar */}
                              <div className="flex justify-end pt-4 border-t border-slate-100">
                                <button
                                  onClick={async () => {
                                    // Just finalize the active sprint, do not migrate anything to null.
                                    // Selected cards (migratedCardIds) will be migrated to the new sprint when created in step 2.
                                    // Non-migrated cards will keep their id_sprint pointing to activeSprint and remain in this finalized sprint.
                                    await handleFinishSprintAction(activeSprint, null, [], []);
                                  }}
                                  disabled={isFinishingSprint || !(isManager || isPO)}
                                  title={!(isManager || isPO) ? "Apenas PO ou Gerente do projeto podem encerrar a sprint." : ""}
                                  className="px-5 py-2.5 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-50 text-rose-600 hover:text-rose-700 font-bold text-xs transition-all shadow-sm active:scale-95 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {isFinishingSprint ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                                  Fechar Sprint Atual
                                </button>
                              </div>
                            </div>
                          );
                        })() : (
                          // Passo 2: Sprint anterior finalizada com sucesso, aguardando criar a próxima
                          <div className="flex flex-col items-center justify-center py-12 text-center h-full my-auto">
                            <CheckCircle2 size={48} className="text-emerald-500 mb-4 animate-bounce" />
                            <h3 className="text-lg font-extrabold text-slate-800">Sprint Finalizada</h3>
                            <p className="text-slate-500 text-xs mt-2 leading-relaxed max-w-sm">
                              A sprint anterior foi finalizada com sucesso. Configure e crie a próxima sprint no painel ao lado para concluir a transição de ciclo e migrar as tarefas pendentes.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Direita: Formulário de Criar Sprint (Habilitado apenas no passo 2) */}
                      <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm h-full flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                            <Calendar className="text-[#320066]" size={20} />
                            <h2 className="text-md font-extrabold text-slate-800 uppercase tracking-wider">Criar Sprint</h2>
                          </div>

                          <form onSubmit={handleCreateSprint} className="space-y-4">
                            <div className="space-y-1.5">
                              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Nome da Sprint</label>
                              <div className="w-full bg-slate-100 border border-slate-200 rounded-xl py-2.5 px-4 text-sm font-extrabold text-slate-750 select-none">
                                {getNextSprintName()}
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Início</label>
                                <input
                                  type="date"
                                  disabled={true}
                                  value={newSprintDataInicio}
                                  onChange={(e) => setNewSprintDataInicio(e.target.value)}
                                  className="w-full bg-slate-100 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none transition-all text-slate-500 cursor-not-allowed"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Término</label>
                                <input
                                  type="date"
                                  disabled={!isClosingFlowStep2}
                                  value={newSprintDataFim}
                                  onChange={(e) => setNewSprintDataFim(e.target.value)}
                                  className={`w-full border rounded-xl py-2.5 px-4 text-sm focus:outline-none transition-all text-slate-700 ${
                                    isClosingFlowStep2
                                      ? 'bg-slate-50 border-slate-200 focus:border-[#320066] focus:ring-1 focus:ring-[#320066]'
                                      : 'bg-slate-100 border-slate-200 cursor-not-allowed'
                                  }`}
                                />
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Objetivo da Sprint</label>
                              <textarea
                                rows="3"
                                disabled={!isClosingFlowStep2}
                                placeholder="Defina o objetivo primário da sprint..."
                                value={newSprintObjetivo}
                                onChange={(e) => setNewSprintObjetivo(e.target.value)}
                                className={`w-full border rounded-xl py-2.5 px-4 text-sm focus:outline-none transition-all placeholder-slate-400 resize-none ${
                                  isClosingFlowStep2
                                    ? 'bg-slate-50 border-slate-200 focus:border-[#320066] focus:ring-1 focus:ring-[#320066]'
                                    : 'bg-slate-100 border-slate-200 cursor-not-allowed'
                                }`}
                              />
                            </div>

                            <button
                              type="submit"
                              disabled={!isClosingFlowStep2 || creatingSprint}
                              className="w-full bg-[#320066] hover:bg-[#25004d] text-white font-bold text-sm py-3 px-6 rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
                            >
                              {creatingSprint && <Loader2 size={16} className="animate-spin" />}
                              {isClosingFlowStep2 ? 'Criar Sprint' : (
                                <>
                                  <Lock size={12} />
                                  <span>CRIAR PRÓXIMA SPRINT</span>
                                </>
                              )}
                            </button>
                          </form>
                        </div>
                      </div>
                    </>
                  ) : (
                    // Caso NÃO haja sprint ativa nem estejamos no encerramento (fluxo normal inicial ou planejado)
                    // Coluna da Esquerda (lg:col-span-1): Criar Sprint ou Sprint Planejada Info
                    // Coluna da Direita (lg:col-span-2): Detalhes da Sprint Planejada ou Mensagem de Nenhuma Sprint Ativa
                    <>
                      {/* Esquerda: Painel de Planejamento */}
                      {plannedSprint ? (
                        <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center min-h-[350px] text-center h-full justify-between">
                          <div className="flex flex-col items-center justify-center my-auto">
                            <Calendar className="text-[#320066]/75 mb-3" size={40} />
                            <h3 className="text-sm font-extrabold text-slate-750 uppercase tracking-wider">Sprint Planejada</h3>
                            <p className="text-slate-500 text-xs mt-2 leading-relaxed">
                              Você já possui a **{plannedSprint.nome}** em planejamento. Inicie esta sprint para começar o ciclo e liberar novos planejamentos.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm h-full flex flex-col justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                              <Calendar className="text-[#320066]" size={20} />
                              <h2 className="text-md font-extrabold text-slate-800 uppercase tracking-wider">Criar Sprint</h2>
                            </div>

                            <form onSubmit={handleCreateSprint} className="space-y-4">
                              <div className="space-y-1.5">
                                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Nome da Sprint</label>
                                <div className="w-full bg-slate-100 border border-slate-200 rounded-xl py-2.5 px-4 text-sm font-extrabold text-slate-750 select-none">
                                  {getNextSprintName()}
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Início</label>
                                  <input
                                    type="date"
                                    value={newSprintDataInicio}
                                    onChange={(e) => setNewSprintDataInicio(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-[#320066] focus:ring-1 focus:ring-[#320066] transition-all text-slate-700"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Término</label>
                                  <input
                                    type="date"
                                    value={newSprintDataFim}
                                    onChange={(e) => setNewSprintDataFim(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-[#320066] focus:ring-1 focus:ring-[#320066] transition-all text-slate-700"
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
                                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-[#320066] focus:ring-1 focus:ring-[#320066] transition-all placeholder-slate-400 resize-none"
                                />
                              </div>

                              <button
                                type="submit"
                                disabled={creatingSprint}
                                className="w-full bg-[#320066] hover:bg-[#25004d] text-white font-bold text-sm py-3 px-6 rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
                              >
                                {creatingSprint && <Loader2 size={16} className="animate-spin" />}
                                Criar Sprint
                              </button>
                            </form>
                          </div>
                        </div>
                      )}

                      {/* Direita: Detalhes da Sprint Planejada */}
                      <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm min-h-[400px] flex flex-col justify-between h-full">
                        {plannedSprint ? (() => {
                          const todayStr = new Date().toISOString().split('T')[0];
                          const sprintStartStr = plannedSprint.data_inicio ? new Date(plannedSprint.data_inicio).toISOString().split('T')[0] : '';
                          const isStartToday = !sprintStartStr || sprintStartStr <= todayStr;

                          return (
                            <div className="flex flex-col items-center justify-center py-8 text-center h-full my-auto">
                              <Calendar className="text-[#320066]/75 mb-4" size={48} />
                              <h3 className="text-md font-extrabold text-slate-800 uppercase tracking-wider">Sprint Planejada</h3>
                              
                              <div className="mt-4 p-5 bg-slate-50 border border-slate-200 rounded-2xl w-full max-w-md text-left space-y-3">
                                <div>
                                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Nome da Sprint</span>
                                  <p className="text-sm font-extrabold text-slate-800">{plannedSprint.nome}</p>
                                </div>
                                {plannedSprint.objetivo && (
                                  <div>
                                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Objetivo</span>
                                    <p className="text-xs text-slate-650 mt-0.5">{plannedSprint.objetivo}</p>
                                  </div>
                                )}
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Data de Início</span>
                                    <p className="text-xs text-slate-650 font-semibold mt-0.5">
                                      {plannedSprint.data_inicio ? new Date(plannedSprint.data_inicio).toLocaleDateString() : 'Não informada'}
                                    </p>
                                  </div>
                                  <div>
                                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Data de Término</span>
                                    <p className="text-xs text-slate-650 font-semibold mt-0.5">
                                      {plannedSprint.data_fim ? new Date(plannedSprint.data_fim).toLocaleDateString() : 'Não informada'}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              <div className="mt-6 w-full max-w-md">
                                {isStartToday ? (
                                  <div className="space-y-3">
                                    <p className="text-xs text-slate-500 leading-relaxed">
                                      Esta sprint está programada para iniciar hoje. Clique no botão abaixo para ativá-la e começar o ciclo de trabalho.
                                    </p>
                                    <button
                                      type="button"
                                      onClick={() => handleStartSprint(plannedSprint.id_sprint)}
                                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm py-3 rounded-xl transition-all active:scale-[0.98] shadow-md shadow-emerald-500/10"
                                    >
                                      Iniciar Sprint
                                    </button>
                                  </div>
                                ) : (
                                  <div className="space-y-3">
                                    <p className="text-xs text-amber-600 font-bold leading-relaxed">
                                      Esta sprint está agendada para iniciar em {new Date(plannedSprint.data_inicio).toLocaleDateString()}.
                                    </p>
                                    <button
                                      type="button"
                                      onClick={() => handleStartSprint(plannedSprint.id_sprint)}
                                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm py-3 rounded-xl transition-all active:scale-[0.98] shadow-md shadow-emerald-500/10"
                                    >
                                      Iniciar Sprint Antecipadamente
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })() : (
                          <div className="flex flex-col items-center justify-center py-16 text-center my-auto">
                            <Calendar className="text-[#320066]/30 mb-3 animate-pulse" size={48} />
                            <h3 className="text-md font-extrabold text-slate-700 uppercase tracking-wider font-semibold text-slate-400">Nenhuma Sprint Ativa</h3>
                            <p className="text-slate-400 text-xs max-w-sm mt-1 leading-relaxed">
                              Não há nenhuma sprint activa ou planejada no momento. Crie um novo ciclo usando o painel ao lado.
                            </p>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                </div>

                {/* Rodapé: Métricas baseadas na Sprint Ativa */}
                {activeSprint && (() => {
                  const totalCards = (activeSprint.cards || []).length;
                  const completedCards = (activeSprint.cards || []).filter(c => c.status === 'CONCLUIDO');
                  const completedCount = completedCards.length;

                  const completedPoints = completedCards.reduce((acc, c) => acc + (c.story_points || 0), 0);
                  const unfinishedCount = totalCards - completedCount;
                  const percentage = totalCards > 0 ? Math.round((completedCount / totalCards) * 100) : 0;

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                      {/* Card 1: Pontuação */}
                      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider font-semibold">Pontuação das Tarefas Concluídas</span>
                        <span className="text-3xl font-extrabold text-[#320066] mt-2 font-mono">{completedPoints} <span className="text-xs font-semibold text-slate-400 uppercase tracking-normal">pts</span></span>
                      </div>

                      {/* Card 2: Tarefas a migrar */}
                      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider font-semibold">Tarefas a Serem Migradas</span>
                        <span className="text-3xl font-extrabold text-rose-600 mt-2 font-mono">{String(unfinishedCount).padStart(2, '0')} <span className="text-xs font-semibold text-slate-400 uppercase tracking-normal">tarefas</span></span>
                      </div>

                      {/* Card 3: Porcentagem */}
                      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider font-semibold font-semibold">Porcentagem de Concluídas</span>
                        <span className="text-3xl font-extrabold text-blue-600 mt-2 font-mono">{percentage} <span className="text-xs font-semibold text-slate-400 uppercase tracking-normal">%</span></span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            );
          })()
        ) : activeTab === 'metrics' ? (
          /* ================= TELA MÉTRICAS ================= */
          <div className="w-full text-left">
             <RelatoriosPage projectId={project.id_projeto} sprints={sprints} project={project} />
          </div>
        ) : (
          /* ================= TELA CONFIGURAÇÕES ================= */
          <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm max-w-2xl mx-auto mt-6 text-left">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
              <Settings className="text-brand-600" size={28} />
              <div>
                <h2 className="text-xl font-extrabold text-slate-800">Configurações do Quadro</h2>
                <p className="text-slate-500 text-sm">Gerencie os detalhes básicos, prazos e encerramento do quadro.</p>
              </div>
            </div>

            {!isManager ? (
              <div className="flex flex-col items-center justify-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                <AlertTriangle size={36} className="text-orange-400 mb-3" />
                <h3 className="text-lg font-bold text-slate-700">Acesso Restrito</h3>
                <p className="text-sm text-slate-500 text-center max-w-sm mt-1">Apenas os usuários com perfil de <strong className="text-brand-600">GERENTE</strong> podem visualizar ou alterar as configurações deste quadro.</p>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Formulário de Edição */}
                <form onSubmit={handleUpdateSettings} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Nome do Quadro</label>
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
                          {project.arquivado ? 'Desarquivar Quadro' : 'Arquivar Quadro'}
                        </h4>
                        <p className="text-xs text-orange-700 mt-1 mb-4 leading-relaxed">
                          {project.arquivado
                            ? 'O quadro voltará a aparecer no seu Dashboard principal e ficará ativo novamente.'
                            : 'O quadro não aparecerá mais no Dashboard principal. Todas as tarefas e dados ficarão salvos para consultas futuras.'
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
                          Isso apagará o quadro permanentemente e todas as tarefas associadas. Essa ação não pode ser desfeita!
                        </p>
                      </div>
                      <button
                        onClick={() => setIsDeleteModalOpen(true)}
                        className="w-full px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg transition-colors flex justify-center items-center gap-2 shadow-sm"
                      >
                        <Trash2 size={14} /> Excluir Quadro
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
                  {project.etiquetas && project.etiquetas.length > 0 ? (
                    project.etiquetas.map(et => {
                      const isSelected = newCardEtiquetas.includes(et.id_etiqueta);
                      return (
                        <button
                          key={et.id_etiqueta}
                          type="button"
                          onClick={() => toggleFormEtiqueta(et.id_etiqueta)}
                          className={`px-3 py-1.5 rounded-lg border font-bold text-[9px] transition-all ${
                            isSelected
                              ? 'bg-[#320066] border-[#320066] text-white shadow-sm'
                              : 'bg-[#EAECEF] border-transparent text-[#475569] hover:bg-[#DEE2E6]'
                          }`}
                        >
                          {et.nome}
                        </button>
                      );
                    })
                  ) : (
                    ['FRONTEND', 'DESIGN', 'BACKEND', 'DEVOPS'].map(tag => {
                      const isSelected = newCardTags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleFormTag(tag)}
                          className={`px-3 py-1.5 rounded-lg border font-bold text-[9px] transition-all ${
                            isSelected
                              ? 'bg-[#320066] border-[#320066] text-white shadow-sm'
                              : 'bg-[#EAECEF] border-transparent text-[#475569] hover:bg-[#DEE2E6]'
                          }`}
                        >
                          {tag}
                        </button>
                      );
                    })
                  )}
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
              {project.arquivado ? 'Desarquivar este quadro?' : 'Arquivar este quadro?'}
            </h3>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              {project.arquivado
                ? <>Tem certeza que deseja desarquivar <strong>{project.nome}</strong>? Ele voltará a aparecer na sua lista de quadros ativos.</>
                : <>Tem certeza que deseja arquivar o quadro <strong>{project.nome}</strong>? Ele deixará de aparecer na lista principal.</>
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
            <h3 className="text-lg font-extrabold text-slate-800 mb-2">Excluir quadro definitivamente?</h3>
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
      <InviteMemberModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        project={project}
        onUpdateProject={onUpdateProject}
        showToast={showToast}
        isManager={isManager}
      />

      {/* ================================= MODAL DE REMOÇÃO DE MEMBRO ================================= */}
      {isRemoveMemberModalOpen && memberToRemove && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 animate-scale-up text-center shadow-2xl">
            <div className="mx-auto w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-4">
              <Trash2 size={24} />
            </div>
            <h3 className="text-lg font-extrabold text-slate-800 mb-2">Remover membro do quadro?</h3>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              Tem certeza que deseja remover <strong>{memberToRemove.nome}</strong> do quadro? O membro perderá acesso a todas as tarefas e recursos.
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

      {/* ================================= MODAL DE CUSTOMIZAÇÃO DO BOARD (COLUNAS E ETIQUETAS) ================================= */}
      <BoardConfigModal
        isOpen={isBoardConfigModalOpen}
        onClose={() => setIsBoardConfigModalOpen(false)}
        project={project}
        onUpdateProject={onUpdateProject}
        showToast={showToast}
        isManager={isManager}
      />

      <ActivityLogsModal
        isOpen={isActivityLogsModalOpen}
        onClose={() => setIsActivityLogsModalOpen(false)}
        project={project}
      />

      {selectedCardId && (
        <CardDetailModal
          cardId={selectedCardId}
          project={project}
          currentUserEmail={currentUserEmail}
          onClose={() => { setSelectedCardId(null); }}
          onUpdateProject={onUpdateProject}
          showToast={showToast}
        />
      )}

    </div>
  );
}
