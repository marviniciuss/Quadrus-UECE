import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Server, 
  Database, 
  Layers, 
  Layout, 
  Radio, 
  Sparkles, 
  Sun, 
  Moon,
  Github
} from 'lucide-react';
import axios from 'axios';
import { io } from 'socket.io-client';
import LoginExample from './components/LoginExample.jsx';

export default function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [backendStatus, setBackendStatus] = useState('checking');
  const [socketStatus, setSocketStatus] = useState('offline');

  // Handle theme toggling
  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

  // Check backend health & WebSocket connection on load
  useEffect(() => {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';
    
    // Express REST check
    axios.get(`${BACKEND_URL}/health`)
      .then(res => {
        if (res.data.status === 'ok') {
          setBackendStatus('online');
        } else {
          setBackendStatus('degraded');
        }
      })
      .catch(() => {
        setBackendStatus('offline');
      });

    // Socket.io integration check
    const socket = io(BACKEND_URL, {
      autoConnect: true,
      reconnectionAttempts: 3
    });

    socket.on('connect', () => {
      setSocketStatus('online');
    });

    socket.on('connect_error', () => {
      setSocketStatus('offline');
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-darkbg-200 text-slate-800 dark:text-slate-100 flex flex-col transition-colors duration-300">
      
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-darkbg-100/50 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center text-white shadow-lg shadow-brand-500/20">
            <Layout size={18} />
          </div>
          <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-brand-600 to-indigo-400 bg-clip-text text-transparent">
            Quadrus
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full border border-brand-500/30 text-brand-500 bg-brand-500/10 font-medium">
            Core Skeleton
          </span>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-brand-500 dark:hover:text-brand-400 transition-colors"
            title="Mudar Tema"
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 flex flex-col items-center justify-center max-w-4xl w-full mx-auto p-6 text-center">
        
        {/* Animated Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand-500/10 text-brand-500 mb-6 border border-brand-500/20 animate-pulse">
          <Sparkles size={12} />
          Pronto para o Desenvolvimento
        </div>

        <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4 leading-tight">
          Gestão Ágil Sem Burocracia, <br />
          <span className="bg-gradient-to-r from-brand-500 to-violet-400 bg-clip-text text-transparent">
            Sincronizada em Tempo Real.
          </span>
        </h1>
        
        <p className="text-slate-600 dark:text-slate-400 max-w-xl text-lg mb-10 leading-relaxed">
          O esqueleto inicial do Quadrus foi estruturado com sucesso. As bibliotecas principais de drag-and-drop, WebSocket, banco de dados e estilo já estão importadas e prontas.
        </p>

        {/* Tech Stack Diagnostics Card */}
        <div className="w-full max-w-2xl glass-panel dark:bg-darkbg-100/40 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 text-left shadow-xl shadow-black/5">
          <h2 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">
            Componentes e Bibliotecas Carregadas
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Frontend Library Status */}
            <div className="p-4 rounded-xl bg-white/70 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/60 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
                <Layers size={20} />
              </div>
              <div>
                <h3 className="font-bold text-sm">Apresentação (Client)</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  React 18 + Vite + Tailwind CSS carregados.
                </p>
                <div className="flex gap-2 mt-2">
                  <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-mono">dnd-kit</span>
                  <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-mono">axios</span>
                </div>
              </div>
            </div>

            {/* Backend Library Status */}
            <div className="p-4 rounded-xl bg-white/70 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/60 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-green-500/10 text-green-500">
                <Server size={20} />
              </div>
              <div>
                <h3 className="font-bold text-sm">Servidor (Backend)</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Node.js + Express + Zod + JWT em prontidão.
                </p>
                <div className="flex gap-2 mt-2">
                  <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-mono">zod</span>
                  <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-mono">bcrypt</span>
                </div>
              </div>
            </div>

            {/* Realtime Event Gateway */}
            <div className="p-4 rounded-xl bg-white/70 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/60 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-pink-500/10 text-pink-500">
                <Radio size={20} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm">WebSockets (Socket.io)</h3>
                  <span className={`inline-block w-2.5 h-2.5 rounded-full ${socketStatus === 'online' ? 'bg-green-500' : 'bg-amber-500'}`} />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Barramento bidirecional para movimentações em tempo real.
                </p>
                <span className="inline-block text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-mono mt-2">
                  Socket Status: {socketStatus}
                </span>
              </div>
            </div>

            {/* Database Engine */}
            <div className="p-4 rounded-xl bg-white/70 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/60 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-500">
                <Database size={20} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm">Persistência (Prisma + Postgres)</h3>
                  <span className={`inline-block w-2.5 h-2.5 rounded-full ${backendStatus === 'online' ? 'bg-green-500' : 'bg-slate-400 dark:bg-slate-600'}`} />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Modelagem relacional e integridade de dados.
                </p>
                <span className="inline-block text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-mono mt-2">
                  REST Server: {backendStatus}
                </span>
              </div>
            </div>

          </div>

          <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Pronto para construir o quadro Kanban, Planning Poker e automações!
            </div>
            <div className="text-xs text-brand-500 font-semibold">
              Próximo passo: Criar controllers, roteadores e views.
            </div>
          </div>
        </div>

        {/* Firebase Authentication Boilerplate Form Module */}
        <div className="mt-10 w-full">
          <LoginExample />
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-6 px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400 bg-white/20 dark:bg-darkbg-100/10 backdrop-blur-sm">
        <div>
          &copy; {new Date().getFullYear()} Quadrus. Todos os direitos reservados.
        </div>
        <div className="flex items-center gap-4">
          <a href="#" className="hover:text-brand-500 transition-colors flex items-center gap-1">
            <Github size={14} />
            GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}
