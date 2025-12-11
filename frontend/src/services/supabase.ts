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

