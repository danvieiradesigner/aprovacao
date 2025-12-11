import express from 'express';
import { z } from 'zod';
import { supabase } from '../index';
import axios from 'axios';

const router = express.Router();

// Schema para receber dados do n8n
const n8nWebhookSchema = z.object({
  id_code: z.string().optional(),
  requester_id: z.string().uuid().optional(),
  requester_email: z.string().email().optional(),
  approver_id: z.string().uuid().optional(),
  approver_email: z.string().email().optional(),
  base: z.string(),
  description: z.string(),
  amount: z.number().positive(),
  note: z.string().optional(),
  receipt_url: z.string().url().optional(),
  status: z.enum(['PENDING', 'NEEDS_INFO', 'APPROVED', 'REJECTED', 'CANCELED']).optional(),
});

// POST /api/n8n/webhook - Receber dados do n8n
router.post('/webhook', async (req, res) => {
  try {
    const data = n8nWebhookSchema.parse(req.body);

    // Buscar requester por email se não tiver ID
    let requesterId = data.requester_id;
    if (!requesterId && data.requester_email) {
      // Buscar no auth.users pelo email
      const { data: authUser } = await supabase.auth.admin.getUserByEmail(data.requester_email);
      
      if (!authUser || !authUser.user) {
        return res.status(404).json({ error: 'Requester não encontrado com este email' });
      }
      
      // Verificar se existe perfil
      const { data: requesterProfile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', authUser.user.id)
        .single();

      if (!requesterProfile) {
        return res.status(404).json({ error: 'Perfil do requester não encontrado' });
      }
      requesterId = requesterProfile.id;
    }

    if (!requesterId) {
      return res.status(400).json({ error: 'requester_id ou requester_email é obrigatório' });
    }

    // Buscar approver por email se não tiver ID
    let approverId = data.approver_id || null;
    if (!approverId && data.approver_email) {
      // Buscar no auth.users pelo email
      const { data: authUser } = await supabase.auth.admin.getUserByEmail(data.approver_email);
      
      if (authUser && authUser.user) {
        // Verificar se existe perfil
        const { data: approverProfile } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('id', authUser.user.id)
          .single();

        if (approverProfile) {
          approverId = approverProfile.id;
        }
      }
    }

    // Gerar id_code se não fornecido
    let idCode = data.id_code;
    if (!idCode) {
      const year = new Date().getFullYear();
      
      // Buscar ou criar contador do ano
      const { data: counter, error: counterError } = await supabase
        .from('request_counters')
        .select('seq')
        .eq('year', year)
        .single();

      let nextSeq = 1;
      if (counterError || !counter) {
        await supabase
          .from('request_counters')
          .insert({ year, seq: 1 });
      } else {
        nextSeq = counter.seq + 1;
        await supabase
          .from('request_counters')
          .update({ seq: nextSeq })
          .eq('year', year);
      }

      idCode = `REQ-${year}-${String(nextSeq).padStart(4, '0')}`;
    }

    // Criar ou atualizar solicitação
    const requestData = {
      id_code: idCode,
      requester_id: requesterId,
      approver_id: approverId,
      base: data.base,
      description: data.description,
      amount: data.amount,
      note: data.note || null,
      receipt_url: data.receipt_url || null,
      status: data.status || 'PENDING',
    };

    // Verificar se já existe solicitação com esse id_code
    const { data: existing } = await supabase
      .from('approval_requests')
      .select('id')
      .eq('id_code', idCode)
      .single();

    let result;
    if (existing) {
      // Atualizar solicitação existente
      const { data: updated, error: updateError } = await supabase
        .from('approval_requests')
        .update(requestData)
        .eq('id', existing.id)
        .select()
        .single();

      if (updateError) throw updateError;
      result = updated;
    } else {
      // Criar nova solicitação
      const { data: created, error: createError } = await supabase
        .from('approval_requests')
        .insert(requestData)
        .select()
        .single();

      if (createError) throw createError;
      result = created;

      // Criar evento CREATE
      await supabase
        .from('request_events')
        .insert({
          request_id: result.id,
          actor_id: requesterId,
          action: 'CREATE',
          message: 'Solicitação criada via n8n',
        });
    }

    res.json({ success: true, request: result });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Dados inválidos', details: error.errors });
    }
    console.error('Erro no webhook n8n:', error);
    res.status(500).json({ error: error.message || 'Erro ao processar webhook' });
  }
});

// Função auxiliar para enviar atualizações para n8n
export async function notifyN8N(requestId: string, event: {
  action: string;
  status: string;
  message?: string;
}) {
  const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;
  
  if (!n8nWebhookUrl) {
    console.warn('N8N_WEBHOOK_URL não configurado, pulando notificação');
    return;
  }

  try {
    // Buscar dados da solicitação
    const { data: request, error } = await supabase
      .from('approval_requests')
      .select(`
        *,
        requester:user_profiles!approval_requests_requester_id_fkey(id, username),
        approver:user_profiles!approval_requests_approver_id_fkey(id, username)
      `)
      .eq('id', requestId)
      .single();

    // Buscar emails dos usuários do auth.users
    let requesterEmail: string | undefined;
    let approverEmail: string | undefined;

    if (request?.requester_id) {
      const { data: requesterAuth } = await supabase.auth.admin.getUserById(request.requester_id);
      requesterEmail = requesterAuth?.user?.email;
    }

    if (request?.approver_id) {
      const { data: approverAuth } = await supabase.auth.admin.getUserById(request.approver_id);
      approverEmail = approverAuth?.user?.email;
    }

    if (error || !request) {
      console.error('Erro ao buscar solicitação para notificar n8n:', error);
      return;
    }

    // Enviar para n8n
    await axios.post(n8nWebhookUrl, {
      request_id: request.id,
      id_code: request.id_code,
      requester_id: request.requester_id,
      requester_email: requesterEmail,
      approver_id: request.approver_id,
      approver_email: approverEmail,
      base: request.base,
      description: request.description,
      amount: request.amount,
      note: request.note,
      receipt_url: request.receipt_url,
      status: request.status,
      event: {
        action: event.action,
        status: event.status,
        message: event.message,
        timestamp: new Date().toISOString(),
      },
    }, {
      timeout: 5000,
    });

    console.log(`✅ Notificação enviada para n8n: ${request.id_code} - ${event.action}`);
  } catch (error: any) {
    console.error('Erro ao enviar notificação para n8n:', error.message);
    // Não lançar erro para não quebrar o fluxo principal
  }
}

export default router;

