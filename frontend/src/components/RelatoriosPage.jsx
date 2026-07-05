import React, { useState, useEffect } from 'react';
import { TrendingUp, FileText, Download, BarChart2 } from 'lucide-react';
import api from '../utils/api.js';
import RdaTable from './RdaTable.jsx';
import VelocityChart from './VelocityChart.jsx';

export default function RelatoriosPage({ projectId, sprints }) {
  const [activeTab, setActiveTab] = useState('rda'); // 'rda' or 'velocity'
  
  return (
    <div className="flex flex-col h-full animate-fade-in text-left">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl font-extrabold text-slate-800 flex items-center gap-3">
          <TrendingUp className="text-[#320066]" size={28} />
          Métricas e Relatórios
        </h1>
        <p className="text-slate-500 text-sm mt-1">Acompanhe a performance do seu projeto, emita relatórios de atividades concluídas (RDA) e analise o placar de pontos da equipe (Velocity).</p>
      </div>

      <div className="flex bg-slate-100 p-1 rounded-xl w-fit mb-6">
        <button
          onClick={() => setActiveTab('rda')}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'rda' ? 'bg-white text-[#320066] shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <FileText size={16} />
          RDA (Relatório de Atividades)
        </button>
        <button
          onClick={() => setActiveTab('velocity')}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'velocity' ? 'bg-white text-[#320066] shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <BarChart2 size={16} />
          Placar de Pontos (Velocity)
        </button>
      </div>

      <div className="flex-1 min-h-[500px] bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col p-6">
        {activeTab === 'rda' ? (
          <RdaTable projectId={projectId} />
        ) : (
          <VelocityChart projectId={projectId} />
        )}
      </div>
    </div>
  );
}
