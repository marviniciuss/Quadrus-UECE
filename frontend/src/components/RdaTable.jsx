import React, { useState, useEffect } from 'react';
import { Download, AlertTriangle, Loader2, Calendar, User, FileText } from 'lucide-react';
import api from '../utils/api.js';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';

function AvatarWithFallback({ nome, foto, className = '', title }) {
  const seed = encodeURIComponent(nome || 'User');
  const fallbackUrl = `https://api.dicebear.com/7.x/adventurer/svg?seed=${seed}`;
  return (
    <img
      src={foto || fallbackUrl}
      alt={nome}
      className={`object-cover rounded-full ${className}`}
      title={title || nome}
      onError={(e) => {
        e.target.src = fallbackUrl;
      }}
    />
  );
}

export default function RdaTable({ projectId, project = {} }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filtros
  const [dateFilter, setDateFilter] = useState('30'); // '7', '15', '30', 'tudo'
  const [memberFilter, setMemberFilter] = useState('todos'); // name of the user or 'todos'
  
  // Paginação
  const [visibleCount, setVisibleCount] = useState(5);

  useEffect(() => {
    fetchRDA();
  }, [projectId]);

  const fetchRDA = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/api/projetos/${projectId}/relatorios/rda`);
      setData(res.data);
    } catch (err) {
      console.error('Erro ao buscar RDA:', err);
      setError(err.response?.data?.error || 'Erro ao carregar dados do RDA');
    } finally {
      setLoading(false);
    }
  };

  // Filtragem dos dados cliente-side
  const filteredData = data.filter(item => {
    // 1. Filtro de data
    if (dateFilter !== 'tudo') {
      const concluidoDate = new Date(item.dataConclusao);
      const today = new Date();
      const diffTime = Math.abs(today - concluidoDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > parseInt(dateFilter)) return false;
    }
    
    // 2. Filtro de membro
    if (memberFilter !== 'todos') {
      if (item.concluidoPor !== memberFilter) return false;
    }

    return true;
  });

  const visibleData = filteredData.slice(0, visibleCount);

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Relatorio Diario de Atividades (RDA) - Tarefas Concluidas', 14, 22);

    const tableColumn = ["Nome do Card", "Pontos", "Responsavel", "Concluido Por", "Data", "Sprint", "Situacao"];
    const tableRows = [];

    filteredData.forEach(item => {
      const date = new Date(item.dataConclusao).toLocaleDateString('pt-BR');
      const situacao = item.comAtraso ? `Atrasado (${item.atrasoDias} dias)` : "No prazo";
      const rowData = [
        item.nome || '-',
        item.pontos?.toString() || '0',
        item.responsavel || '-',
        item.concluidoPor || '-',
        date,
        item.sprint || '-',
        situacao
      ];
      tableRows.push(rowData);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 30,
      theme: 'grid',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [50, 0, 102] }
    });

    doc.save(`rda-projeto-${projectId}.pdf`);
  };

  const exportCSV = () => {
    const csvData = filteredData.map(item => ({
      'Nome do Card': item.nome,
      'Pontos': item.pontos,
      'Responsável': item.responsavel,
      'Concluído Por': item.concluidoPor,
      'Data de Conclusão': new Date(item.dataConclusao).toLocaleDateString('pt-BR'),
      'Sprint': item.sprint,
      'Situação': item.comAtraso ? `Atrasado (${item.atrasoDias} dias)` : "No prazo"
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `rda-projeto-${projectId}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px]">
        <Loader2 className="w-8 h-8 text-[#320066] animate-spin mb-4" />
        <p className="text-sm font-semibold text-slate-500">Carregando relatório...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] text-center p-6">
        <AlertTriangle className="w-10 h-10 text-rose-500 mb-4" />
        <p className="text-sm font-bold text-slate-700">{error}</p>
        <button onClick={fetchRDA} className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-colors">Tentar novamente</button>
      </div>
    );
  }

  // Lista única de colaboradores que concluíram tarefas no RDA, ou do projeto
  const uniqueMembers = project.membros 
    ? project.membros.map(m => m.usuario?.nome).filter(Boolean)
    : Array.from(new Set(data.map(item => item.concluidoPor).filter(Boolean)));

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      {/* Cabeçalho do RDA com Títulos e Filtros */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h3 className="text-sm font-extrabold text-slate-800">Relatório de Atividades (RDA)</h3>
          <p className="text-xs text-slate-400 mt-0.5">Histórico e conformidade de prazos das tarefas concluídas</p>
        </div>

        {/* Barra de Filtros */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Filtro de Data */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-600 font-bold">
            <Calendar size={14} className="text-slate-400" />
            <select
              value={dateFilter}
              onChange={(e) => { setDateFilter(e.target.value); setVisibleCount(5); }}
              className="bg-transparent outline-none cursor-pointer text-slate-700"
            >
              <option value="7">Últimos 7 Dias</option>
              <option value="15">Últimos 15 Dias</option>
              <option value="30">Últimos 30 Dias</option>
              <option value="tudo">Todo o período</option>
            </select>
          </div>

          {/* Filtro de Membros */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-600 font-bold">
            <User size={14} className="text-slate-400" />
            <select
              value={memberFilter}
              onChange={(e) => { setMemberFilter(e.target.value); setVisibleCount(5); }}
              className="bg-transparent outline-none cursor-pointer text-slate-700 max-w-[150px]"
            >
              <option value="todos">Todos os Usuários</option>
              {uniqueMembers.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          {/* Exportar PDF */}
          <button
            onClick={exportPDF}
            disabled={filteredData.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-brand-200 text-brand-700 hover:bg-brand-50 text-xs font-extrabold rounded-xl transition-all disabled:opacity-50 active:scale-95 shadow-sm"
          >
            <Download size={14} /> Exportar PDF
          </button>
        </div>
      </div>

      {filteredData.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[200px] bg-slate-50 rounded-xl border border-dashed border-slate-200 p-6 text-center">
          <FileText className="text-slate-300 mb-2" size={32} />
          <p className="text-sm font-semibold text-slate-500">Nenhuma atividade encontrada com os filtros selecionados.</p>
        </div>
      ) : (
        <div className="flex flex-col">
          {/* Tabela de Atividades */}
          <div className="overflow-x-auto border border-slate-100 rounded-xl">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  <th className="p-4">Data</th>
                  <th className="p-4">Usuário</th>
                  <th className="p-4">Atividade</th>
                  <th className="p-4">Sprint</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-xs">
                {visibleData.map(item => {
                  const formattedDate = new Date(item.dataConclusao).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  });
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-semibold text-slate-500 whitespace-nowrap">{formattedDate}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <AvatarWithFallback nome={item.concluidoPor} className="w-6 h-6 border border-slate-200" />
                          <span className="font-bold text-slate-700">{item.concluidoPor}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="font-medium text-slate-600">
                          Concluiu a tarefa <strong className="text-slate-800 font-bold">"{item.nome}"</strong>
                        </span>
                      </td>
                      <td className="p-4 font-bold text-slate-500">{item.sprint}</td>
                      <td className="p-4">
                        {item.comAtraso ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-100 uppercase">
                            Atrasado ({item.atrasoDias}d)
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase">
                            No Prazo
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Botão Carregar Mais */}
          {visibleCount < filteredData.length && (
            <div className="flex justify-center mt-5">
              <button
                onClick={() => setVisibleCount(prev => prev + 5)}
                className="px-6 py-2.5 text-xs font-extrabold text-[#320066] hover:bg-[#320066]/5 rounded-xl border border-slate-200 bg-white transition-all active:scale-95 shadow-sm uppercase tracking-wider"
              >
                Carregar mais registros
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
