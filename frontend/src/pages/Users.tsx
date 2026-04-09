import { useEffect, useState } from 'react';
import { supabase, UserProfile } from '../services/supabase';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import Select from '../components/Select';

export default function Users() {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    role: 'REQUESTER' as 'ADMIN' | 'REQUESTER' | 'APPROVER',
  });

  useEffect(() => {
    if (currentUser?.role === 'ADMIN') {
      fetchUsers();
    }
  }, [currentUser]);

  const fetchUsers = async () => {
    try {
      // Como RLS agora só permite ver próprio perfil, 
      // ADMIN precisará usar Edge Function ou service role
      // Por enquanto, vamos mostrar apenas o próprio perfil
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, username, role, created_at')
        .eq('id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      showToast('Erro ao carregar usuários. Apenas ADMIN pode ver todos os usuários.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Obter token de autenticação
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Não autenticado');
      }

      // Chamar Edge Function para criar usuário
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/create-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          username: formData.username,
          role: formData.role,
        }),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        throw new Error(result.error || 'Erro ao criar usuário');
      }

      showToast('Usuário criado com sucesso!', 'success');
      setShowModal(false);
      setFormData({ email: '', username: '', password: '', role: 'REQUESTER' });
      fetchUsers();
    } catch (error: any) {
      showToast(error.message || 'Erro ao criar usuário', 'error');
    }
  };

  if (currentUser?.role !== 'ADMIN') {
    return (
      <div className="text-center py-12 text-text-muted">
        Você não tem permissão para acessar esta página.
      </div>
    );
  }

  if (loading) {
    return <div className="text-center py-12 text-text-muted">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-text-primary mb-2">Usuários</h1>
          <p className="text-text-muted text-sm md:text-base">Gerencie os usuários do sistema</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-6 py-3 rounded-2xl bg-brand text-bg font-semibold brand-glow shadow-brand no-outline w-full sm:w-auto"
        >
          Novo Usuário
        </button>
      </div>

      <div className="glass rounded-2xl border border-border overflow-hidden">
        <table className="w-full">
          <thead className="bg-bg-input border-b border-border">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Usuário</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Role</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Criado em</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr
                key={user.id}
                className="border-b border-border hover:bg-bg-input transition-colors"
              >
                <td className="px-6 py-5 text-sm text-text-primary">{user.username}</td>
                <td className="px-6 py-5 text-sm">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      user.role === 'ADMIN'
                        ? 'bg-danger/20 text-danger'
                        : user.role === 'APPROVER'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-success/20 text-success'
                    }`}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-5 text-sm text-text-muted">
                  {new Date(user.created_at).toLocaleString('pt-BR')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="glass rounded-2xl p-6 border border-border w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-text-primary mb-4">Novo Usuário</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="w-full px-4 py-2 rounded-xl bg-bg-card border border-border text-text-primary focus:outline-none focus:border-brand-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Usuário
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                  minLength={3}
                  className="w-full px-4 py-2 rounded-xl bg-bg-card border border-border text-text-primary focus:outline-none focus:border-brand-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Senha
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength={6}
                  className="w-full px-4 py-2 rounded-xl bg-bg-card border border-border text-text-primary focus:outline-none focus:border-brand-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Role
                </label>
                <Select
                  value={formData.role}
                  onChange={(val) =>
                    setFormData({ ...formData, role: val as any })
                  }
                  options={[
                    { value: 'REQUESTER', label: 'REQUESTER' },
                    { value: 'APPROVER', label: 'APPROVER' },
                    { value: 'ADMIN', label: 'ADMIN' },
                  ]}
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-brand text-bg font-semibold brand-glow shadow-brand no-outline"
                >
                  Criar
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2 rounded-xl glass border border-border text-text-primary hover:bg-bg-input no-outline"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
