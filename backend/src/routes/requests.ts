import express from 'express';
import { z } from 'zod';
import { supabase } from '../index';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { generateIdCode } from '../utils/idCode';
import { notifyN8N } from './n8n';

const router = express.Router();

const createRequestSchema = z.object({
  base: z.string().min(1),
  description: z.string().min(1),
  amount: z.number().positive(),
  note: z.string().optional()
});

const updateNoteSchema = z.object({
  note: z.string()
});

const updateStatusSchema = z.object({
  status: z.enum(['PENDING', 'NEEDS_INFO', 'APPROVED', 'REJECTED', 'CANCELED']),
  message: z.string().optional()
});

const actionSchema = z.object({
  message: z.string().optional()
});

// POST /api/requests - REMOVIDO: plataforma é apenas para aprovação
// Solicitações devem ser criadas por outro sistema e atribuídas a aprovadores

// GET /api/requests
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const userRole = req.user!.role;
    const userId = req.user!.userId;

    let query = supabase
      .from('approval_requests')
      .select(`
        *,
        requester:users!approval_requests_requester_id_fkey(id, username),
        approver:users!approval_requests_approver_id_fkey(id, username)
      `)
      .order('created_at', { ascending: false });

    // APPROVER vê apenas suas próprias solicitações atribuídas
    if (userRole === 'APPROVER') {
      query = query.eq('approver_id', userId);
    }
    // REQUESTER vê apenas suas próprias
    else if (userRole === 'REQUESTER') {
      query = query.eq('requester_id', userId);
    }
    // ADMIN vê todas

    const { data, error } = await query;

    if (error) throw error;

    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/requests/:id
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user!.role;
    const userId = req.user!.userId;

    // Busca solicitação
    const { data: request, error: reqError } = await supabase
      .from('approval_requests')
      .select(`
        *,
        requester:users!approval_requests_requester_id_fkey(id, username),
        approver:users!approval_requests_approver_id_fkey(id, username)
      `)
      .eq('id', id)
      .single();

    if (reqError || !request) {
      return res.status(404).json({ error: 'Solicitação não encontrada' });
    }

    // APPROVER só vê suas próprias solicitações atribuídas
    if (userRole === 'APPROVER' && request.approver_id !== userId) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    // REQUESTER só vê suas próprias
    else if (userRole === 'REQUESTER' && request.requester_id !== userId) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // Busca eventos
    const { data: events, error: eventsError } = await supabase
      .from('request_events')
      .select(`
        *,
        actor:users!request_events_actor_id_fkey(id, username, role)
      `)
      .eq('request_id', id)
      .order('created_at', { ascending: true });

    if (eventsError) throw eventsError;

    res.json({ ...request, events: events || [] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/requests/:id/note
router.patch('/:id/note', authenticate, requireRole('REQUESTER', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { note } = updateNoteSchema.parse(req.body);
    const userId = req.user!.userId;

    // Busca solicitação
    const { data: request, error: reqError } = await supabase
      .from('approval_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (reqError || !request) {
      return res.status(404).json({ error: 'Solicitação não encontrada' });
    }

    // REQUESTER só pode atualizar suas próprias
    if (req.user!.role === 'REQUESTER' && request.requester_id !== userId) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // Só pode atualizar se estiver em NEEDS_INFO
    if (request.status !== 'NEEDS_INFO') {
      return res.status(400).json({ error: 'Só é possível atualizar nota quando status é NEEDS_INFO' });
    }

    // Atualiza nota e volta para PENDING
    const { data: updated, error: updateError } = await supabase
      .from('approval_requests')
      .update({ note, status: 'PENDING' })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Cria evento UPDATE_NOTE
    await supabase
      .from('request_events')
      .insert({
        request_id: id,
        actor_id: userId,
        action: 'UPDATE_NOTE',
        message: note
      });

    // Notificar n8n
    await notifyN8N(id, {
      action: 'UPDATE_NOTE',
      status: 'PENDING',
      message: note,
    });

    res.json(updated);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Dados inválidos', details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/requests/:id/status (ADMIN apenas)
router.patch('/:id/status', authenticate, requireRole('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { status, message } = updateStatusSchema.parse(req.body);
    const userId = req.user!.userId;

    // Busca solicitação
    const { data: request, error: reqError } = await supabase
      .from('approval_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (reqError || !request) {
      return res.status(404).json({ error: 'Solicitação não encontrada' });
    }

    // Atualiza status
    const { data: updated, error: updateError } = await supabase
      .from('approval_requests')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Mapeia status para ação
    const actionMap: Record<string, string> = {
      PENDING: 'UPDATE_NOTE',
      NEEDS_INFO: 'NEEDS_INFO',
      APPROVED: 'APPROVE',
      REJECTED: 'REJECT',
      CANCELED: 'CANCEL'
    };

    const action = actionMap[status] || 'UPDATE_NOTE';

    // Cria evento
    await supabase
      .from('request_events')
      .insert({
        request_id: id,
        actor_id: userId,
        action,
        message: message || `Status alterado para ${status}`
      });

    // Notificar n8n
    await notifyN8N(id, {
      action,
      status,
      message: message || `Status alterado para ${status}`,
    });

    res.json(updated);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Dados inválidos', details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

// POST /api/requests/:id/approve
router.post('/:id/approve', authenticate, requireRole('APPROVER', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { message } = actionSchema.parse(req.body);
    const userId = req.user!.userId;

    // Busca solicitação
    const { data: request, error: reqError } = await supabase
      .from('approval_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (reqError || !request) {
      return res.status(404).json({ error: 'Solicitação não encontrada' });
    }

    if (request.status !== 'PENDING' && request.status !== 'NEEDS_INFO') {
      return res.status(400).json({ error: 'Solicitação não está pendente' });
    }

    // Atualiza status
    const { data: updated, error: updateError } = await supabase
      .from('approval_requests')
      .update({ status: 'APPROVED' })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Cria evento APPROVE
    await supabase
      .from('request_events')
      .insert({
        request_id: id,
        actor_id: userId,
        action: 'APPROVE',
        message: message || null
      });

    // Notificar n8n
    await notifyN8N(id, {
      action: 'APPROVE',
      status: 'APPROVED',
      message: message || undefined,
    });

    res.json(updated);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Dados inválidos', details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

// POST /api/requests/:id/reject
router.post('/:id/reject', authenticate, requireRole('APPROVER', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { message } = actionSchema.parse(req.body);
    const userId = req.user!.userId;

    // Busca solicitação
    const { data: request, error: reqError } = await supabase
      .from('approval_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (reqError || !request) {
      return res.status(404).json({ error: 'Solicitação não encontrada' });
    }

    if (request.status !== 'PENDING' && request.status !== 'NEEDS_INFO') {
      return res.status(400).json({ error: 'Solicitação não está pendente' });
    }

    // Atualiza status
    const { data: updated, error: updateError } = await supabase
      .from('approval_requests')
      .update({ status: 'REJECTED' })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Cria evento REJECT
    await supabase
      .from('request_events')
      .insert({
        request_id: id,
        actor_id: userId,
        action: 'REJECT',
        message: message || null
      });

    // Notificar n8n
    await notifyN8N(id, {
      action: 'REJECT',
      status: 'REJECTED',
      message: message || undefined,
    });

    res.json(updated);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Dados inválidos', details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

// POST /api/requests/:id/clarify
router.post('/:id/clarify', authenticate, requireRole('APPROVER', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { message } = z.object({ message: z.string().optional() }).parse(req.body);
    const userId = req.user!.userId;

    // Busca solicitação
    const { data: request, error: reqError } = await supabase
      .from('approval_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (reqError || !request) {
      return res.status(404).json({ error: 'Solicitação não encontrada' });
    }

    if (request.status !== 'PENDING' && request.status !== 'NEEDS_INFO') {
      return res.status(400).json({ error: 'Solicitação não está pendente' });
    }

    // Atualiza status para NEEDS_INFO
    const { data: updated, error: updateError } = await supabase
      .from('approval_requests')
      .update({ status: 'NEEDS_INFO' })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Cria evento NEEDS_INFO
    await supabase
      .from('request_events')
      .insert({
        request_id: id,
        actor_id: userId,
        action: 'NEEDS_INFO',
        message: message || 'Solicitação de esclarecimento'
      });

    // Notificar n8n
    await notifyN8N(id, {
      action: 'NEEDS_INFO',
      status: 'NEEDS_INFO',
      message: message || 'Solicitação de esclarecimento',
    });

    res.json(updated);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Dados inválidos', details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

// POST /api/requests/:id/cancel
router.post('/:id/cancel', authenticate, requireRole('REQUESTER', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    // Busca solicitação
    const { data: request, error: reqError } = await supabase
      .from('approval_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (reqError || !request) {
      return res.status(404).json({ error: 'Solicitação não encontrada' });
    }

    // REQUESTER só pode cancelar suas próprias
    if (req.user!.role === 'REQUESTER' && request.requester_id !== userId) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // Só pode cancelar se estiver em PENDING ou NEEDS_INFO
    if (request.status !== 'PENDING' && request.status !== 'NEEDS_INFO') {
      return res.status(400).json({ error: 'Só é possível cancelar solicitações pendentes' });
    }

    // Atualiza status
    const { data: updated, error: updateError } = await supabase
      .from('approval_requests')
      .update({ status: 'CANCELED' })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Cria evento CANCEL
    await supabase
      .from('request_events')
      .insert({
        request_id: id,
        actor_id: userId,
        action: 'CANCEL',
        message: null
      });

    // Notificar n8n
    await notifyN8N(id, {
      action: 'CANCEL',
      status: 'CANCELED',
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

