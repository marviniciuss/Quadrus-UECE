import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Loader2, AlertTriangle } from 'lucide-react';
import api from '../utils/api.js';

export default function VelocityChart({ projectId }) {
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
      // Converter data do backend (nome -> formato legível dependendo do agrupamento se necessário)
      const formattedData = res.data.map(item => {
        if (agrupamento === 'dia' || agrupamento === 'semana') {
          // 'nome' vem como YYYY-MM-DD
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

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <AlertTriangle className="w-10 h-10 text-rose-500 mb-4" />
        <p className="text-sm font-bold text-slate-700">{error}</p>
        <button onClick={fetchVelocity} className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-colors">Tentar novamente</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h3 className="text-lg font-extrabold text-slate-800">Placar de Pontos</h3>
          <p className="text-xs text-slate-500 mt-1">Total de story points entregues por período</p>
        </div>
        
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-400 uppercase">Agrupar por:</label>
          <select 
            value={agrupamento} 
            onChange={(e) => setAgrupamento(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-sm font-bold rounded-lg px-3 py-1.5 outline-none focus:border-[#320066]"
          >
            <option value="sprint">Sprints</option>
            <option value="semana">Semanas</option>
            <option value="dia">Dias</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center flex-1">
          <Loader2 className="w-8 h-8 text-[#320066] animate-spin mb-4" />
          <p className="text-sm font-semibold text-slate-500">Calculando velocity...</p>
        </div>
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <p className="text-sm font-semibold text-slate-500">Não há dados suficientes para gerar o gráfico.</p>
        </div>
      ) : (
        <div className="flex-1 w-full min-h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis 
                dataKey="nome" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#64748B', fontSize: 12, fontWeight: 600 }}
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#64748B', fontSize: 12, fontWeight: 600 }}
              />
              <Tooltip 
                cursor={{ fill: '#F8FAFC' }}
                contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                labelStyle={{ fontWeight: 800, color: '#1E293B', marginBottom: '8px' }}
                itemStyle={{ fontWeight: 600 }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Bar 
                dataKey="pontos" 
                name="Pontos Entregues" 
                fill="#320066" 
                radius={[6, 6, 0, 0]} 
                barSize={40}
              />
              <Bar 
                dataKey="tarefas" 
                name="Qtd de Tarefas" 
                fill="#8B5CF6" 
                radius={[6, 6, 0, 0]} 
                barSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
