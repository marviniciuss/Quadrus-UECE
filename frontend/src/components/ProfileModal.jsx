import React, { useState, useEffect } from 'react';
import { X, Save, Check, Loader2, RefreshCw } from 'lucide-react';
import api from '../utils/api.js';

export default function ProfileModal({ isOpen, onClose, user, onSave }) {
  const [nome, setNome] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(null); // null means default (using name)
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Sync state with user prop when modal opens
  useEffect(() => {
    if (user) {
      setNome(user.nome || '');
      setSelectedAvatar(user.foto || null);
      setError(null);
    }
  }, [user, isOpen]);

  if (!isOpen) return null;

  const handleRandomize = () => {
    const newSeed = "Random-" + Math.floor(Math.random() * 1000000);
    setSelectedAvatar(newSeed);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nome.trim()) {
      setError('O nome é obrigatório.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.put('/api/usuarios/perfil', {
        nome: nome.trim(),
        foto: selectedAvatar
      });

      onSave(res.data);
      onClose();
    } catch (err) {
      console.error('Erro ao salvar perfil:', err);
      setError(err.response?.data?.error || 'Não foi possível atualizar o perfil.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 overflow-hidden transform transition-all animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Configurações de Perfil</h2>
            <p className="text-xs text-slate-400">Personalize seu nome e identidade no Quadrus</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-rose-600 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Nome Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
              Seu Nome
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Digite seu nome completo"
              maxLength={50}
              className="w-full text-sm px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-medium text-slate-800"
            />
          </div>

          {/* Email (Read Only) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
              Endereço de E-mail
            </label>
            <input
              type="email"
              value={user?.email || ''}
              readOnly
              className="w-full text-sm px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-400 font-medium outline-none cursor-not-allowed select-none"
            />
          </div>

          {/* Avatar Selection */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
              Escolha seu Avatar
            </label>

            <div className="flex gap-4 items-center justify-center p-3 bg-slate-50 rounded-2xl border border-slate-100">
              {/* Default Avatar */}
              <button
                type="button"
                onClick={() => setSelectedAvatar(null)}
                className={`relative flex-1 flex flex-col items-center p-4 rounded-xl border transition-all duration-200 hover:scale-[1.02] ${
                  selectedAvatar === null
                    ? 'border-brand-500 bg-brand-50/40 ring-2 ring-brand-500/20 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <img
                  src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(nome || 'User')}`}
                  alt="Avatar Padrão"
                  className="w-16 h-16 rounded-full border-2 border-white shadow-sm bg-white object-cover"
                />
                <span className="text-xs font-bold text-slate-700 mt-2">Avatar Padrão</span>
                <span className="text-[10px] text-slate-400 mt-0.5">Com seu nome</span>
                {selectedAvatar === null && (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-brand-500 rounded-full flex items-center justify-center border-2 border-white text-white shadow-sm">
                    <Check size={10} strokeWidth={3} />
                  </div>
                )}
              </button>

              {/* Random Avatar */}
              <button
                type="button"
                onClick={handleRandomize}
                className={`relative flex-1 flex flex-col items-center p-4 rounded-xl border transition-all duration-200 hover:scale-[1.02] ${
                  selectedAvatar !== null
                    ? 'border-brand-500 bg-brand-50/40 ring-2 ring-brand-500/20 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <img
                  src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(selectedAvatar || 'RandomInit')}`}
                  alt="Avatar Aleatório"
                  className="w-16 h-16 rounded-full border-2 border-white shadow-sm bg-white object-cover"
                />
                <span className="text-xs font-bold text-slate-700 mt-2">Avatar Aleatório</span>
                <span className="text-[10px] text-brand-600 font-bold mt-0.5 flex items-center gap-1">
                  🎲 Clique para sortear
                </span>
                {selectedAvatar !== null && (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-brand-500 rounded-full flex items-center justify-center border-2 border-white text-white shadow-sm">
                    <Check size={10} strokeWidth={3} />
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 active:scale-95 rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Save size={14} />
                  <span>Salvar Alterações</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
