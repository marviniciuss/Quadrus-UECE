import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../utils/api.js';
import { X, UserPlus, Search, Loader2 } from 'lucide-react';

export default function InviteMemberModal({ isOpen, onClose, project, onUpdateProject, showToast, isManager }) {
  const [searchEmail, setSearchEmail] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePerfil, setInvitePerfil] = useState('DEV');
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [invitingMember, setInvitingMember] = useState(false);

  const searchTimerRef = useRef(null);

  // Reset modal state when closed
  useEffect(() => {
    if (!isOpen) {
      setSearchEmail('');
      setSelectedUser(null);
      setInviteEmail('');
      setInvitePerfil('DEV');
      setShowDropdown(false);
      setSearchResults([]);
    }
  }, [isOpen]);

  // Debounced server-side search for users
  const handleSearchUsers = useCallback((query) => {
    setSearchEmail(query);
    setSelectedUser(null);
    setInviteEmail('');
    setShowDropdown(true);

    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    searchTimerRef.current = setTimeout(async () => {
      setLoadingUsers(true);
      try {
        const res = await api.get(`/api/usuarios/buscar?q=${encodeURIComponent(query.trim())}&limit=20`);
        const filtered = res.data.filter(
          u => !project.membros?.some(m => m.usuario?.email === u.email)
        );
        setSearchResults(filtered);
      } catch (err) {
        console.error(err);
        setSearchResults([]);
      } finally {
        setLoadingUsers(false);
      }
    }, 300);
  }, [project.membros]);

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setSearchEmail(user.nome);
    setInviteEmail(user.email);
    setShowDropdown(false);
  };

  const handleInviteMember = async (e) => {
    e.preventDefault();
    const finalEmail = inviteEmail || searchEmail;
    if (!finalEmail.trim()) return;
    setInvitingMember(true);
    try {
      await api.post(`/api/projetos/${project.id_projeto}/membros`, {
        email: finalEmail,
        perfil: invitePerfil
      });
      
      // Como o membro foi convidado, precisamos atualizar a lista de membros do projeto.
      // O backend retorna o novo membro criado. Vamos buscar os dados do projeto de novo
      // ou apenas recarregar para ter o estado atualizado.
      const resProj = await api.get(`/api/projetos/${project.id_projeto}`);
      onUpdateProject(resProj.data);

      onClose();
      showToast('Convite enviado com sucesso!', 'success');
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.error || 'Erro ao convidar membro.', 'error');
    } finally {
      setInvitingMember(false);
    }
  };

  const canInvite = isManager && (inviteEmail.trim() !== '' || (searchEmail.includes('@') && searchEmail.includes('.')));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in text-slate-700">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl relative overflow-hidden text-left p-6 md:p-8 animate-scale-up">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6 shrink-0">
          <h2 className="text-lg font-extrabold text-[#320066] flex items-center gap-2">
            <UserPlus size={18} />
            Convidar Membro
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-655 hover:bg-slate-50 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleInviteMember} className="space-y-4">
          
          {/* Busca por Nome ou E-mail */}
          <div className="space-y-1.5 relative">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Buscar Usuário</label>
            <div className="relative">
              <input
                type="text"
                required
                placeholder="Nome ou e-mail do usuário..."
                value={searchEmail}
                onChange={(e) => handleSearchUsers(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-xs focus:outline-none focus:border-brand-500 text-slate-700"
              />
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            </div>

            {/* Dropdown de sugestões */}
            {showDropdown && searchEmail.trim().length >= 2 && (
              <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-55 max-h-56 overflow-y-auto divide-y divide-slate-100">
                {loadingUsers ? (
                  <div className="flex items-center justify-center gap-2 py-4 text-xs text-slate-400">
                    <Loader2 className="animate-spin text-brand-600" size={14} />
                    Buscando usuários...
                  </div>
                ) : searchResults.length > 0 ? (
                  searchResults.map(user => (
                    <button
                      key={user.id_usuario}
                      type="button"
                      onClick={() => handleSelectUser(user)}
                      className="w-full p-3 text-left hover:bg-slate-50/80 transition-colors flex items-center gap-3"
                    >
                      <div className="w-7 h-7 bg-brand-50 rounded-full flex items-center justify-center text-xs font-bold text-brand-700">
                        {user.nome.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-extrabold text-slate-700 leading-none">{user.nome}</p>
                        <p className="text-[10px] text-slate-400 mt-1">{user.email}</p>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-center text-xs text-slate-400 italic">
                    Nenhum usuário disponível para convite.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* E-mail Selecionado / Input Manual */}
          {selectedUser && (
            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-between text-xs text-emerald-800">
              <div>
                <p className="font-bold">Usuário Selecionado:</p>
                <p className="text-[10px] text-emerald-600 mt-0.5">{selectedUser.nome} ({selectedUser.email})</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedUser(null);
                  setSearchEmail('');
                  setInviteEmail('');
                }}
                className="text-[10px] underline font-bold"
              >
                Limpar
              </button>
            </div>
          )}

          {/* Perfil */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Perfil no Projeto</label>
            <select
              value={invitePerfil}
              onChange={(e) => setInvitePerfil(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs focus:outline-none focus:border-brand-500 text-slate-700 font-bold"
            >
              <option value="DEV">DEV (Desenvolvedor)</option>
              <option value="PO">PO (Product Owner)</option>
              <option value="TESTER">TESTER</option>
              <option value="GERENTE">GERENTE</option>
            </select>
          </div>

          {/* Ações */}
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl font-bold text-xs active:scale-95 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!canInvite || invitingMember}
              className="px-4 py-2 bg-[#320066] hover:bg-[#26004d] text-white rounded-xl font-bold text-xs shadow-md active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {invitingMember && <Loader2 className="animate-spin" size={12} />}
              Convidar
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
