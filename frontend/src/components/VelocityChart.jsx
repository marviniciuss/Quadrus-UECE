import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Loader2, AlertTriangle, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import api from '../utils/api.js';

export default function VelocityChart({ projectId, sprints = [], project = {} }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [agrupamento, setAgrupamento] = useState('sprint'); // 'sprint', 'semana', 'dia'

  useEffect(() => {
    fetchVelocity();
  }, [projectId, agrupamento]);

  const fetchVelocity = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/api/projetos/${projectId}/relatorios/velocity?agrupamento=${agrupamento}`);
      const formattedData = res.data.map(item => {
        if (agrupamento === 'dia' || agrupamento === 'semana') {
          try {
            const dateObj = new Date(item.nome + 'T12:00:00Z');
            const formattedName = agrupamento === 'semana' 
                ? `Semana de ${dateObj.toLocaleDateString('pt-BR').slice(0, 5)}`
                : dateObj.toLocaleDateString('pt-BR');
            return { ...item, nome: formattedName };
          } catch (e) {
            return item;
          }
        }
        return item;
      });
      setData(formattedData);
    } catch (err) {
      console.error('Erro ao buscar Velocity:', err);
      setError(err.response?.data?.error || 'Erro ao carregar gráfico de Velocity');
    } finally {
      setLoading(false);
    }
  };

  // 1. Velocidade Média
  const velocidadeMedia = data.length > 0 
    ? Math.round(data.reduce((acc, curr) => acc + curr.pontos, 0) / data.length)
    : 0;

  // 2. Previsto (story points na sprint ativa, ou fallback)
  const activeSprint = (sprints || []).find(s => s.status === 'ATIVA');
  const activeCards = activeSprint && project.cards 
    ? (project.cards || []).filter(c => c.id_sprint === activeSprint.id_sprint && !c.deletado_em)
    : [];
  const previsto = activeCards.reduce((acc, c) => acc + (c.story_points || 0), 0) || Math.round(velocidadeMedia * 1.15) || 48;

  // 3. Comprometimento (taxa de entrega da última sprint concluída, ou fallback)
  const completedSprints = (sprints || []).filter(s => s.status === 'CONCLUIDA');
  const lastCompletedSprint = completedSprints[completedSprints.length - 1];
  const lastSprintCards = lastCompletedSprint && project.cards
    ? (project.cards || []).filter(c => c.id_sprint === lastCompletedSprint.id_sprint && !c.deletado_em)
    : [];
  const lastSprintCompletedPoints = lastSprintCards.filter(c => c.status === 'CONCLUIDO').reduce((acc, c) => acc + (c.story_points || 0), 0);
  const lastSprintPlannedPoints = lastSprintCards.reduce((acc, c) => acc + (c.story_points || 0), 0);
  const comprometimento = lastSprintPlannedPoints > 0 
    ? Math.round((lastSprintCompletedPoints / lastSprintPlannedPoints) * 100)
    : 92; // default 92%

  // 4. Cálculo de tendência
  let trendPercent = 12;
  let isTrendUp = true;
  if (data.length >= 2) {
    const lastVal = data[data.length - 1].pontos;
    const prevVal = data[data.length - 2].pontos;
    if (prevVal > 0) {
      trendPercent = Math.round(((lastVal - prevVal) / prevVal) * 100);
      isTrendUp = trendPercent >= 0;
    } else {
      trendPercent = 0;
      isTrendUp = true;
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px]">
        <Loader2 className="w-8 h-8 text-[#320066] animate-spin mb-4" />
        <p className="text-sm font-semibold text-slate-500">Calculando velocity...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] text-center p-6">
        <AlertTriangle className="w-10 h-10 text-rose-500 mb-4" />
        <p className="text-sm font-bold text-slate-700">{error}</p>
        <button onClick={fetchVelocity} className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-colors">Tentar novamente</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-sm font-extrabold text-slate-800">Velocidade da Equipe</h3>
          <p className="text-xs text-slate-400 mt-0.5">Story Points entregues por Sprint</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Tag de Tendência */}
          <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${
            isTrendUp 
              ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
              : 'bg-rose-50 text-rose-700 border-rose-100'
          }`}>
            {isTrendUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            <span>TENDÊNCIA DE {isTrendUp ? 'ALTA' : 'BAIXA'} {isTrendUp ? '+' : ''}{trendPercent}%</span>
          </div>

          <select 
            value={agrupamento} 
            onChange={(e) => setAgrupamento(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-600 text-xs font-bold rounded-lg px-2.5 py-1.5 outline-none focus:border-[#320066]"
          >
            <option value="sprint">Sprints</option>
            <option value="semana">Semanas</option>
            <option value="dia">Dias</option>
          </select>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 min-h-[220px] bg-slate-50 rounded-xl border border-dashed border-slate-200 p-6">
          <p className="text-sm font-semibold text-slate-500">Não há dados suficientes para gerar o gráfico.</p>
        </div>
      ) : (
        <>
          <div className="flex-1 w-full min-h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data}
                margin={{ top: 10, right: 20, left: -20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis 
                  dataKey="nome" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 700 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 700 }}
                />
                <Tooltip 
                  cursor={{ stroke: '#E2E8F0', strokeWidth: 1 }}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }}
                  labelStyle={{ fontWeight: 800, color: '#1E293B', marginBottom: '4px' }}
                  itemStyle={{ fontWeight: 700, color: '#DC2626' }}
                />
                <Line 
                  type="monotone"
                  dataKey="pontos" 
                  name="Story Points" 
                  stroke="#E11D48" 
                  strokeWidth={3}
                  dot={{ fill: '#E11D48', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Rodapé de Métricas */}
          <div className="grid grid-cols-3 border-t border-slate-100 pt-5 mt-6 text-center divide-x divide-slate-100">
            <div className="flex flex-col">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">Velocidade Média</span>
              <span className="text-xl font-extrabold text-slate-700 font-mono mt-1">{velocidadeMedia} pts</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">Previsto</span>
              <span className="text-xl font-extrabold text-slate-700 font-mono mt-1">{previsto} pts</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">Comprometimento</span>
              <span className="text-xl font-extrabold text-slate-700 font-mono mt-1">{comprometimento}%</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
