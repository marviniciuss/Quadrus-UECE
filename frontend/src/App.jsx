import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  HelpCircle,
  ChevronDown,
  LogOut
} from 'lucide-react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './utils/firebaseConfig.js';
import ProjectList from './components/ProjectList.jsx';
import LoginScreen from './components/LoginScreen.jsx';

const MOCK_PROJECTS = [
  {
    id_projeto: '1',
    nome: 'Quadrus - Kanban Colaborativo',
    descricao: 'Desenvolvimento do monorepo Quadrus utilizando React, Tailwind, Node e Socket.io para a disciplina de Engenharia de Software.',
    data_prazo: '2026-07-15T00:00:00.000Z',
    membros: [
      { id_usuario: '1', nome: 'Joel', perfil: 'PO' },
      { id_usuario: '2', nome: 'Juan', perfil: 'DEV' },
      { id_usuario: '3', nome: 'Vinicius', perfil: 'DEV' },
      { id_usuario: '4', nome: 'Victoria', perfil: 'GERENTE' },
    ],
    cards: [
      { status: 'CONCLUIDO' },
      { status: 'EM_ANDAMENTO' },
      { status: 'A_FAZER' },
      { status: 'CONCLUIDO' },
      { status: 'HOMOLOGACAO' },
    ],
    createdAt: '2026-05-10T00:00:00.000Z',
  },
  {
    id_projeto: '2',
    nome: 'UECE - Portal de Alunos',
    descricao: 'Redesign da interface e migração do portal acadêmico dos alunos da UECE para React e Tailwind.',
    data_prazo: '2026-06-20T00:00:00.000Z',
    membros: [
      { id_usuario: '1', nome: 'Joel', perfil: 'DEV' },
      { id_usuario: '5', nome: 'Felipe', perfil: 'PO' },
      { id_usuario: '6', nome: 'Matheus', perfil: 'TESTER' },
    ],
    cards: [
      { status: 'CONCLUIDO' },
      { status: 'CONCLUIDO' },
      { status: 'CONCLUIDO' },
    ],
    createdAt: '2026-05-01T00:00:00.000Z',
  },
  {
    id_projeto: '3',
    nome: 'Dashboard de Métricas - RDA',
    descricao: 'Módulo analítico com logs de governança de sprint e gráficos automatizados de Velocity.',
    data_prazo: '2026-08-01T00:00:00.000Z',
    membros: [
      { id_usuario: '3', nome: 'Vinicius', perfil: 'GERENTE' },
      { id_usuario: '2', nome: 'Juan', perfil: 'DEV' },
    ],
    cards: [
      { status: 'A_FAZER' },
      { status: 'A_FAZER' },
    ],
    createdAt: '2026-05-15T00:00:00.000Z',
  }
];

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(false); // Mantemos desativado para testar offline
  const [backendStatus, setBackendStatus] = useState('checking');
  const [socketStatus, setSocketStatus] = useState('offline');
  const [selectedProject, setSelectedProject] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Agora a lista de projetos é um estado mutável
  const [projects, setProjects] = useState(MOCK_PROJECTS);

  const dropdownRef = useRef(null);

  // Função para adicionar um novo projeto na lista
  const handleCreateProject = (newProject) => {
    setProjects([...projects, newProject]);
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
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

    const socket = io(BACKEND_URL, { autoConnect: true, reconnectionAttempts: 3 });
    socket.on('connect', () => setSocketStatus('online'));
    socket.on('connect_error', () => setSocketStatus('offline'));

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleLogout = () => {
    setCurrentUser(null);
    setSelectedProject(null);
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
    return <LoginScreen onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  const userDisplayName = currentUser.displayName || currentUser.email.split('@')[0];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">

      {/* Header Superior Principal */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-50 px-6 py-4 flex items-center justify-between shadow-sm">

        {/* Lado Esquerdo: Logo, Menu e Botão Dropdown */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 shadow-md shadow-brand-500/10 select-none">
              <rect width="100" height="100" rx="30" fill="#320066" />
              <polygon points="50,23 74,37 74,63 50,77 26,63 26,37" fill="white" stroke="white" strokeWidth="6" strokeLinejoin="round" />
              <path d="M 50,50 L 50,81 M 50,50 L 22,34 M 50,50 L 78,34" stroke="#320066" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-brand-600 to-indigo-600 bg-clip-text text-transparent">
              Quadrus
            </span>
          </div>

          <nav className="flex items-center gap-4 border-l border-slate-200 pl-6">
            <span
              onClick={() => setSelectedProject(null)}
              className="font-bold text-sm text-slate-800 cursor-pointer hover:text-brand-600 transition-colors"
            >
              Projetos
            </span>

            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 font-semibold text-xs border border-brand-200 transition-all active:scale-95"
              >
                <span>Selecionar projeto</span>
                <ChevronDown size={14} className={`transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {dropdownOpen && (
                <div className="absolute left-0 mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-lg py-2 z-50 animate-fade-in text-left">
                  <div className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
                    Selecionar Projeto
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    <button
                      onClick={() => {
                        setSelectedProject(null);
                        setDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs font-bold text-brand-600 hover:bg-brand-50 transition-colors"
                    >
                      Ver todos os projetos (Lista)
                    </button>
                    {projects.map((project) => (
                      <button
                        key={project.id_projeto}
                        onClick={() => {
                          setSelectedProject(project);
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
              <span className="text-xs px-2.5 py-1 rounded-full border border-brand-200 bg-brand-50 text-brand-700 font-bold ml-2 animate-fade-in">
                {selectedProject.nome}
              </span>
            )}
          </nav>
        </div>

        {/* Lado Direito: Notificações, Dúvidas, Perfil e Sair */}
        <div className="flex items-center gap-4">
          <button
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
            title="Dúvidas / Ajuda"
            onClick={() => alert("Central de Ajuda")}
          >
            <HelpCircle size={20} />
          </button>

          <button
            className="relative p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
            title="Notificações"
            onClick={() => alert("Nenhuma notificação nova")}
          >
            <Bell size={20} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full" />
          </button>

          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <img
              src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${userDisplayName}`}
              alt="Avatar do Usuário"
              className="w-8 h-8 rounded-full border border-slate-200 bg-slate-100 object-cover"
            />
            <span className="hidden md:inline text-xs font-bold text-slate-700 uppercase tracking-tight">
              {userDisplayName}
            </span>
          </div>

          <button
            onClick={handleLogout}
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            title="Sair da Sessão"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6">
        {!selectedProject ? (
          // Passamos a lista de projetos, a função de criação e o nome do usuário logado
          <ProjectList
            projects={projects}
            onSelectProject={(project) => setSelectedProject(project)}
            onCreateProject={handleCreateProject}
            userDisplayName={userDisplayName}
          />
        ) : (
          /* Tela Provisória do Projeto Selecionado */
          <div className="text-center py-20 max-w-md mx-auto bg-white border border-slate-200 rounded-2xl p-8 shadow-sm mt-10">
            <h2 className="text-2xl font-extrabold text-brand-600">Você abriu: {selectedProject.nome}</h2>
            <p className="text-slate-500 mt-2 text-sm">O próximo passo será construirmos o Quadro Kanban aqui dentro.</p>

            <button
              onClick={() => setSelectedProject(null)}
              className="mt-6 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-md shadow-brand-500/10"
            >
              Voltar para a Lista de Projetos
            </button>
          </div>
        )}
      </main>

      {/* Rodapé */}
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
    </div>
  );
}