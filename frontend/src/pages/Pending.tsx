import { useEffect, useState } from 'react';
import { supabase, ApprovalRequest, sendResponseWebhook } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import DataTable from '../components/DataTable';
import RequestModal from '../components/RequestModal';
import ActionModal from '../components/ActionModal';
import ReceiptModal from '../components/ReceiptModal';

export default function Pending() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const [actionModal, setActionModal] = useState<{ type: 'approve' | 'reject' | 'clarify' | 'cancel'; request: ApprovalRequest } | null>(null);
  const [receiptModal, setReceiptModal] = useState<{ receiptUrl: string } | null>(null);

  useEffect(() => {
    fetchRequests();
  }, [user]);

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('approval_requests')
        .select(`
          *,
          requester:user_profiles!approval_requests_requester_id_fkey(id, username),
          approver:user_profiles!approval_requests_approver_id_fkey(id, username)
        `)
        .in('status', ['PENDING', 'NEEDS_INFO'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      const requestsWithContactNames = await Promise.all(
        (data || []).map(async (request: any) => {
          if (request.requester_phone) {
            try {
              const phoneNumber = request.requester_phone.replace(/[^0-9]/g, '');
              const { data: contact, error: contactError } = await supabase
                .from('contacts')
                .select('name')
                .eq('phone_number', phoneNumber)
                .maybeSingle();
              
              if (!contactError && contact?.name) {
                return {
                  ...request,
                  requester: {
                    ...request.requester,
                    username: contact.name
                  }
                };
              }
            } catch (err) {
              console.error('Erro ao buscar contato:', err);
            }
          } else if (request.requester_email) {
            try {
              const { data: contact, error: contactError } = await supabase
                .from('contacts')
                .select('name')
                .ilike('email', request.requester_email.trim())
                .maybeSingle();
              
              if (!contactError && contact?.name) {
                return {
                  ...request,
                  requester: {
                    ...request.requester,
                    username: contact.name
                  }
                };
              }
            } catch (err) {
              console.error('Erro ao buscar contato:', err);
            }
          }
          return request;
        })
      );

      setRequests(requestsWithContactNames);
    } catch (error: any) {
      showToast('Erro ao carregar solicitações', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: string, message?: string) => {
    if (!actionModal || !user) return;

    try {
      const requestId = actionModal.request.id;
      let newStatus: string;
      let eventAction: string;

      switch (action) {
        case 'approve':
          newStatus = 'APPROVED';
          eventAction = 'APPROVE';
          break;
        case 'reject':
          newStatus = 'REJECTED';
          eventAction = 'REJECT';
          break;
        case 'cancel':
          newStatus = 'CANCELED';
          eventAction = 'CANCEL';
          break;
        default:
          throw new Error('Ação inválida');
      }

      // Atualizar status da solicitação
      const { error: updateError } = await supabase
        .from('approval_requests')
        .update({ status: newStatus })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // Criar evento
      const { error: eventError } = await supabase
        .from('request_events')
        .insert({
          request_id: requestId,
          actor_id: user.id,
          action: eventAction,
          message: message || null,
        });

      if (eventError) throw eventError;

      // Enviar webhook para n8n se for aprovação ou rejeição
      if (newStatus === 'APPROVED' || newStatus === 'REJECTED') {
        console.log('[Pending] Disparando webhook para:', {
          newStatus,
          requestId,
          idCode: actionModal.request.id_code,
          phone: actionModal.request.requester_phone,
          message,
        });
        await sendResponseWebhook(
          newStatus as 'APPROVED' | 'REJECTED',
          message || null,
          requestId,
          actionModal.request.id_code,
          actionModal.request.requester_phone
        );
      }

      showToast('Ação realizada com sucesso!', 'success');
      setActionModal(null);
      fetchRequests();
    } catch (error: any) {
      showToast(error.message || 'Erro ao realizar ação', 'error');
    }
  };

  const handleClarify = async (request: ApprovalRequest) => {
    if (!user) return;

    try {
      const { error: updateError } = await supabase
        .from('approval_requests')
        .update({ status: 'NEEDS_INFO' })
        .eq('id', request.id);

      if (updateError) throw updateError;

      const { error: eventError } = await supabase
        .from('request_events')
        .insert({
          request_id: request.id,
          actor_id: user.id,
          action: 'NEEDS_INFO',
          message: 'Solicitação de esclarecimento',
        });

      if (eventError) throw eventError;

      // Enviar webhook para n8n
      console.log('[Pending] Disparando webhook para esclarecimento:', {
        requestId: request.id,
        idCode: request.id_code,
        phone: request.requester_phone,
      });
      await sendResponseWebhook(
        'NEEDS_INFO',
        'Solicitação de esclarecimento',
        request.id,
        request.id_code,
        request.requester_phone
      );

      showToast('Status alterado para "Esclarecer"!', 'success');
      fetchRequests();
    } catch (error: any) {
      showToast(error.message || 'Erro ao esclarecer solicitação', 'error');
    }
  };

  const canApprove = user?.role === 'APPROVER' || user?.role === 'ADMIN';
  const canCancel = user?.role === 'REQUESTER' || user?.role === 'ADMIN';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-text-primary mb-2">Solicitações Pendentes</h1>
        <p className="text-text-muted text-sm md:text-base">Gerencie as solicitações aguardando aprovação</p>
      </div>

      <DataTable
        data={requests}
        loading={loading}
        onRowClick={(request) => setSelectedRequest(request)}
        onReceiptClick={(request) => {
          if (request.receipt_url) {
            setReceiptModal({ receiptUrl: request.receipt_url });
          }
        }}
        actions={
          canApprove
            ? [
                {
                  label: 'Aprovar',
                  onClick: (request) => setActionModal({ type: 'approve', request }),
                  className: 'text-green-400 hover:bg-green-500/10',
                },
                {
                  label: 'Esclarecer',
                  onClick: (request) => handleClarify(request),
                  className: 'text-yellow-400 hover:bg-yellow-500/10',
                },
                {
                  label: 'Rejeitar',
                  onClick: (request) => setActionModal({ type: 'reject', request }),
                  className: 'text-red-400 hover:bg-red-500/10',
                },
              ]
            : canCancel
            ? [
                {
                  label: 'Cancelar',
                  onClick: (request) => setActionModal({ type: 'cancel', request }),
                  className: 'text-red-400 hover:bg-red-500/10',
                },
              ]
            : []
        }
      />

      {selectedRequest && (
        <RequestModal
          requestId={selectedRequest.id}
          onClose={() => setSelectedRequest(null)}
          onUpdate={fetchRequests}
        />
      )}

      {actionModal && (
        <ActionModal
          type={actionModal.type}
          request={actionModal.request}
          onClose={() => setActionModal(null)}
          onConfirm={handleAction}
        />
      )}

      {receiptModal && (
        <ReceiptModal
          receiptUrl={receiptModal.receiptUrl}
          onClose={() => setReceiptModal(null)}
        />
      )}
    </div>
  );
}
