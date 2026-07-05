import React, { useState } from 'react';
import {
    Users,
    CheckSquare,
    Plus,
    Search,
    ArrowRight,
    Clock,
    Briefcase,
    X,
    Calendar,
    Loader2
} from 'lucide-react';

export default function ProjectList({ projects, projectsLoading, onSelectProject, onCreateProject, userDisplayName, showArchived, setShowArchived }) {
    const [searchTerm, setSearchTerm] = useState('');

    // Estados para controlar o formulário do Novo Projeto
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [nome, setNome] = useState('');
    const [descricao, setDescricao] = useState('');
    const [prazo, setPrazo] = useState('');
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState(null);

    const getDaysRemaining = (dateString) => {
        if (!dateString) return null;
        const deadline = new Date(dateString);
        const today = new Date();
        const diffTime = deadline - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    const filteredProjects = projects.filter(project =>
        project.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (project.descricao || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Envio do formulário de criação de projeto
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!nome || !descricao || !prazo) return;

        setCreating(true);
        setCreateError(null);

        try {
            await onCreateProject({
                nome,
                descricao,
                data_prazo: new Date(prazo).toISOString(),
            });

            // Reseta os campos do formulário
            setNome('');
            setDescricao('');
            setPrazo('');
            setIsModalOpen(false);
        } catch (error) {
            setCreateError('Erro ao criar quadro. Tente novamente.');
        } finally {
            setCreating(false);
        }
    };

    // Estado de carregamento
    if (projectsLoading) {
        return (
            <div className="w-full max-w-4xl mx-auto px-4 py-16 flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mb-4" />
                <p className="text-sm font-semibold text-slate-500">Carregando seus quadros...</p>
            </div>
        );
    }

    return (
        <div className="w-full max-w-4xl mx-auto px-4 py-6 relative">

            {/* Barra de Busca e Filtros */}
            <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
                <div className="relative flex-1 text-left w-full">
                    <Search className="absolute left-4 top-3.5 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Pesquisar quadro..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all placeholder-slate-400 shadow-sm"
                    />
                </div>
                
                <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-sm shrink-0 w-full sm:w-auto">
                    <button
                        onClick={() => setShowArchived(false)}
                        className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all ${!showArchived ? 'bg-brand-50 text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Quadros Ativos
                    </button>
                    <button
                        onClick={() => setShowArchived(true)}
                        className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all ${showArchived ? 'bg-brand-50 text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Arquivados
                    </button>
                </div>
            </div>

            {/* Lista de Projetos */}
            {filteredProjects.length > 0 ? (
                <div className="space-y-4">
                    {filteredProjects.map((project) => {
                        const totalCards = (project.cards || []).length;
                        const completedCards = (project.cards || []).filter(c => c.status === 'CONCLUIDO').length;
                        const progressPercentage = totalCards > 0 ? Math.round((completedCards / totalCards) * 100) : 0;
                        const daysLeft = getDaysRemaining(project.data_prazo);

                        return (
                            <div
                                key={project.id_projeto}
                                className="group relative flex flex-col bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-brand-500/40 transition-all duration-300 cursor-pointer text-left overflow-hidden"
                                onClick={() => onSelectProject(project)}
                            >
                                <div className="absolute top-0 bottom-0 left-0 w-[4px] bg-gradient-to-b from-brand-600 to-indigo-500 transform scale-y-0 group-hover:scale-y-100 transition-transform duration-300 rounded-l-2xl" />

                                <div className="flex items-start gap-4">
                                    <div className="p-3 rounded-xl bg-brand-55 text-brand-600 shrink-0 bg-brand-50">
                                        <Briefcase size={22} />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-extrabold text-lg text-brand-600 group-hover:text-brand-700 transition-colors">
                                            {project.nome}
                                        </h3>
                                        <p className="text-sm text-slate-500 mt-2 whitespace-pre-line leading-relaxed">
                                            {project.descricao}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">

                                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                                        <span className="flex items-center gap-1 font-medium bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-lg">
                                            <Users size={14} className="text-slate-400" />
                                            {(project.membros || []).length} {(project.membros || []).length === 1 ? 'membro' : 'membros'}
                                        </span>

                                        <span className="flex items-center gap-1 font-medium bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-lg">
                                            <CheckSquare size={14} className="text-slate-400" />
                                            {totalCards} {totalCards === 1 ? 'tarefa' : 'tarefas'}
                                        </span>

                                        {daysLeft !== null && (
                                            <span className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1 ${daysLeft < 20
                                                ? 'bg-rose-50 border-rose-100 text-rose-700'
                                                : 'bg-emerald-50 border-emerald-100 text-emerald-700'
                                                }`}>
                                                <Clock size={12} />
                                                {daysLeft > 0 ? `${daysLeft} ${daysLeft === 1 ? 'dia restante' : 'dias restantes'}` : 'Atrasado'}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto">
                                        <div className="w-full md:w-36">
                                            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mb-1">
                                                <span>PROGRESSO</span>
                                                <span>{progressPercentage}%</span>
                                            </div>
                                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-brand-600 to-indigo-500 rounded-full"
                                                    style={{ width: `${progressPercentage}%` }}
                                                />
                                            </div>
                                        </div>

                                        <span className="text-brand-600 font-bold group-hover:translate-x-1 transition-transform flex items-center gap-1 text-sm shrink-0">
                                            Abrir <ArrowRight size={16} />
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-16 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                    <Briefcase className="mx-auto text-slate-400 mb-3" size={40} />
                    <h3 className="font-bold text-lg text-slate-800">
                        {projects.length === 0 ? 'Você ainda não participa de nenhum quadro' : 'Nenhum quadro encontrado'}
                    </h3>
                    {projects.length === 0 && (
                        <p className="text-sm text-slate-500 mt-2">Crie um novo quadro para começar a gerenciar suas tarefas.</p>
                    )}
                </div>
            )}

            {/* Botão Novo Projeto que agora abre o modal */}
            <div className="mt-12 flex justify-center">
                <button
                    onClick={() => { setIsModalOpen(true); setCreateError(null); }}
                    className="flex items-center justify-center gap-2 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-bold text-sm px-6 py-3 rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-brand-500/20 active:scale-95 shadow-md shadow-brand-500/10"
                >
                    <Plus size={18} />
                    Novo Quadro
                </button>
            </div>

            {/* ================= MODAL DE CRIAÇÃO DE PROJETO ================= */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">

                    {/* Caixa do Modal */}
                    <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl relative overflow-hidden text-left p-6 md:p-8 animate-scale-up">

                        {/* Header do Modal */}
                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                            <div>
                                <h2 className="text-xl font-extrabold text-brand-600 flex items-center gap-2">
                                    <Briefcase size={20} />
                                    Criar Novo Quadro
                                </h2>
                                <p className="text-xs text-slate-400 mt-1">Insira os detalhes e prazos para o novo espaço ágil.</p>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Alerta de Erro */}
                        {createError && (
                            <div className="mb-4 flex items-center gap-2 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-100 p-3 rounded-xl">
                                <span>{createError}</span>
                            </div>
                        )}

                        {/* Formulário */}
                        <form onSubmit={handleSubmit} className="space-y-5">

                            {/* Campo Nome */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                                    Nome do Quadro
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={nome}
                                    onChange={(e) => setNome(e.target.value)}
                                    placeholder="Ex: Quadrus - Kanban Colaborativo"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all placeholder-slate-400"
                                />
                            </div>

                            {/* Campo Descrição */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                                    Descrição do Escopo
                                </label>
                                <textarea
                                    required
                                    rows="3"
                                    value={descricao}
                                    onChange={(e) => setDescricao(e.target.value)}
                                    placeholder="Descreva de forma simples o escopo deste quadro para a equipe..."
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all placeholder-slate-400 resize-none leading-relaxed"
                                />
                            </div>

                            {/* Campo Prazo */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                                    Prazo de Entrega (Deadline)
                                </label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-3 text-slate-400" size={18} />
                                    <input
                                        type="date"
                                        required
                                        value={prazo}
                                        onChange={(e) => setPrazo(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-11 pr-4 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all text-slate-700"
                                    />
                                </div>
                            </div>

                            {/* Botões do Rodapé */}
                            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    disabled={creating}
                                    className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 font-semibold text-xs transition-colors disabled:opacity-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-bold text-xs transition-all shadow-md shadow-brand-500/10 active:scale-[0.98] disabled:opacity-50 flex items-center gap-2"
                                >
                                    {creating && <Loader2 size={14} className="animate-spin" />}
                                    {creating ? 'Criando...' : 'Criar Quadro'}
                                </button>
                            </div>

                        </form>

                    </div>
                </div>
            )}

        </div>
    );
}