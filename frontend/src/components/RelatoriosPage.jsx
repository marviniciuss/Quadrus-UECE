import React from 'react';
import { TrendingUp, Users, Gauge, CheckCircle } from 'lucide-react';
import RdaTable from './RdaTable.jsx';
import VelocityChart from './VelocityChart.jsx';

export default function RelatoriosPage({ projectId, sprints = [], project = {} }) {
  // 1. Colaboradores Ativos
  const totalColaboradores = project.membros?.length || 0;

  // 2. Saúde da Sprint (cards no prazo vs em risco)
  const activeSprint = (sprints || []).find(s => s.status === 'ATIVA');
  const activeCards = activeSprint && project.cards 
    ? (project.cards || []).filter(c => c.id_sprint === activeSprint.id_sprint && !c.deletado_em)
    : [];
  const totalActiveCards = activeCards.length;
  const riskyActiveCards = activeCards.filter(c => c.em_risco).length;
  const saudeSprint = totalActiveCards > 0 
    ? Math.round(((totalActiveCards - riskyActiveCards) / totalActiveCards) * 100)
    : 100; // default 100% when no active cards

  // 3. Progresso da Sprint (story points concluídos vs planejados na sprint ativa)
  const totalActivePoints = activeCards.reduce((acc, c) => acc + (c.story_points || 0), 0);
  const completedActivePoints = activeCards
    .filter(c => c.status === 'CONCLUIDO')
    .reduce((acc, c) => acc + (c.story_points || 0), 0);
  const progressoSprint = totalActivePoints > 0 
    ? Math.round((completedActivePoints / totalActivePoints) * 100)
    : 0;

  return (
    <div className="flex flex-col gap-6 animate-fade-in text-left">
      {/* Título e Subtítulo */}
      <div>
        <h1 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
          <TrendingUp className="text-[#320066]" size={24} />
          Desempenho e Governança
        </h1>
        <p className="text-slate-400 text-xs mt-1">
          Analise a eficiência da sprint, relatórios de atividade e gerencie controles de acesso da equipe.
        </p>
      </div>

      {/* Grid Principal: Gráfico de Linha + Cards de KPI */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de Linha (Velocidade) */}
        <div className="lg:col-span-2">
          <VelocityChart projectId={projectId} sprints={sprints} project={project} />
        </div>

        {/* Stack de KPIs */}
        <div className="grid grid-cols-3 lg:flex lg:flex-col gap-4 justify-between">
          {/* Card 1: Colaboradores Ativos */}
          <div 
            title="Quantidade de membros ativos vinculados a este projeto."
            className="bg-gradient-to-br from-blue-600 to-blue-500 text-white rounded-2xl p-3 sm:p-5 shadow-sm flex flex-col justify-between h-[115px] transition-all hover:shadow-md cursor-help"
          >
            <div className="flex justify-between items-start gap-1">
              <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-blue-100 leading-tight">Colaboradores Ativos</span>
              <Users size={16} className="text-blue-100 opacity-80 shrink-0" />
            </div>
            <span className="text-xl sm:text-2xl font-extrabold mt-1 font-mono">{totalColaboradores}</span>
          </div>

          {/* Card 2: Saúde da Sprint */}
          <div 
            title="Porcentagem de tarefas da Sprint ativa que não estão sinalizadas em risco."
            className="bg-[#21003e] text-white rounded-2xl p-3 sm:p-5 shadow-sm flex flex-col justify-between h-[115px] transition-all hover:shadow-md cursor-help"
          >
            <div className="flex justify-between items-start gap-1">
              <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-purple-200 leading-tight">Saúde da Sprint</span>
              <Gauge size={16} className="text-purple-200 opacity-80 shrink-0" />
            </div>
            <span className="text-xl sm:text-2xl font-extrabold mt-1 font-mono">{saudeSprint}%</span>
          </div>

          {/* Card 3: Progresso da Sprint */}
          <div 
            title="Porcentagem de Story Points entregues (em cards concluídos) em relação ao total planejado para a Sprint ativa."
            className="bg-gradient-to-br from-emerald-600 to-emerald-500 text-white rounded-2xl p-3 sm:p-5 shadow-sm flex flex-col justify-between h-[115px] transition-all hover:shadow-md cursor-help"
          >
            <div className="flex justify-between items-start gap-1">
              <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-emerald-100 leading-tight">Progresso da Sprint</span>
              <CheckCircle size={16} className="text-emerald-100 opacity-80 shrink-0" />
            </div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mt-1 gap-1">
              <span className="text-xl sm:text-2xl font-extrabold font-mono leading-none">{progressoSprint}%</span>
              <span className="text-[8px] sm:text-[10px] font-bold text-emerald-100/90 font-mono mb-0.5 whitespace-nowrap">{completedActivePoints}/{totalActivePoints} pts</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabela do RDA */}
      <div className="w-full">
        <RdaTable projectId={projectId} project={project} />
      </div>
    </div>
  );
}
