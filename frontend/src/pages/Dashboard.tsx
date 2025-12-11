import { useEffect, useState } from 'react';
import { supabase, ApprovalRequest } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Clock, CheckCircle, XCircle, DollarSign } from 'lucide-react';

interface Stats {
  pending: { count: number; total: number };
  approved: { count: number; total: number };
  rejected: { count: number; total: number };
  byStatus: { status: string; count: number }[];
  byBase: { base: string; count: number }[];
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [user]);

  const fetchStats = async () => {
    try {
      // Buscar solicitações com RLS aplicado automaticamente
      let query = supabase
        .from('approval_requests')
        .select(`
          *,
          requester:user_profiles!approval_requests_requester_id_fkey(id, username),
          approver:user_profiles!approval_requests_approver_id_fkey(id, username)
        `)
        .order('created_at', { ascending: false });

      // RLS já filtra automaticamente baseado no role do usuário
      const { data: requests, error } = await query;

      if (error) throw error;

      // Calcula estatísticas
      const pending = (requests || []).filter((r: ApprovalRequest) => r.status === 'PENDING' || r.status === 'NEEDS_INFO');
      const approved = (requests || []).filter((r: ApprovalRequest) => r.status === 'APPROVED');
      const rejected = (requests || []).filter((r: ApprovalRequest) => r.status === 'REJECTED');

      const byStatus = [
        { status: 'Pendentes', count: pending.length },
        { status: 'Aprovadas', count: approved.length },
        { status: 'Rejeitadas', count: rejected.length },
        { status: 'Canceladas', count: (requests || []).filter((r: ApprovalRequest) => r.status === 'CANCELED').length },
      ];

      const baseMap = new Map<string, number>();
      (requests || []).forEach((r: ApprovalRequest) => {
        baseMap.set(r.base, (baseMap.get(r.base) || 0) + 1);
      });

      const byBase = Array.from(baseMap.entries()).map(([base, count]) => ({
        base,
        count,
      }));

      setStats({
        pending: {
          count: pending.length,
          total: pending.reduce((sum: number, r: ApprovalRequest) => sum + parseFloat(r.amount), 0),
        },
        approved: {
          count: approved.length,
          total: approved.reduce((sum: number, r: ApprovalRequest) => sum + parseFloat(r.amount), 0),
        },
        rejected: {
          count: rejected.length,
          total: rejected.reduce((sum: number, r: ApprovalRequest) => sum + parseFloat(r.amount), 0),
        },
        byStatus,
        byBase: byBase.slice(0, 5),
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-text-muted">Carregando...</div>;
  }

  const COLORS = ['#C6F366', '#9AA39C', '#E6EAE6', '#0F1511'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-text-primary mb-2">Dashboard</h1>
        <p className="text-text-muted">Visão geral do sistema</p>
      </div>

      {/* Cards de estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass rounded-3xl p-6 border border-border-neon">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-yellow-500/10">
              <Clock className="text-yellow-400" size={24} />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-text-primary mb-1">
            {stats?.pending.count || 0}
          </h3>
          <p className="text-text-muted text-sm">Pendentes</p>
          <p className="text-neon-primary text-sm mt-2">
            R$ {stats?.pending.total.toFixed(2) || '0.00'}
          </p>
        </div>

        <div className="glass rounded-3xl p-6 border border-border-neon">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-green-500/10">
              <CheckCircle className="text-green-400" size={24} />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-text-primary mb-1">
            {stats?.approved.count || 0}
          </h3>
          <p className="text-text-muted text-sm">Aprovadas</p>
          <p className="text-green-400 text-sm mt-2">
            R$ {stats?.approved.total.toFixed(2) || '0.00'}
          </p>
        </div>

        <div className="glass rounded-3xl p-6 border border-border-neon">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-red-500/10">
              <XCircle className="text-red-400" size={24} />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-text-primary mb-1">
            {stats?.rejected.count || 0}
          </h3>
          <p className="text-text-muted text-sm">Rejeitadas</p>
          <p className="text-red-400 text-sm mt-2">
            R$ {stats?.rejected.total.toFixed(2) || '0.00'}
          </p>
        </div>

        <div className="glass rounded-3xl p-6 border border-border-neon">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-blue-500/10">
              <DollarSign className="text-blue-400" size={24} />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-text-primary mb-1">
            R$ {((stats?.approved.total || 0) + (stats?.pending.total || 0)).toFixed(2)}
          </h3>
          <p className="text-text-muted text-sm">Total em Processo</p>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass rounded-3xl p-6 border border-border-neon">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Por Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={stats?.byStatus || []}
                dataKey="count"
                nameKey="status"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label
              >
                {(stats?.byStatus || []).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="glass rounded-3xl p-6 border border-border-neon">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Por Base (Top 5)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats?.byBase || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
              <XAxis dataKey="base" stroke="#9AA39C" />
              <YAxis stroke="#9AA39C" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0F1511',
                  border: '1px solid rgba(198, 243, 102, 0.18)',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="count" fill="#C6F366" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
