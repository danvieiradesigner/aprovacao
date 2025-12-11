import express from 'express';
import { supabase } from '../index';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = express.Router();

router.use(authenticate);

// GET /api/history
router.get('/', async (req: AuthRequest, res) => {
  try {
    const userRole = req.user!.role;
    const userId = req.user!.userId;

    let query = supabase
      .from('request_events')
      .select(`
        *,
        actor:users!request_events_actor_id_fkey(id, username, role),
        request:approval_requests!request_events_request_id_fkey(
          id,
          id_code,
          base,
          description,
          amount,
          status,
          requester:users!approval_requests_requester_id_fkey(id, username),
          approver:users!approval_requests_approver_id_fkey(id, username)
        )
      `)
      .order('created_at', { ascending: false })
      .limit(1000);

    // APPROVER vê apenas eventos de suas solicitações
    if (userRole === 'APPROVER') {
      query = query.eq('request.approver_id', userId);
    }
    // REQUESTER vê apenas eventos de suas solicitações
    else if (userRole === 'REQUESTER') {
      query = query.eq('request.requester_id', userId);
    }
    // ADMIN vê todos

    const { data, error } = await query;

    if (error) throw error;

    res.json(data || []);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

