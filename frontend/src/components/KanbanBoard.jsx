import React, { useState } from 'react';
import api from '../utils/api.js';
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
  Menu
} from 'lucide-react';

export default function KanbanBoard({ project, onUpdateProject, userDisplayName }) {
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

  // Sprints Simuladas
  const [selectedSprint, setSelectedSprint] = useState('Sprint 24 (Atual)');
  const [sprintDropdownOpen, setSprintDropdownOpen] = useState(false);

  const sprints = ['Sprint 24 (Atual)', 'Sprint 23', 'Sprint 22'];

  // Pegar todos os membros do projeto para exibição e atribuição
  // A API retorna membros com { perfil, usuario: { id_usuario, nome, email } }
  const members = (project.membros || []).map(m => ({
    id_usuario: m.usuario?.id_usuario || m.id_usuario,
    nome: m.usuario?.nome || m.nome || 'Membro',
    perfil: m.perfil || 'DEV',
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

    // Atualiza o status do cartão movido no projeto ativo (otimistic update)
    const updatedCards = project.cards.map(card => {
      if (card.id_card === cardId) {
        return { ...card, status: targetStatus };
      }
      return card;
    });

    onUpdateProject({
      ...project,
      cards: updatedCards
    });

    // Persistir no backend
    api.patch(`/api/cards/${cardId}/status`, { status: targetStatus })
      .catch(err => console.error('Erro ao persistir movimentação:', err));
  };

  // Mover cartão via clique (acessibilidade / mobile-friendly)
  const moveCard = (cardId, targetStatus) => {
    const updatedCards = project.cards.map(card => {
      if (card.id_card === cardId) {
        return { ...card, status: targetStatus };
      }
      return card;
    });

    onUpdateProject({
      ...project,
      cards: updatedCards
    });

    // Persistir no backend
    api.patch(`/api/cards/${cardId}/status`, { status: targetStatus })
      .catch(err => console.error('Erro ao persistir movimentação:', err));
  };

  // ================= FILTRO E BUSCA DE CARDS =================
  const filteredCards = (project.cards || []).filter(card => {
    const matchesSearch = card.titulo.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          card.id_card.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTag = selectedTag ? (card.tags || []).includes(selectedTag) : true;
    return matchesSearch && matchesTag;
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

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-80px)] -mx-4 md:-mx-6 -mt-4 md:-mt-6 relative">
      
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
        md:translate-x-0 md:static md:h-auto md:pt-6
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
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                activeTab === 'board'
                  ? 'bg-brand-50 text-brand-700 shadow-sm border-l-4 border-brand-600'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              <FolderKanban size={18} />
              <span>Painel de Tarefas</span>
            </button>

            <button
              onClick={() => { setActiveTab('sprint'); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                activeTab === 'sprint'
                  ? 'bg-brand-50 text-brand-700 shadow-sm border-l-4 border-brand-600'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              <Calendar size={18} />
              <span>Planejamento de Sprint</span>
            </button>

            <button
              onClick={() => { setActiveTab('metrics'); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                activeTab === 'metrics'
                  ? 'bg-brand-50 text-brand-700 shadow-sm border-l-4 border-brand-600'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              <TrendingUp size={18} />
              <span>Métricas</span>
            </button>

            <button
              onClick={() => { setActiveTab('settings'); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                activeTab === 'settings'
                  ? 'bg-brand-50 text-brand-700 shadow-sm border-l-4 border-brand-600'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              <Settings size={18} />
              <span>Configurações</span>
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
      <main className="flex-1 p-6 md:p-8 flex flex-col bg-slate-50 overflow-x-auto">
        
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
                      <img
                        key={member.id_usuario || i}
                        title={`${member.nome} (${member.perfil})`}
                        src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${member.nome}`}
                        alt={member.nome}
                        className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 object-cover shadow-sm"
                      />
                    ))}
                    {members.length > 4 && (
                      <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[10px] font-extrabold text-slate-600 shadow-sm shrink-0">
                        +{members.length - 4}
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={() => alert('Para adicionar novos membros, por favor use a seção de Configurações.')}
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
                      className={`px-3 py-1.5 rounded-lg font-semibold text-[10px] border transition-all active:scale-95 ${
                        selectedTag === tag
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
                    <span>{selectedSprint}</span>
                    <ChevronDown size={12} className={`transition-transform duration-200 ${sprintDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {sprintDropdownOpen && (
                    <div className="absolute left-0 mt-1.5 w-44 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-30 text-left animate-fade-in">
                      {sprints.map((sprint) => (
                        <button
                          key={sprint}
                          onClick={() => {
                            setSelectedSprint(sprint);
                            setSprintDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs font-semibold hover:bg-slate-50 transition-colors ${
                            selectedSprint === sprint ? 'text-brand-600 bg-brand-50/50' : 'text-slate-700'
                          }`}
                        >
                          {sprint}
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
                                  <span className={`font-bold text-[9px] px-2 py-0.5 rounded-md border ${
                                    isAlta 
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
                                    <img
                                      title={card.responsavel.nome}
                                      src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${card.responsavel.nome}`}
                                      alt={card.responsavel.nome}
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
          /* ================= TELA PLANEJAMENTO DE SPRINT ================= */
          <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm text-center max-w-lg mx-auto mt-10">
            <Calendar className="mx-auto text-brand-600 mb-4 animate-bounce" size={40} />
            <h2 className="text-xl font-extrabold text-slate-800">Planejamento de Sprint</h2>
            <p className="text-slate-500 mt-2 text-sm leading-relaxed">
              Aqui você poderá abrir votações de Planning Poker baseados em Fibonacci, definir metas de equipe e iniciar ou finalizar novas sprints de forma automatizada.
            </p>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 mt-6 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-200">
              <Sparkles size={12} />
              Em breve nesta branch!
            </div>
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
          <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm text-center max-w-lg mx-auto mt-10">
            <Settings className="mx-auto text-brand-600 mb-4 rotate-45 transition-transform" size={40} />
            <h2 className="text-xl font-extrabold text-slate-800">Configurações do Projeto</h2>
            <p className="text-slate-500 mt-2 text-sm leading-relaxed">
              Configure as credenciais do projeto, adicione e remova novos membros da equipe, altere prazos de sprint ou remodele os níveis de cargos e permissões ágeis.
            </p>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 mt-6 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-200">
              <Sparkles size={12} />
              Em breve nesta branch!
            </div>
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
                      className={`py-2 px-3 border rounded-xl text-center font-bold text-[10px] transition-all ${
                        newCardPriority === p.id 
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
                        className={`px-3 py-1.5 rounded-lg border font-bold text-[9px] transition-all ${
                          isSelected
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

    </div>
  );
}
