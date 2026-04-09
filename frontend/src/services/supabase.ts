import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Tipos para o banco de dados
export interface UserProfile {
  id: string;
  username: string;
  role: 'ADMIN' | 'REQUESTER' | 'APPROVER';
  created_at: string;
}

export interface ApprovalRequest {
  id: string;
  id_code: string;
  requester_id: string;
  requester_email?: string | null;
  requester_phone?: string | null;
  approver_id: string | null;
  base: string;
  description: string;
  amount: string;
  note: string | null;
  receipt_url: string | null;
  status: 'PENDING' | 'NEEDS_INFO' | 'APPROVED' | 'REJECTED' | 'CANCELED';
  created_at: string;
  updated_at: string;
  requester?: UserProfile;
  approver?: UserProfile | null;
  // Novos campos do fluxo de despesas
  data_entrada?: string | null;
  fornecedor?: string | null;
  nf?: string | null;
  forma_pagamento?: string | null;
  data_vencimento_boleto?: string | null;
  base_centro_custo?: string | null;
  numero_referencia?: string | null;
  data_pagamento?: string | null;
}

export interface RequestEvent {
  id: string;
  request_id: string;
  actor_id: string;
  action: 'CREATE' | 'APPROVE' | 'REJECT' | 'NEEDS_INFO' | 'CANCEL' | 'UPDATE_NOTE';
  message: string | null;
  created_at: string;
  actor?: UserProfile;
}

/**
 * Envia resposta ao solicitante via webhook n8n após aprovação, rejeição ou esclarecimento
 */
export async function sendResponseWebhook(
  status: 'APPROVED' | 'REJECTED' | 'NEEDS_INFO',
  description: string | null | undefined,
  requestId: string,
  idCode: string,
  requesterPhone?: string | null,
  purchaseDescription?: string | null,
  purchaseDate?: string | null
): Promise<void> {
  try {
    console.log('[Webhook] Iniciando envio de webhook...', { status, requestId, idCode });
    
    // Mapeia status do banco para o formato esperado pelo webhook
    const statusMap: Record<string, string> = {
      APPROVED: 'aprovar',
      REJECTED: 'rejeitar',
      NEEDS_INFO: 'esclarecer',
    };

    const webhookStatus = statusMap[status];
    if (!webhookStatus) {
      console.warn(`[Webhook] Status ${status} não mapeado para webhook`);
      return;
    }

    // Usa a Edge Function do Supabase como proxy para evitar CORS
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Variáveis do Supabase não configuradas');
    }

    const webhookUrl = `${supabaseUrl}/functions/v1/send-response-webhook`;

    // Limpa o número de telefone (remove caracteres não numéricos)
    const cleanPhone = requesterPhone ? requesterPhone.replace(/[^0-9]/g, '') : null;

    const payload = {
      status: webhookStatus,
      descricao: description || '',
      request_id: requestId,
      id_code: idCode,
      telefone: cleanPhone || null,
      purchase_description: purchaseDescription || null,
      purchase_date: purchaseDate || null,
    };

    console.log('[Webhook] Payload:', payload);
    console.log('[Webhook] URL:', webhookUrl);

    // Cria um AbortController para timeout de 10 segundos
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'apikey': supabaseAnonKey,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    console.log('[Webhook] Resposta recebida:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Não foi possível ler o erro');
      console.error(`[Webhook] Erro ao enviar webhook: ${response.status} ${response.statusText}`, errorText);
    } else {
      const responseData = await response.json().catch(() => null);
      console.log('[Webhook] Webhook enviado com sucesso!', responseData);
    }
  } catch (error: any) {
    // Não interrompe o fluxo principal se o webhook falhar
    console.error('[Webhook] Erro ao enviar webhook de resposta:', error);
    console.error('[Webhook] Detalhes do erro:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
    });
    
    // Se for erro de abort (timeout), informa especificamente
    if (error?.name === 'AbortError') {
      console.error('[Webhook] Timeout: A requisição demorou mais de 10 segundos');
    }
  }
}