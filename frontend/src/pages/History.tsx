import { useEffect, useState } from 'react';
import { supabase, RequestEvent } from '../services/supabase';
import { useToast } from '../contexts/ToastContext';

interface HistoryEvent extends RequestEvent {
  request: {
    id: string;
    id_code: string;
    base: string;
    description: string;
    amount: string;
    status: string;
    requester?: { username: string };
    approver?: { username: string } | null;
  };
}

export default function History() {
  const { showToast } = useToast();
  const [events, setEvents] = useState<HistoryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      // RLS já filtra automaticamente baseado no usuário
      const { data, error } = await supabase
        .from('request_events')
        .select(`
          *,
          actor:user_profiles!request_events_actor_id_fkey(id, username, role),
          request:approval_requests!request_events_request_id_fkey(
            id,
            id_code,
            base,
            description,
            amount,
            status,
            requester:user_profiles!approval_requests_requester_id_fkey(id, username),
            approver:user_profiles!approval_requests_approver_id_fkey(id, username)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) throw error;
      setEvents((data || []) as HistoryEvent[]);
    } catch (error: any) {
      showToast('Erro ao carregar histórico', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      CREATE: 'Criada',
      APPROVE: 'Aprovada',
      REJECT: 'Rejeitada',
      NEEDS_INFO: 'Solicitado Esclarecimento',
      CANCEL: 'Cancelada',
      UPDATE_NOTE: 'Nota Atualizada',
    };
    return labels[action] || action;
  };

  const getActionColor = (action: string) => {
    const colors: Record<string, string> = {
      CREATE: 'bg-blue-500/20 text-blue-400',
      APPROVE: 'bg-green-500/20 text-green-400',
      REJECT: 'bg-red-500/20 text-red-400',
      NEEDS_INFO: 'bg-yellow-500/20 text-yellow-400',
      CANCEL: 'bg-text-muted/20 text-text-muted',
      UPDATE_NOTE: 'bg-purple-500/20 text-purple-400',
    };
    return colors[action] || 'bg-text-muted/20 text-text-muted';
  };

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
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || colors.PENDING}`}>
        {labels[status] || status}
      </span>
    );
  };

  const filteredEvents = events.filter((event) => {
    const searchLower = search.toLowerCase();
    return (
      event.request?.id_code?.toLowerCase().includes(searchLower) ||
      event.request?.base?.toLowerCase().includes(searchLower) ||
      event.actor?.username?.toLowerCase().includes(searchLower) ||
      getActionLabel(event.action).toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="text-center py-12 text-text-muted">Carregando...</div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-text-primary mb-2">Histórico</h1>
        <p className="text-text-muted">Log de todas as ações realizadas no sistema</p>
      </div>

      <div className="glass rounded-3xl p-4 border border-border-neon">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por código, base, usuário ou ação..."
          className="w-full px-4 py-2 rounded-xl bg-dark-surface border border-border-neon text-text-primary placeholder:text-text-muted focus:outline-none focus:border-neon-primary"
        />
      </div>

      <div className="glass rounded-3xl border border-border-neon overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-dark-surface-alt border-b border-border-neon">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-text-primary">Data/Hora</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-text-primary">Código</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-text-primary">Base</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-text-primary">Ação</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-text-primary">Usuário</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-text-primary">Status Atual</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-text-primary">Mensagem</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-text-muted">
                    Nenhum evento encontrado
                  </td>
                </tr>
              ) : (
                filteredEvents.map((event) => (
                  <tr
                    key={event.id}
                    className="border-b border-border-neon hover:bg-dark-surface-alt transition-colors"
                  >
                    <td className="px-6 py-4 text-text-muted text-sm">
                      {new Date(event.created_at).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 text-neon-primary font-medium">
                      {event.request?.id_code || '-'}
                    </td>
                    <td className="px-6 py-4 text-text-primary">{event.request?.base || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getActionColor(event.action)}`}>
                        {getActionLabel(event.action)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-text-primary">
                      <div>
                        <div className="font-medium">{event.actor?.username || '-'}</div>
                        <div className="text-xs text-text-muted">{event.actor?.role || '-'}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(event.request?.status || 'PENDING')}</td>
                    <td className="px-6 py-4 text-text-muted text-sm max-w-md truncate">
                      {event.message || '-'}
                    </td>
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
