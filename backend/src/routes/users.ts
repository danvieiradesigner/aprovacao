import express from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { supabase } from '../index';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Todas as rotas requerem autenticação e role ADMIN
router.use(authenticate);
router.use(requireRole('ADMIN'));

const createUserSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
  role: z.enum(['ADMIN', 'REQUESTER', 'APPROVER'])
});

// GET /api/users
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, username, role, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/users
router.post('/', async (req, res) => {
  try {
    const { username, password, role } = createUserSchema.parse(req.body);

    // Verifica se username já existe
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    if (existing) {
      return res.status(400).json({ error: 'Username já existe' });
    }

    // Hash da senha
    const passwordHash = await bcrypt.hash(password, 10);

    // Cria usuário
    const { data, error } = await supabase
      .from('users')
      .insert({
        username,
        password_hash: passwordHash,
        role
      })
      .select('id, username, role, created_at')
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Dados inválidos', details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

export default router;

