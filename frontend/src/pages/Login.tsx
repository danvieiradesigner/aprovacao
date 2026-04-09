import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated, isLoading } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Redirecionar se já estiver autenticado
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/app/dashboard', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(email, password);
      showToast('Login realizado com sucesso!', 'success');
      // O useEffect vai cuidar do redirecionamento quando isAuthenticated mudar
    } catch (error: any) {
      showToast(error.message || 'Erro ao fazer login', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="glass rounded-3xl p-6 md:p-8 w-full max-w-md border border-border">
        <div className="text-center mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-brand mb-2">Alçada</h1>
          <p className="text-text-muted text-sm md:text-base">Controle de Aprovação</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-bg-card border border-border text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-primary focus:brand-glow-sm transition-all"
              placeholder="admin@exemplo.com"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-bg-card border border-border text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-primary focus:brand-glow-sm transition-all"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-2xl bg-brand text-bg font-semibold brand-glow shadow-brand disabled:opacity-50 disabled:cursor-not-allowed no-outline"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}

