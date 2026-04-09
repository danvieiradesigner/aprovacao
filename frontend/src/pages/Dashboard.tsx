import { useEffect, useState } from 'react';
import { supabase, ApprovalRequest } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Clock, CheckCircle, XCircle, DollarSign } from 'lucide-react';
import { theme } from '../theme/colors';

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

      const { data: requests, error } = await query;

      if (error) throw error;

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

  const CHART_COLORS = [
    theme.colors.brand.primary,
    theme.colors.status.success.text,
    theme.colors.status.danger.text,
    theme.colors.text.muted,
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-text-primary mb-2">Dashboard</h1>
        <p className="text-text-muted text-sm md:text-base">Visão geral do sistema</p>
      </div>

      {/* Cards de estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass rounded-3xl p-4 md:p-6 border border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-warning/10">
              <Clock className="text-warning" size={24} />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-text-primary mb-1">
            {stats?.pending.count || 0}
          </h3>
          <p className="text-text-muted text-sm">Pendentes</p>
          <p className="text-warning text-sm mt-2">
            R$ {stats?.pending.total.toFixed(2) || '0.00'}
          </p>
        </div>

        <div className="glass rounded-3xl p-4 md:p-6 border border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-success/10">
              <CheckCircle className="text-success" size={24} />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-text-primary mb-1">
            {stats?.approved.count || 0}
          </h3>
          <p className="text-text-muted text-sm">Aprovadas</p>
          <p className="text-success text-sm mt-2">
            R$ {stats?.approved.total.toFixed(2) || '0.00'}
          </p>
        </div>

        <div className="glass rounded-3xl p-4 md:p-6 border border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-danger/10">
              <XCircle className="text-danger" size={24} />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-text-primary mb-1">
            {stats?.rejected.count || 0}
          </h3>
          <p className="text-text-muted text-sm">Rejeitadas</p>
          <p className="text-danger text-sm mt-2">
            R$ {stats?.rejected.total.toFixed(2) || '0.00'}
          </p>
        </div>

        <div className="glass rounded-3xl p-4 md:p-6 border border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-brand/10">
              <DollarSign className="text-brand" size={24} />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-text-primary mb-1">
            R$ {((stats?.approved.total || 0) + (stats?.pending.total || 0)).toFixed(2)}
          </h3>
          <p className="text-text-muted text-sm">Total em Processo</p>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <div className="glass rounded-3xl p-4 md:p-6 border border-border flex flex-col">
          <h3 className="text-base md:text-lg font-semibold text-text-primary mb-6">Por Status</h3>
          <div className="flex-1 min-h-[300px]">
            {stats && (stats.byStatus || []).filter(item => item.count > 0).length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={(stats?.byStatus || []).filter(item => item.count > 0)}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={4}
                    stroke="none"
                  >
                    {(stats?.byStatus || [])
                      .filter(item => item.count > 0)
                      .map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={CHART_COLORS[stats?.byStatus.findIndex(s => s.status === entry.status) % CHART_COLORS.length]} 
                        className="transition-all duration-300 hover:opacity-80 cursor-pointer"
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(17, 24, 39, 0.9)', 
                      backdropFilter: 'blur(8px)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      color: theme.colors.text.primary,
                      boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                    }} 
                    itemStyle={{ color: theme.colors.text.primary }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    iconType="circle"
                    formatter={(value) => <span className="text-text-secondary ml-1">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-text-muted">
                Nenhum dado disponível
              </div>
            )}
          </div>
        </div>

        <div className="glass rounded-3xl p-4 md:p-6 border border-border flex flex-col">
          <h3 className="text-base md:text-lg font-semibold text-text-primary mb-6">Por Base (Top 5)</h3>
          <div className="flex-1 min-h-[300px]">
            {stats && (stats.byBase || []).filter(item => item.count > 0).length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.byBase || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorBrand" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={theme.colors.brand.primary} stopOpacity={1}/>
                      <stop offset="95%" stopColor={theme.colors.brand.primary} stopOpacity={0.3}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis 
                    dataKey="base" 
                    stroke={theme.colors.text.muted} 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: theme.colors.text.secondary, fontSize: 12, dy: 10 }}
                  />
                  <YAxis 
                    stroke={theme.colors.text.muted} 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fill: theme.colors.text.secondary, fontSize: 12 }}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
                    contentStyle={{
                      backgroundColor: 'rgba(17, 24, 39, 0.9)', 
                      backdropFilter: 'blur(8px)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      color: theme.colors.text.primary,
                      boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                    }}
                  />
                  <Bar 
                    dataKey="count" 
                    fill="url(#colorBrand)" 
                    radius={[6, 6, 6, 6]} 
                    barSize={42}
                    className="transition-all duration-300 hover:opacity-80 cursor-pointer"
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-text-muted">
                Nenhum dado disponível
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
