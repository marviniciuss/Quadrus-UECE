import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  HelpCircle,
  ChevronDown,
  CheckCheck
} from 'lucide-react';
import axios from 'axios';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './utils/firebaseConfig.js';
import api from './utils/api.js';
import { socket } from './utils/socket.js';
import ProjectList from './components/ProjectList.jsx';
import LoginScreen from './components/LoginScreen.jsx';
import KanbanBoard from './components/KanbanBoard.jsx';
import ProfileModal from './components/ProfileModal.jsx';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [backendStatus, setBackendStatus] = useState('checking');
  const [socketStatus, setSocketStatus] = useState('offline');
  const [selectedProject, setSelectedProject] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [initialOpenCardId, setInitialOpenCardId] = useState(null);
  const [isBlockingExit, setIsBlockingExit] = useState(false);

  // Estado do usuário no banco de dados (para ID de notificações)
  const [dbUser, setDbUser] = useState(null);
  const dbUserRef = useRef(null);

  // Notificações
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Lista de projetos carregada do backend
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const dropdownRef = useRef(null);
  const helpRef = useRef(null);
  const notificationsRef = useRef(null);

  // Função para buscar projetos do usuário logado no backend
  const fetchProjects = async (isArchived = false) => {
    setProjectsLoading(true);
    try {
      const res = await api.get(`/api/projetos/meus?arquivados=${isArchived}`);
      setProjects(res.data);
    } catch (error) {
      console.error('Erro ao buscar projetos:', error);
    } finally {
      setProjectsLoading(false);
    }
  };

  // Função para criar um novo projeto via API
  const handleCreateProject = async ({ nome, descricao, data_prazo }) => {
    try {
      const res = await api.post('/api/projetos', { nome, descricao, data_prazo });
      // Adiciona o projeto retornado à lista local
      setProjects(prev => [res.data, ...prev]);
      return res.data;
    } catch (error) {
      console.error('Erro ao criar projeto:', error);
      throw error;
    }
  };

  // Função para buscar os detalhes completos do projeto (incluindo colunas e etiquetas) ao selecioná-lo
  const handleSelectProject = async (proj) => {
    if (isBlockingExit) {
      alert("Você possui cards pendentes a serem migrados. Crie a próxima sprint para concluir a transição antes de sair.");
      return;
    }
    if (!proj) {
      setSelectedProject(null);
      return;
    }
    // Define o projeto parcial imediatamente para transição instantânea
    setSelectedProject(proj);
    try {
      const res = await api.get(`/api/projetos/${proj.id_projeto}`);
      setSelectedProject(res.data);
    } catch (error) {
      console.error('Erro ao buscar detalhes completos do projeto:', error);
    }
  };

  // Função para atualizar dados de um projeto existente no estado local
  const handleUpdateProject = (updatedProject) => {
    setProjects(prev => prev.map(p => p.id_projeto === updatedProject.id_projeto ? updatedProject : p));
    setSelectedProject(updatedProject);
  };

  const handleLoginSuccess = async (user) => {
    try {
      const nome = user.displayName || user.email.split('@')[0];
      const email = user.email;
      const res = await api.post('/api/usuarios', { nome, email });
      setDbUser(res.data);
      dbUserRef.current = res.data;
      console.log('Usuário sincronizado após login/cadastro com nome:', nome);
    } catch (error) {
      console.error('Erro ao sincronizar após login/cadastro:', error);
    }
    setCurrentUser(user);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Se o e-mail não foi verificado, desloga e não permite acesso
        if (!user.emailVerified) {
          await signOut(auth);
          setCurrentUser(null);
          setAuthLoading(false);
          return;
        }
        try {
          const nome = user.displayName || user.email.split('@')[0];
          const email = user.email;
          const res = await api.post('/api/usuarios', { nome, email });
          setDbUser(res.data);
          dbUserRef.current = res.data;
          console.log('Usuário sincronizado com o banco de dados PostgreSQL.');
        } catch (error) {
          console.error('Erro ao sincronizar usuário com o backend:', error);
        }
      }
      setCurrentUser(user);
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  // Buscar notificações do usuário
  const fetchNotifications = async () => {
    try {
      const res = await api.get('/api/notificacoes');
      setNotifications(res.data);
      setUnreadCount(res.data.filter(n => !n.lida).length);
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await api.patch(`/api/notificacoes/${id}/ler`);
      setNotifications(prev => prev.map(n => n.id_notificacao === id ? { ...n, lida: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.post('/api/notificacoes/ler-todas');
      setNotifications(prev => prev.map(n => ({ ...n, lida: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error);
    }
  };

  const handleAcceptInvite = async (id) => {
    try {
      await api.post(`/api/notificacoes/${id}/aceitar`);
      alert('Convite aceito com sucesso!');
      await fetchNotifications();
      await fetchProjects(showArchived);
    } catch (error) {
      console.error('Erro ao aceitar convite:', error);
      alert(error.response?.data?.error || 'Erro ao aceitar convite.');
    }
  };

  const handleDeclineInvite = async (id) => {
    try {
      await api.post(`/api/notificacoes/${id}/recusar`);
      alert('Convite recusado com sucesso.');
      await fetchNotifications();
    } catch (error) {
      console.error('Erro ao recusar convite:', error);
      alert(error.response?.data?.error || 'Erro ao recusar convite.');
    }
  };

  const handleAcceptHomologacao = async (id) => {
    try {
      const res = await api.post(`/api/notificacoes/${id}/aceitar-homologacao`);
      alert('Homologação aceita com sucesso!');
      await fetchNotifications();
      if (selectedProject) {
        const resProj = await api.get(`/api/projetos/${selectedProject.id_projeto}`);
        handleUpdateProject(resProj.data);
      }
    } catch (error) {
      console.error('Erro ao aceitar homologação:', error);
      alert(error.response?.data?.error || 'Erro ao aceitar homologação.');
    }
  };

  const handleNotificationClick = async (n) => {
    // Se for convite de projeto ou solicitação de homologação, não faz nada no clique do corpo (espera botão)
    if ((n.id_projeto_origem && !n.id_card_origem) || n.solicitacao_homologacao) {
      return;
    }

    if (!n.lida) {
      await handleMarkAsRead(n.id_notificacao);
    }

    if (n.id_card_origem && n.id_projeto_origem) {
      const targetProj = projects.find(p => p.id_projeto === n.id_projeto_origem);
      if (targetProj) {
        setInitialOpenCardId(n.id_card_origem);
        await handleSelectProject(targetProj);
      }
    }
  };

  const formatTimeAgo = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now - d;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Agora mesmo';
    if (mins < 60) return `${mins} min atrás`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h atrás`;
    const days = Math.floor(hours / 24);
    return `${days}d atrás`;
  };

  // Quando o usuário logar ou trocar de aba (arquivados/ativos), buscar seus projetos
  useEffect(() => {
    if (currentUser) {
      fetchProjects(showArchived);
      fetchNotifications();
    }
  }, [currentUser, showArchived]);

  // Escutar notificações em tempo real via Socket
  useEffect(() => {
    const handleNewNotification = (notif) => {
      const user = dbUserRef.current;
      if (user && notif.id_usuario_destino === user.id_usuario) {
        setNotifications(prev => [notif, ...prev]);
        setUnreadCount(prev => prev + 1);
      }
    };

    socket.on('nova_notificacao', handleNewNotification);
    return () => {
      socket.off('nova_notificacao', handleNewNotification);
    };
  }, []);

  useEffect(() => {
    const handleUsuarioAtualizado = (data) => {
      const currentUserInDb = dbUserRef.current;
      if (currentUserInDb && data.id_usuario === currentUserInDb.id_usuario) {
        setDbUser(prev => {
          const updated = { ...prev, nome: data.nome, foto: data.foto, username: data.username };
          dbUserRef.current = updated;
          return updated;
        });
      }
    };

    socket.on('usuario_atualizado', handleUsuarioAtualizado);
    return () => {
      socket.off('usuario_atualizado', handleUsuarioAtualizado);
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
      if (helpRef.current && !helpRef.current.contains(event.target)) {
        setHelpOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';

    axios.get(`${BACKEND_URL}/health`)
      .then(res => {
        if (res.data.status === 'ok') setBackendStatus('online');
        else setBackendStatus('degraded');
      })
      .catch(() => setBackendStatus('offline'));

    // Use the singleton socket instance from socket.js
    if (socket.disconnected) socket.connect();
    socket.on('connect', () => setSocketStatus('online'));
    socket.on('connect_error', () => setSocketStatus('offline'));

  }, []);

  useEffect(() => {
    if (dbUser && socketStatus === 'online') {
      socket.emit('join_user', dbUser.id_usuario);
      console.log(`Subscribed to user room: user:${dbUser.id_usuario}`);
      return () => {
        socket.emit('leave_user', dbUser.id_usuario);
        console.log(`Unsubscribed from user room: user:${dbUser.id_usuario}`);
      };
    }
  }, [dbUser, socketStatus]);

  const handleLogout = async () => {
    if (isBlockingExit) {
      alert("Você possui cards pendentes a serem migrados. Crie a próxima sprint para concluir a transição antes de sair.");
      return;
    }
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Logout error:', err);
    }
    setCurrentUser(null);
    setSelectedProject(null);
    setProjects([]);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans">
        <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold text-slate-500">Iniciando ambiente seguro...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  const userDisplayName = currentUser.displayName || currentUser.email.split('@')[0];

  return (
    <div className={`min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans ${selectedProject ? 'md:h-screen md:overflow-hidden' : ''}`}>

      {/* Header Superior Principal */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-50 px-6 py-4 flex items-center justify-between shadow-sm">

        {/* Lado Esquerdo: Logo, Menu e Botão Dropdown */}
        <div className="flex items-center gap-6">
          <div
            onClick={() => selectedProject && setSidebarOpen(!sidebarOpen)}
            className={`flex items-center gap-2 shrink-0 ${selectedProject ? 'cursor-pointer hover:opacity-80 active:scale-95 transition-all' : ''}`}
            title={selectedProject ? "Alternar Menu Lateral" : ""}
          >
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 shadow-md shadow-brand-500/10 select-none">
              <rect width="100" height="100" rx="30" fill="#320066" />
              <polygon points="50,23 74,37 74,63 50,77 26,63 26,37" fill="white" stroke="white" strokeWidth="6" strokeLinejoin="round" />
              <path d="M 50,50 L 50,81 M 50,50 L 22,34 M 50,50 L 78,34" stroke="#320066" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="hidden sm:inline font-extrabold text-xl tracking-tight bg-gradient-to-r from-brand-600 to-indigo-600 bg-clip-text text-transparent">
              Quadrus
            </span>
          </div>

          <nav className="flex items-center gap-2 sm:gap-4 sm:border-l sm:border-slate-200 sm:pl-6 pl-2">
            <span
              onClick={() => handleSelectProject(null)}
              className="hidden sm:inline font-bold text-sm text-slate-800 cursor-pointer hover:text-brand-600 transition-colors whitespace-nowrap shrink-0"
            >
              Projetos
            </span>

            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 font-semibold text-xs border border-brand-200 transition-all active:scale-95 whitespace-nowrap shrink-0"
              >
                <span>Selecionar quadro</span>
                <ChevronDown size={14} className={`transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {dropdownOpen && (
                <div className="absolute left-0 mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-lg py-2 z-50 animate-fade-in text-left">
                  <div className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
                    Selecionar Quadro
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    <button
                      onClick={() => {
                        handleSelectProject(null);
                        setDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs font-bold text-brand-600 hover:bg-brand-50 transition-colors"
                    >
                      Ver todos os quadros (Lista)
                    </button>
                    {projects.map((project) => (
                      <button
                        key={project.id_projeto}
                        onClick={() => {
                          handleSelectProject(project);
                          setDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition-colors flex flex-col ${selectedProject?.id_projeto === project.id_projeto ? 'bg-brand-50/40 border-l-2 border-brand-500' : ''
                          }`}
                      >
                        <span className="font-semibold text-slate-800">{project.nome}</span>
                        <span className="text-xs text-slate-400 truncate w-full">{project.descricao}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {selectedProject && (
              <span className="hidden md:inline-block text-xs px-2.5 py-1 rounded-full border border-brand-200 bg-brand-50 text-brand-700 font-bold ml-2 animate-fade-in whitespace-nowrap truncate max-w-[100px] sm:max-w-[150px]" title={selectedProject.nome}>
                {selectedProject.nome}
              </span>
            )}
          </nav>
        </div>

        {/* Lado Direito: Notificações, Dúvidas, Perfil e Sair */}
        <div className="flex items-center gap-4">
          {/* Central de Ajuda Dropdown */}
          <div className="relative hidden sm:block" ref={helpRef}>
            <button
              className={`p-2 rounded-lg transition-colors ${helpOpen ? 'text-brand-600 bg-brand-50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
              title="Dúvidas / Ajuda"
              onClick={() => setHelpOpen(!helpOpen)}
            >
              <HelpCircle size={20} />
            </button>
            {helpOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-lg py-2.5 z-50 animate-fade-in text-left">
                <div className="px-4 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-2">
                  Central de Ajuda
                </div>
                <div className="px-4 py-2 space-y-2 text-xs text-slate-600">
                  <div className="hover:text-brand-600 cursor-pointer font-semibold transition-colors">✦ Como planejar sprints?</div>
                  <div className="hover:text-brand-600 cursor-pointer font-semibold transition-colors">✦ Atribuir atividades a membros</div>
                  <div className="hover:text-brand-600 cursor-pointer font-semibold transition-colors">✦ Mudar status de cards no Kanban</div>
                  <div className="pt-2 border-t border-slate-100 text-center font-bold text-brand-600 hover:text-brand-700 cursor-pointer">
                    Ver documentação completa
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Central de Notificações Dropdown */}
          <div className="relative" ref={notificationsRef}>
            <button
              className={`relative p-2 rounded-lg transition-colors ${notificationsOpen ? 'text-brand-600 bg-brand-50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
              title="Notificações"
              onClick={() => setNotificationsOpen(!notificationsOpen)}
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-lg py-2.5 z-50 animate-fade-in text-left">
                <div className="px-4 py-1.5 flex items-center justify-between border-b border-slate-100 mb-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Notificações</span>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      className="flex items-center gap-1 text-[10px] font-semibold text-brand-600 hover:text-brand-700 transition-colors"
                    >
                      <CheckCheck size={12} />
                      Marcar todas como lidas
                    </button>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto px-2 py-1 space-y-1">
                  {notifications.length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-400">
                      <Bell size={24} className="mx-auto mb-2 opacity-30" />
                      Nenhuma notificação por aqui.
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id_notificacao}
                        onClick={() => handleNotificationClick(n)}
                        className={`text-xs px-3 py-2.5 rounded-lg transition-colors ${
                          ((n.id_projeto_origem && !n.id_card_origem) || n.solicitacao_homologacao) ? '' : 'cursor-pointer'
                        } ${
                          n.lida
                            ? 'text-slate-400 hover:bg-slate-50'
                            : 'text-slate-700 bg-brand-50/50 hover:bg-brand-50 font-semibold'
                        }`}
                      >
                        <p className="leading-relaxed">{n.mensagem}</p>
                        {n.id_projeto_origem && !n.id_card_origem && !n.lida && (
                          <div className="flex gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleAcceptInvite(n.id_notificacao)}
                              className="px-2.5 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-[10px] font-bold transition-colors"
                            >
                              Aceitar
                            </button>
                            <button
                              onClick={() => handleDeclineInvite(n.id_notificacao)}
                              className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-[10px] font-bold transition-colors"
                            >
                              Recusar
                            </button>
                          </div>
                        )}
                        {n.solicitacao_homologacao && !n.lida && (
                          <div className="flex gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleAcceptHomologacao(n.id_notificacao)}
                              className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-750 text-white rounded-lg text-[10px] font-bold transition-colors"
                            >
                              Aceitar tarefa
                            </button>
                          </div>
                        )}
                        <p className="text-slate-400 text-[10px] mt-1 font-normal">{formatTimeAgo(n.createdAt)}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => setIsProfileModalOpen(true)}
            className="flex items-center gap-2 pl-2 border-l border-slate-200 hover:opacity-80 transition-opacity focus:outline-none whitespace-nowrap shrink-0"
            title="Configurações do Perfil"
          >
            <img
              src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(dbUser?.foto || dbUser?.nome || userDisplayName)}`}
              alt="Avatar do Usuário"
              className="w-8 h-8 rounded-full border border-slate-200 bg-slate-100 object-cover"
            />
            <span className="hidden md:inline text-xs font-bold text-slate-700 uppercase tracking-tight whitespace-nowrap truncate max-w-[120px]">
              {dbUser?.nome || userDisplayName}
            </span>
          </button>

        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className={`flex-1 w-full mx-auto transition-all duration-300 ${selectedProject ? 'max-w-full px-6 md:px-8 flex flex-col min-h-0 md:overflow-hidden' : 'max-w-7xl p-4 md:p-6'}`}>
        {!selectedProject ? (
          // Passamos a lista de projetos, a função de criação e o nome do usuário logado
          <ProjectList
            projects={projects}
            projectsLoading={projectsLoading}
            onSelectProject={handleSelectProject}
            onCreateProject={handleCreateProject}
            userDisplayName={userDisplayName}
            showArchived={showArchived}
            setShowArchived={setShowArchived}
          />
        ) : (
          /* Novo Quadro Kanban Interativo */
          <KanbanBoard
            key={selectedProject.id_projeto}
            project={selectedProject}
            onUpdateProject={handleUpdateProject}
            onProjectAction={() => { handleSelectProject(null); fetchProjects(showArchived); }}
            userDisplayName={userDisplayName}
            currentUserEmail={currentUser.email}
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            onLogout={handleLogout}
            initialOpenCardId={initialOpenCardId}
            onClearInitialOpenCardId={() => setInitialOpenCardId(null)}
            setIsBlockingExit={setIsBlockingExit}
          />
        )}
      </main>

      {/* Rodapé */}
      {!selectedProject && (
        <footer className="border-t border-slate-200 py-4 px-8 flex items-center justify-between text-xs text-slate-400 bg-white">
          <div>&copy; {new Date().getFullYear()} Quadrus. Todos os direitos reservados.</div>
          <div className="flex items-center gap-3 font-medium">
            <span className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${backendStatus === 'online' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              API: {backendStatus}
            </span>
            <span className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${socketStatus === 'online' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              Realtime: {socketStatus}
            </span>
          </div>
        </footer>
      )}

      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        user={dbUser}
        onSave={(updatedUser) => {
          setDbUser(updatedUser);
          dbUserRef.current = updatedUser;
        }}
        onLogout={handleLogout}
      />
    </div>
  );
}