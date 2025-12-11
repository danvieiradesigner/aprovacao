import { useEffect, useState } from 'react';
import { supabase, ApprovalRequest } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import DataTable from '../components/DataTable';

export default function AllRequests() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    base: '',
    requester: '',
    dateFrom: '',
    dateTo: '',
  });
  const [editingStatus, setEditingStatus] = useState<{ id: string; status: string } | null>(null);

  useEffect(() => {
    fetchRequests();
  }, [user]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('approval_requests')
        .select(`
          *,
          requester:user_profiles!approval_requests_requester_id_fkey(id, username),
          approver:user_profiles!approval_requests_approver_id_fkey(id, username)
        `)
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      setRequests(data || []);
    } catch (error: any) {
      showToast('Erro ao carregar solicitações', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (requestId: string, newStatus: string) => {
    if (!user) return;

    try {
      const { error: updateError } = await supabase
        .from('approval_requests')
        .update({ status: newStatus })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // Criar evento
      const actionMap: Record<string, string> = {
        PENDING: 'UPDATE_NOTE',
        NEEDS_INFO: 'NEEDS_INFO',
        APPROVED: 'APPROVE',
        REJECTED: 'REJECT',
        CANCELED: 'CANCEL',
      };

      const { error: eventError } = await supabase
        .from('request_events')
        .insert({
          request_id: requestId,
          actor_id: user.id,
          action: actionMap[newStatus] || 'UPDATE_NOTE',
          message: `Status alterado para ${newStatus}`,
        });

      if (eventError) throw eventError;

      showToast('Status atualizado com sucesso!', 'success');
      setEditingStatus(null);
      fetchRequests();
    } catch (error: any) {
      showToast(error.message || 'Erro ao atualizar status', 'error');
    }
  };

  const filteredRequests = requests.filter((req) => {
    if (filters.status && req.status !== filters.status) return false;
    if (filters.base && !req.base.toLowerCase().includes(filters.base.toLowerCase())) return false;
    if (filters.requester && !req.requester?.username.toLowerCase().includes(filters.requester.toLowerCase())) return false;
    if (filters.dateFrom && new Date(req.created_at) < new Date(filters.dateFrom)) return false;
    if (filters.dateTo && new Date(req.created_at) > new Date(filters.dateTo)) return false;
    return true;
  });

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-yellow-500/20 text-yellow-400',
      NEEDS_INFO: 'bg-orange-500/20 text-orange-400',
      APPROVED: 'bg-green-500/20 text-green-400',
      REJECTED: 'bg-red-500/20 text-red-400',
      CANCELED: 'bg-text-muted/20 text-text-muted',
    };
    const labels: Record<string, string> = {
      PENDING: 'Pendente',
      NEEDS_INFO: 'Esclarecer',
      APPROVED: 'Aprovada',
      REJECTED: 'Rejeitada',
      CANCELED: 'Cancelada',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${colors[status] || colors.PENDING}`}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-text-primary mb-2">Todas as Solicitações</h1>
        <p className="text-text-muted">Visualize e gerencie todas as solicitações</p>
      </div>

      {/* Filtros */}
      <div className="glass rounded-3xl p-6 border border-border-neon">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-4 py-2 rounded-xl bg-dark-surface border border-border-neon text-text-primary focus:outline-none focus:border-neon-primary"
            >
              <option value="">Todos</option>
              <option value="PENDING">Pendente</option>
              <option value="NEEDS_INFO">Esclarecer</option>
              <option value="APPROVED">Aprovada</option>
              <option value="REJECTED">Rejeitada</option>
              <option value="CANCELED">Cancelada</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">Base</label>
            <input
              type="text"
              value={filters.base}
              onChange={(e) => setFilters({ ...filters, base: e.target.value })}
              placeholder="Filtrar por base..."
              className="w-full px-4 py-2 rounded-xl bg-dark-surface border border-border-neon text-text-primary placeholder:text-text-muted focus:outline-none focus:border-neon-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">Solicitante</label>
            <input
              type="text"
              value={filters.requester}
              onChange={(e) => setFilters({ ...filters, requester: e.target.value })}
              placeholder="Filtrar por solicitante..."
              className="w-full px-4 py-2 rounded-xl bg-dark-surface border border-border-neon text-text-primary placeholder:text-text-muted focus:outline-none focus:border-neon-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">Data Inicial</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                className="w-full px-4 py-2 rounded-xl bg-dark-surface border border-border-neon text-text-primary focus:outline-none focus:border-neon-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">Data Final</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                className="w-full px-4 py-2 rounded-xl bg-dark-surface border border-border-neon text-text-primary focus:outline-none focus:border-neon-primary"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="glass rounded-3xl border border-border-neon overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-dark-surface-alt border-b border-border-neon">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-text-primary">Código</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-text-primary">Base</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-text-primary">Descrição</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-text-primary">Valor</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-text-primary">Solicitante</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-text-primary">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-text-primary">Criado em</th>
                {user?.role === 'ADMIN' && (
                  <th className="px-6 py-4 text-left text-sm font-semibold text-text-primary">Ações</th>
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={user?.role === 'ADMIN' ? 8 : 7} className="px-6 py-12 text-center text-text-muted">
                    Carregando...
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={user?.role === 'ADMIN' ? 8 : 7} className="px-6 py-12 text-center text-text-muted">
                    Nenhuma solicitação encontrada
                  </td>
                </tr>
              ) : (
                filteredRequests.map((request) => (
                  <tr
                    key={request.id}
                    className="border-b border-border-neon hover:bg-dark-surface-alt transition-colors"
                  >
                    <td className="px-6 py-4 text-neon-primary font-medium">{request.id_code}</td>
                    <td className="px-6 py-4 text-text-primary">{request.base}</td>
                    <td className="px-6 py-4 text-text-primary max-w-md truncate">{request.description}</td>
                    <td className="px-6 py-4 text-text-primary">
                      R$ {parseFloat(request.amount).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-text-primary">{request.requester?.username || '-'}</td>
                    <td className="px-6 py-4">
                      {editingStatus?.id === request.id ? (
                        <div className="flex items-center gap-2">
                          <select
                            value={editingStatus.status}
                            onChange={(e) => setEditingStatus({ ...editingStatus, status: e.target.value })}
                            className="px-3 py-1 rounded-lg bg-dark-surface border border-border-neon text-text-primary text-xs focus:outline-none focus:border-neon-primary"
                            autoFocus
                          >
                            <option value="APPROVED">Aprovada</option>
                            <option value="REJECTED">Rejeitada</option>
                            <option value="NEEDS_INFO">Esclarecer</option>
                          </select>
                          <button
                            onClick={() => handleUpdateStatus(request.id, editingStatus.status)}
                            className="px-2 py-1 rounded-lg bg-neon-primary text-dark-bg text-xs font-semibold hover:opacity-80 transition-opacity"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => setEditingStatus(null)}
                            className="px-2 py-1 rounded-lg glass border border-border-neon text-text-primary text-xs hover:bg-dark-surface-alt transition-colors"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        getStatusBadge(request.status)
                      )}
                    </td>
                    <td className="px-6 py-4 text-text-muted text-sm">
                      {new Date(request.created_at).toLocaleString('pt-BR')}
                    </td>
                    {user?.role === 'ADMIN' && (
                      <td className="px-6 py-4">
                        <button
                          onClick={() => setEditingStatus({ id: request.id, status: request.status })}
                          className="p-2 rounded-lg glass border border-border-neon text-text-muted hover:text-text-primary hover:bg-dark-surface-alt transition-colors"
                          title="Editar status"
                        >
                          ✏️
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
