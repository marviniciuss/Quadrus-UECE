import React, { useState, useEffect } from 'react';
import api from '../utils/api.js';
import { X, History, Loader2, Play, AlertCircle, PlusCircle, RefreshCw } from 'lucide-react';

export default function ActivityLogsModal({ isOpen, onClose, project }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchLogs = async () => {
    if (!project?.id_projeto) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/api/projetos/${project.id_projeto}/logs`);
      setLogs(res.data);
    } catch (err) {
      console.error(err);
      setError('Erro ao carregar o histórico de atividades.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen, project?.id_projeto]);

  if (!isOpen) return null;

  const getBadgeStyle = (tipo) => {
    switch (tipo) {
      case 'CRIACAO':
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          label: 'Criação',
          icon: <PlusCircle size={12} className="inline mr-1" />
        };
      case 'MOVIMENTACAO':
        return {
          bg: 'bg-blue-50 text-blue-700 border-blue-200',
          label: 'Movimentação',
          icon: <Play size={12} className="inline mr-1" />
        };
      case 'ALERTA':
        return {
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          label: 'Alteração',
          icon: <AlertCircle size={12} className="inline mr-1" />
        };
      case 'COMENTARIO':
        return {
          bg: 'bg-purple-50 text-purple-700 border-purple-200',
          label: 'Comentário',
          icon: null
        };
      default:
        return {
          bg: 'bg-slate-50 text-slate-700 border-slate-200',
          label: 'Outro',
          icon: null
        };
    }
  };

  const formatarData = (dateStr) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in text-slate-700">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl relative overflow-hidden text-left p-6 md:p-8 animate-scale-up flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-5 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center text-brand-700">
              <History size={18} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[#320066] leading-none">
                Histórico de Atividades
              </h2>
              <p className="text-[10px] text-slate-400 mt-1 font-semibold">
                Registro de ações no projeto
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchLogs}
              disabled={loading}
              className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-slate-50 rounded-lg transition-colors"
              title="Atualizar"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto pr-1 min-h-0 py-1 space-y-3 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-450">
              <Loader2 className="animate-spin text-brand-600" size={24} />
              <p className="text-xs font-semibold">Buscando atividades recentes...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-center text-xs text-rose-700 font-semibold">
              {error}
            </div>
          ) : logs.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400 italic">
              Nenhuma atividade registrada no projeto ainda.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {logs.map((log) => {
                const badge = getBadgeStyle(log.tipo_acao);
                return (
                  <div key={log.id_log} className="py-3.5 flex items-start gap-3.5 first:pt-0 last:pb-0">
                    {/* User initial avatar */}
                    <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-extrabold shrink-0 border border-slate-200 uppercase">
                      {log.usuario?.foto ? (
                        <img 
                          src={log.usuario.foto} 
                          alt={log.usuario.nome} 
                          className="w-full h-full rounded-full object-cover"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        log.usuario?.nome ? log.usuario.nome.charAt(0) : '?'
                      )}
                    </div>

                    {/* Log Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-xs font-extrabold text-slate-800 leading-snug">
                          {log.usuario?.nome || 'Usuário Desconhecido'}
                        </span>
                        <span className="text-[9px] text-slate-400 font-bold shrink-0">
                          {formatarData(log.createdAt)}
                        </span>
                      </div>
                      
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed font-semibold">
                        {log.acao}
                      </p>

                      <div className="flex items-center gap-2 mt-2">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md border text-[9px] font-bold ${badge.bg}`}>
                          {badge.icon}
                          {badge.label}
                        </span>
                        {log.sprint?.nome && (
                          <span className="text-[9px] text-slate-450 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded-md font-semibold">
                            Sprint: {log.sprint.nome}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
