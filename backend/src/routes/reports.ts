import express from 'express';
import { supabase } from '../index';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = express.Router();

router.use(authenticate);

// GET /api/reports/requests
router.get('/requests', async (req: AuthRequest, res) => {
  try {
    const {
      status,
      base,
      requester,
      dateFrom,
      dateTo,
      min,
      max
    } = req.query;

    const userRole = req.user!.role;
    const userId = req.user!.role === 'REQUESTER' ? req.user!.userId : undefined;

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
      query = query.eq('approver_id', userId!);
    }
    // REQUESTER vê apenas suas próprias
    else if (userRole === 'REQUESTER') {
      query = query.eq('requester_id', userId!);
    }

    // Filtros
    if (status) {
      query = query.eq('status', status);
    }

    if (base) {
      query = query.ilike('base', `%${base}%`);
    }

    if (requester) {
      query = query.ilike('requester.username', `%${requester}%`);
    }

    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }

    if (dateTo) {
      query = query.lte('created_at', dateTo);
    }

    if (min) {
      query = query.gte('amount', parseFloat(min as string));
    }

    if (max) {
      query = query.lte('amount', parseFloat(max as string));
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json(data || []);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

