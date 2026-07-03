import React, { useState } from 'react';
import api from '../utils/api.js';
import { X, Sliders, Settings, Trash2 } from 'lucide-react';

const PRESET_COLORS = [
  "#EF4444", // Vermelho
  "#F59E0B", // Amarelo
  "#10B981", // Verde
  "#3B82F6", // Azul
  "#6366F1", // ÍNDIGO
  "#8B5CF6", // Roxo
  "#EC4899", // Rosa
  "#64748B", // Cinza
  "#7C3AED"  // Violeta
];

const presetColorsMap = {
  "#EF4444": { bg: "#FEE2E2", text: "#991B1B", border: "#FCA5A5" },
  "#F59E0B": { bg: "#FEF3C7", text: "#92400E", border: "#FCD34D" },
  "#10B981": { bg: "#D1FAE5", text: "#065F46", border: "#6EE7B7" },
  "#3B82F6": { bg: "#DBEAFE", text: "#1E40AF", border: "#93C5FD" },
  "#6366F1": { bg: "#E0E7FF", text: "#3730A3", border: "#A5B4FC" },
  "#8B5CF6": { bg: "#F3E8FF", text: "#5B21B6", border: "#C084FC" },
  "#EC4899": { bg: "#FCE7F3", text: "#9D174D", border: "#F9A8D4" },
  "#64748B": { bg: "#F1F5F9", text: "#334155", border: "#CBD5E1" },
  "#7C3AED": { bg: "#EDE9FE", text: "#5B21B6", border: "#C4B5FD" }
};

const getColors = (hex) => {
  return presetColorsMap[hex] || { bg: "#F1F5F9", text: "#334155", border: "#CBD5E1" };
};

export default function BoardConfigModal({ isOpen, onClose, project, onUpdateProject, showToast, isManager }) {
  const [boardConfigTab, setBoardConfigTab] = useState('columns'); // 'columns' | 'tags'

  // Colunas States
  const [newColName, setNewColName] = useState('');
  const [newColColor, setNewColColor] = useState('#64748B');
  const [editingColId, setEditingColId] = useState(null);
  const [editingColName, setEditingColName] = useState('');
  const [editingColColor, setEditingColColor] = useState('');

  // Etiquetas States
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#EF4444');
  const [editingTagId, setEditingTagId] = useState(null);
  const [editingTagName, setEditingTagName] = useState('');
  const [editingTagColor, setEditingTagColor] = useState('');

  if (!isOpen) return null;

  const colunasList = (project.colunas && project.colunas.length > 0)
    ? project.colunas
    : [
      { id_coluna: 'A_FAZER', nome: 'A FAZER', cor: '#64748B' },
      { id_coluna: 'EM_ANDAMENTO', nome: 'EM ANDAMENTO', cor: '#F59E0B' },
      { id_coluna: 'HOMOLOGACAO', nome: 'HOMOLOGAÇÃO', cor: '#8B5CF6' },
      { id_coluna: 'CONCLUIDO', nome: 'CONCLUÍDO', cor: '#10B981' },
    ];

  // --- Handlers de Colunas ---
  const handleCreateColumn = async (e) => {
    e.preventDefault();
    if (!newColName.trim()) return;

    try {
      const res = await api.post(`/api/projetos/${project.id_projeto}/colunas`, {
        nome: newColName.trim().toUpperCase(),
        cor: newColColor
      });

      onUpdateProject({
        ...project,
        colunas: [...colunasList, res.data]
      });

      setNewColName('');
      showToast('Coluna criada com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao criar coluna:', error);
      showToast(error.response?.data?.error || 'Erro ao criar coluna.', 'error');
    }
  };

  const handleUpdateColumn = async (id) => {
    if (!editingColName.trim()) return;
    try {
      const res = await api.put(`/api/colunas/${id}`, {
        nome: editingColName.trim().toUpperCase(),
        cor: editingColColor
      });

      onUpdateProject({
        ...project,
        colunas: colunasList.map(c => c.id_coluna === id ? res.data : c)
      });

      setEditingColId(null);
      showToast('Coluna atualizada com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao atualizar coluna:', error);
      showToast(error.response?.data?.error || 'Erro ao atualizar coluna.', 'error');
    }
  };

  const handleDeleteColumn = async (colId) => {
    try {
      await api.delete(`/api/colunas/${colId}`);
      onUpdateProject({
        ...project,
        colunas: colunasList.filter(c => c.id_coluna !== colId)
      });
      showToast('Coluna excluída com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao excluir coluna:', error);
      showToast(error.response?.data?.error || 'Erro ao excluir coluna.', 'error');
    }
  };

  // --- Handlers de Etiquetas ---
  const handleCreateTag = async (e) => {
    e.preventDefault();
    if (!newTagName.trim()) return;

    try {
      const res = await api.post(`/api/projetos/${project.id_projeto}/etiquetas`, {
        nome: newTagName.trim().toUpperCase(),
        cor: newTagColor
      });

      onUpdateProject({
        ...project,
        etiquetas: [...(project.etiquetas || []), res.data]
      });

      setNewTagName('');
      showToast('Etiqueta criada com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao criar etiqueta:', error);
      showToast(error.response?.data?.error || 'Erro ao criar etiqueta.', 'error');
    }
  };

  const handleUpdateTag = async (id) => {
    if (!editingTagName.trim()) return;
    try {
      const res = await api.put(`/api/etiquetas/${id}`, {
        nome: editingTagName.trim().toUpperCase(),
        cor: editingTagColor
      });

      onUpdateProject({
        ...project,
        etiquetas: (project.etiquetas || []).map(et => et.id_etiqueta === id ? res.data : et),
        cards: (project.cards || []).map(card => ({
          ...card,
          etiquetas: (card.etiquetas || []).map(et => et.id_etiqueta === id ? res.data : et)
        }))
      });

      setEditingTagId(null);
      showToast('Etiqueta atualizada com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao atualizar etiqueta:', error);
      showToast(error.response?.data?.error || 'Erro ao atualizar etiqueta.', 'error');
    }
  };

  const handleDeleteTag = async (id) => {
    try {
      await api.delete(`/api/etiquetas/${id}`);
      onUpdateProject({
        ...project,
        etiquetas: (project.etiquetas || []).filter(et => et.id_etiqueta !== id),
        cards: (project.cards || []).map(card => ({
          ...card,
          etiquetas: (card.etiquetas || []).filter(et => et.id_etiqueta !== id)
        }))
      });
      showToast('Etiqueta excluída com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao excluir etiqueta:', error);
      showToast('Erro ao excluir etiqueta.', 'error');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in text-slate-700">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-2xl relative overflow-hidden text-left p-6 md:p-8 animate-scale-up flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-lg font-extrabold text-[#320066] flex items-center gap-2">
              <Sliders size={18} />
              Configurar Quadro e Etiquetas
            </h2>
            <p className="text-xs text-slate-450 mt-1">Gerencie as colunas do seu fluxo e as etiquetas de atividades.</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-655 hover:bg-slate-50 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-100 mb-6 shrink-0">
          <button
            onClick={() => setBoardConfigTab('columns')}
            className={`px-4 py-2.5 font-bold text-xs border-b-2 transition-all ${boardConfigTab === 'columns' ? 'border-[#320066] text-[#320066]' : 'border-transparent text-slate-400 hover:text-slate-700'}`}
          >
            Colunas (Fluxo)
          </button>
          <button
            onClick={() => setBoardConfigTab('tags')}
            className={`px-4 py-2.5 font-bold text-xs border-b-2 transition-all ${boardConfigTab === 'tags' ? 'border-[#320066] text-[#320066]' : 'border-transparent text-slate-400 hover:text-slate-700'}`}
          >
            Etiquetas (Tags)
          </button>
        </div>

        {/* Tab Content (Scrollable) */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-6">

          {/* TAB COLUNAS */}
          {boardConfigTab === 'columns' && (
            <div className="space-y-6">
              {/* Nova Coluna Form */}
              {isManager && (
                <form onSubmit={handleCreateColumn} className="bg-slate-50 p-4 border border-slate-100 rounded-xl space-y-4">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Nova Coluna</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase">Nome da Coluna</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: BLOQUEADO, REVIEW..."
                        value={newColName}
                        onChange={(e) => setNewColName(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-brand-500 text-slate-700"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase">Cor da Coluna</label>
                      <div className="flex flex-wrap gap-1.5">
                        {PRESET_COLORS.map(color => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setNewColColor(color)}
                            className={`w-6 h-6 rounded-full border-2 transition-transform ${newColColor === color ? 'scale-110 shadow' : 'opacity-85 hover:opacity-100'}`}
                            style={{ backgroundColor: color, borderColor: newColColor === color ? '#3b82f6' : 'transparent' }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end pt-2 border-t border-slate-100">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-[#320066] hover:bg-[#26004d] text-white rounded-xl font-bold text-xs shadow-md active:scale-95 transition-all"
                    >
                      Adicionar Coluna
                    </button>
                  </div>
                </form>
              )}

              {/* Lista de Colunas */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Colunas Existentes (Ordem Esquerda para Direita)</h3>
                <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl bg-white overflow-hidden">
                  {colunasList.map((col) => {
                    const isEditing = editingColId === col.id_coluna;
                    return (
                      <div key={col.id_coluna} className="p-3.5 flex items-center justify-between hover:bg-slate-50/50 transition-colors text-xs">
                        {isEditing ? (
                          <div className="flex flex-1 items-center gap-3">
                            <input
                              type="text"
                              value={editingColName}
                              onChange={(e) => setEditingColName(e.target.value)}
                              className="bg-white border border-slate-200 rounded-xl py-1 px-2.5 text-xs focus:outline-none focus:border-brand-500 font-bold text-slate-700"
                            />
                            <div className="flex gap-1">
                              {PRESET_COLORS.map(color => (
                                <button
                                  key={color}
                                  type="button"
                                  onClick={() => setEditingColColor(color)}
                                  className={`w-5 h-5 rounded-full border transition-transform ${editingColColor === color ? 'scale-110 shadow' : 'opacity-80'}`}
                                  style={{ backgroundColor: color, borderColor: editingColColor === color ? '#111' : 'transparent' }}
                                />
                              ))}
                            </div>
                            <div className="flex gap-1.5 ml-auto">
                              <button
                                onClick={() => handleUpdateColumn(col.id_coluna)}
                                className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-bold"
                              >
                                Salvar
                              </button>
                              <button
                                onClick={() => setEditingColId(null)}
                                className="px-2.5 py-1 bg-slate-200 text-slate-655 rounded-lg text-[10px] font-bold"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2">
                              <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: col.cor }} />
                              <span className="font-extrabold text-slate-700 uppercase tracking-wide">{col.nome}</span>
                            </div>
                            {isManager && !['A_FAZER', 'EM_ANDAMENTO', 'HOMOLOGACAO', 'CONCLUIDO'].includes(col.id_coluna) && (
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => {
                                    setEditingColId(col.id_coluna);
                                    setEditingColName(col.nome);
                                    setEditingColColor(col.cor);
                                  }}
                                  className="p-1 text-slate-400 hover:text-[#320066]"
                                  title="Editar Coluna"
                                >
                                  <Settings size={14} />
                                </button>
                                <button
                                  onClick={() => handleDeleteColumn(col.id_coluna)}
                                  className="p-1 text-slate-400 hover:text-rose-600"
                                  title="Excluir Coluna"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB ETIQUETAS */}
          {boardConfigTab === 'tags' && (
            <div className="space-y-6">
              {/* Nova Etiqueta Form */}
              {isManager && (
                <form onSubmit={handleCreateTag} className="bg-slate-50 p-4 border border-slate-100 rounded-xl space-y-4">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Nova Etiqueta</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase">Nome da Etiqueta</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: BUG, REQUISITO..."
                        value={newTagName}
                        onChange={(e) => setNewTagName(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-brand-500 text-slate-700"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase">Cor da Etiqueta</label>
                      <div className="flex flex-wrap gap-1.5">
                        {PRESET_COLORS.map(color => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setNewTagColor(color)}
                            className={`w-6 h-6 rounded-full border-2 transition-transform ${newTagColor === color ? 'scale-110 shadow' : 'opacity-85 hover:opacity-100'}`}
                            style={{ backgroundColor: color, borderColor: newTagColor === color ? '#3b82f6' : 'transparent' }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end pt-2 border-t border-slate-100">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-[#320066] hover:bg-[#26004d] text-white rounded-xl font-bold text-xs shadow-md active:scale-95 transition-all"
                    >
                      Adicionar Etiqueta
                    </button>
                  </div>
                </form>
              )}

              {/* Lista de Etiquetas */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Etiquetas Existentes</h3>
                <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl bg-white overflow-hidden">
                  {(project.etiquetas || []).map(et => {
                    const isEditing = editingTagId === et.id_etiqueta;
                    const colors = getColors(et.cor);
                    return (
                      <div key={et.id_etiqueta} className="p-3.5 flex items-center justify-between hover:bg-slate-50/50 transition-colors text-xs">
                        {isEditing ? (
                          <div className="flex flex-1 items-center gap-3">
                            <input
                              type="text"
                              value={editingTagName}
                              onChange={(e) => setEditingTagName(e.target.value)}
                              className="bg-white border border-slate-200 rounded-xl py-1 px-2.5 text-xs focus:outline-none focus:border-brand-500 font-bold text-slate-700"
                            />
                            <div className="flex gap-1">
                              {PRESET_COLORS.map(color => (
                                <button
                                  key={color}
                                  type="button"
                                  onClick={() => setEditingTagColor(color)}
                                  className={`w-5 h-5 rounded-full border transition-transform ${editingTagColor === color ? 'scale-110 shadow' : 'opacity-80'}`}
                                  style={{ backgroundColor: color, borderColor: editingTagColor === color ? '#111' : 'transparent' }}
                                />
                              ))}
                            </div>
                            <div className="flex gap-1.5 ml-auto">
                              <button
                                onClick={() => handleUpdateTag(et.id_etiqueta)}
                                className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-bold"
                              >
                                Salvar
                              </button>
                              <button
                                onClick={() => setEditingTagId(null)}
                                className="px-2.5 py-1 bg-slate-200 text-slate-655 rounded-lg text-[10px] font-bold"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <span
                              className="text-[10px] font-bold px-2.5 py-1 rounded bg-[#EAECEF] text-[#475569] border border-transparent animate-fade-in"
                            >
                              {et.nome}
                            </span>
                            {isManager && (
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => {
                                    setEditingTagId(et.id_etiqueta);
                                    setEditingTagName(et.nome);
                                    setEditingTagColor(et.cor);
                                  }}
                                  className="p-1 text-slate-400 hover:text-[#320066]"
                                  title="Editar Etiqueta"
                                >
                                  <Settings size={14} />
                                </button>
                                <button
                                  onClick={() => handleDeleteTag(et.id_etiqueta)}
                                  className="p-1 text-slate-400 hover:text-rose-600"
                                  title="Excluir Etiqueta"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
