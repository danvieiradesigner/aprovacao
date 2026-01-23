import { useEffect, useState } from 'react';
import { supabase, ApprovalRequest, RequestEvent, sendResponseWebhook } from '../services/supabase';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { X } from 'lucide-react';

interface RequestModalProps {
  requestId: string;
  onClose: () => void;
  onUpdate?: () => void;
}

interface RequestWithEvents extends ApprovalRequest {
  events: RequestEvent[];
}

export default function RequestModal({ requestId, onClose, onUpdate }: RequestModalProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [request, setRequest] = useState<RequestWithEvents | null>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [showStatusForm, setShowStatusForm] = useState(false);
  const [newStatus, setNewStatus] = useState('');

  useEffect(() => {
    fetchRequest();
  }, [requestId]);

  const fetchRequest = async () => {
    try {
      // Buscar solicitação
      const { data: requestData, error: requestError } = await supabase
        .from('approval_requests')
        .select(`
          *,
          requester:user_profiles!approval_requests_requester_id_fkey(id, username),
          approver:user_profiles!approval_requests_approver_id_fkey(id, username)
        `)
        .eq('id', requestId)
        .single();

      if (requestError) throw requestError;

      // Buscar eventos
      const { data: eventsData, error: eventsError } = await supabase
        .from('request_events')
        .select(`
          *,
          actor:user_profiles!request_events_actor_id_fkey(id, username, role)
        `)
        .eq('request_id', requestId)
        .order('created_at', { ascending: true });

      if (eventsError) throw eventsError;

      let requestWithContact = requestData;
      if (requestData.requester_phone) {
        const phoneNumber = requestData.requester_phone.replace(/[^0-9]/g, '');
        const { data: contact } = await supabase
          .from('contacts')
          .select('name')
          .eq('phone_number', phoneNumber)
          .maybeSingle();
        
        if (contact?.name && requestWithContact.requester) {
          requestWithContact.requester.username = contact.name;
        }
      } else if (requestData.requester_email) {
        const { data: contact } = await supabase
          .from('contacts')
          .select('name')
          .ilike('email', requestData.requester_email.trim())
          .maybeSingle();
        
        if (contact?.name && requestWithContact.requester) {
          requestWithContact.requester.username = contact.name;
        }
      }

      setRequest({
        ...requestWithContact,
        events: eventsData || [],
      } as RequestWithEvents);
      setNote(requestData.note || '');
    } catch (error: any) {
      showToast('Erro ao carregar solicitação', 'error');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateNote = async () => {
    if (!request || !user || request.status !== 'NEEDS_INFO') return;

    try {
      const { error: updateError } = await supabase
        .from('approval_requests')
        .update({ note, status: 'PENDING' })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // Criar evento
      const { error: eventError } = await supabase
        .from('request_events')
        .insert({
          request_id: requestId,
          actor_id: user.id,
          action: 'UPDATE_NOTE',
          message: note,
        });

      if (eventError) throw eventError;

      showToast('Nota atualizada com sucesso!', 'success');
      setShowNoteForm(false);
      fetchRequest();
      onUpdate?.();
    } catch (error: any) {
      showToast(error.message || 'Erro ao atualizar nota', 'error');
    }
  };

  const handleUpdateStatus = async () => {
    if (!request || !user || !newStatus) return;

    try {
      const { error: updateError } = await supabase
        .from('approval_requests')
        .update({ status: newStatus })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // Mapeia status para ação
      const actionMap: Record<string, string> = {
        PENDING: 'UPDATE_NOTE',
        NEEDS_INFO: 'NEEDS_INFO',
        APPROVED: 'APPROVE',
        REJECTED: 'REJECT',
        CANCELED: 'CANCEL',
      };

      const action = actionMap[newStatus] || 'UPDATE_NOTE';

      // Criar evento
      const { error: eventError } = await supabase
        .from('request_events')
        .insert({
          request_id: requestId,
          actor_id: user.id,
          action: action as any,
          message: `Status alterado para ${newStatus}`,
        });

      if (eventError) throw eventError;

      // Enviar webhook para n8n se for aprovação, rejeição ou esclarecimento
      if (newStatus === 'APPROVED' || newStatus === 'REJECTED' || newStatus === 'NEEDS_INFO') {
        await sendResponseWebhook(
          newStatus as 'APPROVED' | 'REJECTED' | 'NEEDS_INFO',
          `Status alterado para ${newStatus}`,
          requestId,
          request?.id_code || '',
          request?.requester_phone
        );
      }

      showToast('Status atualizado com sucesso!', 'success');
      setShowStatusForm(false);
      setNewStatus('');
      fetchRequest();
      onUpdate?.();
    } catch (error: any) {
      showToast(error.message || 'Erro ao atualizar status', 'error');
    }
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
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${colors[status] || colors.PENDING}`}>
        {labels[status] || status}
      </span>
    );
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

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="glass rounded-2xl p-8 border border-border-neon">
          <div className="text-text-muted">Carregando...</div>
        </div>
      </div>
    );
  }

  if (!request) return null;

  const canUpdateNote = user?.role === 'REQUESTER' && request.status === 'NEEDS_INFO';

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="glass rounded-2xl p-4 md:p-6 border border-border-neon w-full max-w-3xl my-4 md:my-8 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 md:mb-6 gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-text-primary">{request.id_code}</h2>
              <p className="text-text-muted text-sm mt-1">{getStatusBadge(request.status)}</p>
            </div>
            {user?.role === 'ADMIN' && (
              <button
                onClick={() => {
                  setNewStatus(request.status);
                  setShowStatusForm(true);
                }}
                className="px-4 py-2 rounded-xl glass border border-border-neon text-text-primary hover:bg-dark-surface-alt transition-all text-sm no-outline w-full sm:w-auto"
              >
                Editar Status
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-dark-surface-alt text-text-muted hover:text-text-primary transition-colors no-outline self-end sm:self-auto"
          >
            <X size={24} />
          </button>
        </div>

        <div className="space-y-4 md:space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-text-muted">Base</label>
              <p className="text-text-primary mt-1">{request.base}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-text-muted">Valor</label>
              <p className="text-neon-primary font-semibold mt-1">
                R$ {parseFloat(request.amount).toFixed(2)}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-text-muted">Solicitante</label>
              <p className="text-text-primary mt-1">{request.requester?.username || '-'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-text-muted">Criado em</label>
              <p className="text-text-primary mt-1">
                {new Date(request.created_at).toLocaleString('pt-BR')}
              </p>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-text-muted">Descrição</label>
            <p className="text-text-primary mt-1 whitespace-pre-wrap">{request.description}</p>
          </div>

          {canUpdateNote && (
            <div>
              {showNoteForm ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Observação
                    </label>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={4}
                      className="w-full px-4 py-3 rounded-xl bg-dark-surface border border-border-neon text-text-primary focus:outline-none focus:border-neon-primary resize-none"
                      placeholder="Adicione uma observação..."
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <button
                      onClick={handleUpdateNote}
                      className="px-6 py-2 rounded-xl bg-neon-primary text-dark-bg font-semibold btn-neon no-outline w-full sm:w-auto"
                    >
                      Atualizar
                    </button>
                    <button
                      onClick={() => setShowNoteForm(false)}
                      className="px-6 py-2 rounded-xl glass border border-border-neon text-text-primary hover:bg-dark-surface-alt no-outline w-full sm:w-auto"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-text-muted">Observação</label>
                    <button
                      onClick={() => setShowNoteForm(true)}
                      className="text-xs text-neon-primary hover:underline no-outline"
                    >
                      Editar
                    </button>
                  </div>
                  <p className="text-text-primary whitespace-pre-wrap">
                    {request.note || 'Nenhuma observação'}
                  </p>
                </div>
              )}
            </div>
          )}

          {!canUpdateNote && request.note && (
            <div>
              <label className="text-sm font-medium text-text-muted">Observação</label>
              <p className="text-text-primary mt-1 whitespace-pre-wrap">{request.note}</p>
            </div>
          )}

          {showStatusForm && user?.role === 'ADMIN' && (
            <div className="p-4 rounded-xl bg-dark-surface-alt border border-border-neon">
              <h4 className="text-sm font-semibold text-text-primary mb-3">Editar Status</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Novo Status
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl bg-dark-surface border border-border-neon text-text-primary focus:outline-none focus:border-neon-primary"
                  >
                    <option value="PENDING">Pendente</option>
                    <option value="NEEDS_INFO">Esclarecer</option>
                    <option value="APPROVED">Aprovada</option>
                    <option value="REJECTED">Rejeitada</option>
                    <option value="CANCELED">Cancelada</option>
                  </select>
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={handleUpdateStatus}
                    className="px-6 py-2 rounded-xl bg-neon-primary text-dark-bg font-semibold btn-neon no-outline w-full sm:w-auto"
                  >
                    Salvar
                  </button>
                  <button
                    onClick={() => {
                      setShowStatusForm(false);
                      setNewStatus('');
                    }}
                    className="px-6 py-2 rounded-xl glass border border-border-neon text-text-primary hover:bg-dark-surface-alt no-outline w-full sm:w-auto"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          <div>
            <h3 className="text-lg font-semibold text-text-primary mb-4">Timeline</h3>
            <div className="space-y-4">
              {request.events?.map((event) => (
                <div
                  key={event.id}
                  className="flex gap-4 p-4 rounded-xl bg-dark-surface-alt border border-border-neon"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-text-primary">
                        {event.actor?.username || '-'}
                      </span>
                      <span className="text-text-muted text-sm">({event.actor?.role || '-'})</span>
                      <span className="text-text-muted text-sm">•</span>
                      <span className="text-text-muted text-sm">
                        {getActionLabel(event.action)}
                      </span>
                    </div>
                    {event.message && (
                      <p className="text-text-muted text-sm mt-1">{event.message}</p>
                    )}
                    <p className="text-text-muted text-xs mt-2">
                      {new Date(event.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
