import React, { useState } from 'react';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '../utils/firebaseConfig.js';
import api from '../utils/api.js';
import { KeyRound, Mail, LogOut, CheckCircle, ShieldAlert, Terminal } from 'lucide-react';

export default function LoginExample() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userToken, setUserToken] = useState(null);
  const [backendResponse, setBackendResponse] = useState(null);
  const [userProfile, setUserProfile] = useState(null);

  // Authenticate user with Email and Password
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setBackendResponse(null);

    try {
      // Firebase authentication
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      setUserProfile(user);

      // CAPTURING ID TOKEN (JWT) TO SEND TO BACKEND
      const token = await user.getIdToken();
      setUserToken(token);

      console.log('Firebase Authentication Successful! ID Token captured.');
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Falha na autenticação.');
    } finally {
      setLoading(false);
    }
  };

  // Sign out user
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUserProfile(null);
      setUserToken(null);
      setBackendResponse(null);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Make an authorized request to protected Express route
  const testProtectedAPI = async () => {
    setBackendResponse('Carregando...');
    try {
      // The Axios interceptor in api.js automatically injects "Authorization: Bearer <idToken>"
      const response = await api.get('/api/protected');
      setBackendResponse(response.data);
    } catch (err) {
      console.error('API Error:', err);
      setBackendResponse(err.response?.data || 'Erro de conexão com o servidor.');
    }
  };

  return (
    <div className="w-full max-w-md mx-auto glass-panel dark:bg-darkbg-100/40 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 shadow-xl text-left">
      <h2 className="text-xl font-extrabold mb-4 bg-gradient-to-r from-brand-500 to-indigo-400 bg-clip-text text-transparent flex items-center gap-2">
        <KeyRound size={20} className="text-brand-500" />
        Firebase Authentication Boilerplate
      </h2>

      {!userProfile ? (
        // Login Form
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              E-mail
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 text-slate-400" size={18} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="desenvolvedor@uece.br"
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Senha
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-2.5 text-slate-400" size={18} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs font-medium text-rose-500 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-lg">
              <ShieldAlert size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm transition-all hover:shadow-lg hover:shadow-brand-500/20 disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? 'Autenticando...' : 'Entrar com E-mail e Senha'}
          </button>
        </form>
      ) : (
        // Authenticated Panel
        <div className="space-y-5">
          <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
            <CheckCircle className="text-green-500" size={24} />
            <div>
              <h3 className="font-bold text-sm text-green-500">Usuário Autenticado!</h3>
              <p className="text-xs text-slate-400 truncate max-w-[250px]">{userProfile.email}</p>
            </div>
          </div>

          {/* ID Token display */}
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Token ID Capturado (user.getIdToken())
            </h4>
            <div className="p-2.5 rounded bg-slate-950 font-mono text-[10px] text-brand-400 overflow-x-auto whitespace-nowrap border border-slate-800 max-h-16">
              {userToken}
            </div>
            <p className="text-[10px] text-slate-500">
              * Este token é anexado automaticamente em todas as requisições pelo interceptor do Axios.
            </p>
          </div>

          {/* Action triggers */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={testProtectedAPI}
              className="py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/60 text-xs font-bold flex items-center justify-center gap-1.5 hover:text-brand-500 transition-colors"
            >
              <Terminal size={14} />
              Testar API Segura
            </button>
            <button
              onClick={handleLogout}
              className="py-2.5 rounded-lg bg-slate-100 dark:bg-slate-900 text-xs font-bold flex items-center justify-center gap-1.5 hover:text-rose-500 transition-colors text-slate-600 dark:text-slate-300"
            >
              <LogOut size={14} />
              Sair da Sessão
            </button>
          </div>

          {/* Console logger response */}
          {backendResponse && (
            <div className="mt-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5 mb-2">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  Terminal de Resposta do Servidor
                </span>
                <span className="w-2 h-2 rounded-full bg-green-500" />
              </div>
              <pre className="font-mono text-[10px] text-slate-300 overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(backendResponse, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
