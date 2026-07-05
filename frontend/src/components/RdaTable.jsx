import React, { useState, useEffect } from 'react';
import { Download, AlertTriangle, Loader2 } from 'lucide-react';
import api from '../utils/api.js';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';

export default function RdaTable({ projectId }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Relatório Diário de Atividades (RDA) - Tarefas Concluídas', 14, 22);

    const tableColumn = ["Nome do Card", "Pontos", "Responsável", "Concluído Por", "Data", "Sprint", "Situação do Prazo"];
    const tableRows = [];

    data.forEach(item => {
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
    const csvData = data.map(item => ({
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
      <div className="flex flex-col items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-[#320066] animate-spin mb-4" />
        <p className="text-sm font-semibold text-slate-500">Carregando relatório...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <AlertTriangle className="w-10 h-10 text-rose-500 mb-4" />
        <p className="text-sm font-bold text-slate-700">{error}</p>
        <button onClick={fetchRDA} className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-colors">Tentar novamente</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-extrabold text-slate-800">Tarefas Concluídas</h3>
        <div className="flex gap-3">
          <button
            onClick={exportCSV}
            disabled={data.length === 0}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 text-xs font-bold rounded-lg transition-all disabled:opacity-50"
          >
            <Download size={14} /> CSV
          </button>
          <button
            onClick={exportPDF}
            disabled={data.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-[#320066] hover:bg-[#26004d] text-white text-xs font-bold rounded-lg shadow-sm transition-all disabled:opacity-50"
          >
            <Download size={14} /> PDF
          </button>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <p className="text-sm font-semibold text-slate-500">Nenhuma tarefa concluída encontrada para este projeto.</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-sm flex-1">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                <th className="p-4">Card</th>
                <th className="p-4">Pontos</th>
                <th className="p-4">Responsável</th>
                <th className="p-4">Concluído Por</th>
                <th className="p-4">Data</th>
                <th className="p-4">Sprint</th>
                <th className="p-4">Situação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-sm">
              {data.map(item => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-bold text-slate-700">{item.nome}</td>
                  <td className="p-4 font-mono text-slate-600 font-semibold">{item.pontos}</td>
                  <td className="p-4 text-slate-600">{item.responsavel}</td>
                  <td className="p-4 text-slate-600">{item.concluidoPor}</td>
                  <td className="p-4 text-slate-600">{new Date(item.dataConclusao).toLocaleDateString('pt-BR')}</td>
                  <td className="p-4 text-slate-600">{item.sprint}</td>
                  <td className="p-4">
                    {item.comAtraso ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-100">
                        <AlertTriangle size={12} />
                        ATRASO ({item.atrasoDias}d)
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-100">
                        NO PRAZO
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
