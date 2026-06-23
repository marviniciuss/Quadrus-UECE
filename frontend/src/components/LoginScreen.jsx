import React, { useState } from 'react';
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    updateProfile, 
    sendPasswordResetEmail 
} from 'firebase/auth';
import { auth } from '../utils/firebaseConfig.js';
import { KeyRound, Mail, ShieldAlert, Sparkles, User, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function LoginScreen({ onLoginSuccess }) {
    // viewMode pode ser: 'login', 'register', 'forgot_password'
    const [viewMode, setViewMode] = useState('login');
    
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    const resetMessages = () => {
        setError(null);
        setSuccessMessage(null);
    }

    const switchMode = (mode) => {
        setViewMode(mode);
        resetMessages();
        setPassword('');
        // Opcional: limpar campos dependendo da preferência
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        resetMessages();

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            onLoginSuccess(userCredential.user);
        } catch (err) {
            console.error('Login error:', err);
            handleAuthError(err);
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        resetMessages();

        if (password.length < 6) {
            setError('A senha deve ter no mínimo 6 caracteres.');
            setLoading(false);
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(userCredential.user, { displayName: name });
            // Desloga o usuário recém-criado para que ele faça login manualmente
            await auth.signOut();
            // Redireciona para a tela de login com mensagem de sucesso
            setPassword('');
            setViewMode('login');
            setSuccessMessage('Conta criada com sucesso! Faça login para continuar.');
        } catch (err) {
            console.error('Register error:', err);
            handleAuthError(err);
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        setLoading(true);
        resetMessages();

        try {
            await sendPasswordResetEmail(auth, email);
            setSuccessMessage('Se o seu e-mail estiver correto, enviaremos um link para recuperar a senha.');
        } catch (err) {
            console.error('Forgot password error:', err);
            handleAuthError(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAuthError = (err) => {
        if (err.code === 'auth/invalid-credential') {
            setError('E-mail ou senha incorretos. Por favor, tente novamente.');
        } else if (err.code === 'auth/invalid-email') {
            setError('O formato do e-mail inserido é inválido.');
        } else if (err.code === 'auth/user-not-found') {
            setError('Usuário não encontrado.');
        } else if (err.code === 'auth/wrong-password') {
            setError('Senha incorreta.');
        } else if (err.code === 'auth/email-already-in-use') {
            setError('Este e-mail já está em uso.');
        } else if (err.code === 'auth/weak-password') {
            setError('A senha é muito fraca. Tente uma senha mais forte.');
        } else if (err.code === 'auth/too-many-requests') {
            setError('Muitas tentativas. Tente novamente mais tarde.');
        } else {
            setError('Ocorreu um erro ao conectar ao servidor de autenticação.');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-stretch font-sans text-slate-800">
            {/* 1. LADO ESQUERDO: Painel de Apresentação (Escondido no celular, visível md para cima) */}
            <div className="hidden lg:flex lg:w-1/2 bg-[#320066] text-white flex-col justify-between p-12 relative overflow-hidden">
                {/* Efeito de círculo de luz no fundo */}
                <div className="absolute -top-40 -left-40 w-96 h-96 bg-brand-500/20 rounded-full blur-[120px]" />
                <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-500/20 rounded-full blur-[120px]" />

                {/* Logo e Nome do App */}
                <div className="flex items-center gap-3 z-10">
                    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 select-none filter drop-shadow-md">
                        <rect width="100" height="100" rx="30" fill="#4c1d95" />
                        <polygon points="50,23 74,37 74,63 50,77 26,63 26,37" fill="white" stroke="white" strokeWidth="6" strokeLinejoin="round" />
                        <path d="M 50,50 L 50,81 M 50,50 L 22,34 M 50,50 L 78,34" stroke="#4c1d95" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="font-extrabold text-2xl tracking-tight bg-gradient-to-r from-white to-brand-200 bg-clip-text text-transparent">
                        Quadrus
                    </span>
                </div>

                {/* Textos Informativos e Slogan */}
                <div className="my-auto z-10 max-w-md text-left space-y-6">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-brand-200 border border-white/10">
                        <Sparkles size={12} className="animate-pulse" />
                        Plataforma Acadêmica de Gestão Ágil
                    </div>

                    <h1 className="text-4xl font-black tracking-tight leading-tight">
                        Gerencie sprints, estime tarefas e colabore em tempo real.
                    </h1>

                    <p className="text-brand-200 text-sm leading-relaxed">
                        Elimine a burocracia das ferramentas tradicionais. Uma experiência focada em simplicidade, métricas de velocity e colaboração nativa.
                    </p>
                </div>

                {/* Rodapé do Painel Esquerdo */}
                <div className="z-10 text-xs text-brand-300">
                    &copy; {new Date().getFullYear()} Quadrus. Desenvolvido para a Engenharia de Software - UECE.
                </div>
            </div>

            {/* 2. LADO DIREITO: Formulário */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 md:p-16 bg-white overflow-y-auto">
                <div className="w-full max-w-md space-y-8 text-left transition-all duration-300">

                    {/* Header Mobile / Info */}
                    <div>
                        <div className="lg:hidden flex items-center gap-2 mb-6">
                            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8">
                                <rect width="100" height="100" rx="30" fill="#320066" />
                                <polygon points="50,23 74,37 74,63 50,77 26,63 26,37" fill="white" stroke="white" strokeWidth="6" strokeLinejoin="round" />
                                <path d="M 50,50 L 50,81 M 50,50 L 22,34 M 50,50 L 78,34" stroke="#320066" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-brand-600 to-indigo-600 bg-clip-text text-transparent">
                                Quadrus
                            </span>
                        </div>

                        {viewMode === 'login' && (
                            <>
                                <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">
                                    Acesse sua conta
                                </h2>
                                <p className="text-slate-500 text-sm mt-2">
                                    Insira suas credenciais acadêmicas para entrar no espaço de trabalho.
                                </p>
                            </>
                        )}
                        {viewMode === 'register' && (
                            <>
                                <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">
                                    Criar nova conta
                                </h2>
                                <p className="text-slate-500 text-sm mt-2">
                                    Junte-se à plataforma e comece a gerenciar seus projetos ágeis.
                                </p>
                            </>
                        )}
                        {viewMode === 'forgot_password' && (
                            <>
                                <button onClick={() => switchMode('login')} aria-label="Voltar para a tela de login" className="flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700 transition-colors mb-4 group">
                                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                                    Voltar para o login
                                </button>
                                <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">
                                    Recuperar Senha
                                </h2>
                                <p className="text-slate-500 text-sm mt-2">
                                    Informe seu e-mail para receber um link de redefinição de senha.
                                </p>
                            </>
                        )}
                    </div>

                    {/* Alertas */}
                    {error && (
                        <div className="flex items-start gap-2.5 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-100 p-3.5 rounded-xl animate-fade-in">
                            <ShieldAlert size={16} className="shrink-0 text-rose-500 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}
                    {successMessage && (
                        <div className="flex items-start gap-2.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 p-3.5 rounded-xl animate-fade-in">
                            <CheckCircle2 size={16} className="shrink-0 text-emerald-500 mt-0.5" />
                            <span>{successMessage}</span>
                        </div>
                    )}

                    {/* Formulários */}
                    <form 
                        onSubmit={
                            viewMode === 'login' ? handleLogin : 
                            viewMode === 'register' ? handleRegister : 
                            handleForgotPassword
                        } 
                        className="space-y-5 animate-fade-in"
                    >
                        {viewMode === 'register' && (
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                                    Nome Completo
                                </label>
                                <div className="relative">
                                    <User className="absolute left-3 top-3 text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        required
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Seu nome completo"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all placeholder-slate-400"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Input E-mail */}
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                                E-mail
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 text-slate-400" size={18} />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="seuemail@uece.br"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all placeholder-slate-400"
                                />
                            </div>
                        </div>

                        {/* Input Senha */}
                        {viewMode !== 'forgot_password' && (
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                                        Senha
                                    </label>
                                    {viewMode === 'login' && (
                                        <button 
                                            type="button" 
                                            onClick={() => switchMode('forgot_password')} 
                                            aria-label="Ir para a tela de recuperação de senha"
                                            className="text-xs font-bold text-brand-600 hover:text-brand-500 transition-colors"
                                        >
                                            Esqueceu a senha?
                                        </button>
                                    )}
                                </div>
                                <div className="relative">
                                    <KeyRound className="absolute left-3 top-3 text-slate-400" size={18} />
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all placeholder-slate-400"
                                    />
                                </div>
                                {viewMode === 'register' && (
                                    <p className="text-[10px] text-slate-500">A senha deve ter pelo menos 6 caracteres.</p>
                                )}
                            </div>
                        )}

                        {/* Botão de Enviar */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-bold text-sm transition-all shadow-md shadow-brand-500/10 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none mt-2"
                        >
                            {loading ? 'Processando...' : 
                                viewMode === 'login' ? 'Entrar na Plataforma' : 
                                viewMode === 'register' ? 'Criar Conta' : 
                                'Enviar Link de Recuperação'}
                        </button>
                    </form>

                    {/* Footer Alternar Modo */}
                    {viewMode === 'login' && (
                        <div className="text-center text-sm text-slate-500 mt-6">
                            Não possui uma conta?{' '}
                            <button 
                                onClick={() => switchMode('register')} 
                                aria-label="Ir para a tela de criação de conta"
                                className="font-bold text-brand-600 hover:text-brand-500 transition-colors"
                            >
                                Criar conta agora
                            </button>
                        </div>
                    )}
                    {viewMode === 'register' && (
                        <div className="text-center text-sm text-slate-500 mt-6">
                            Já possui uma conta?{' '}
                            <button 
                                onClick={() => switchMode('login')} 
                                aria-label="Ir para a tela de login"
                                className="font-bold text-brand-600 hover:text-brand-500 transition-colors"
                            >
                                Fazer login
                            </button>
                        </div>
                    )}

                </div>
            </div>

        </div>
    );
}