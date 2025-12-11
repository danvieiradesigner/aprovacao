import bcrypt from 'bcrypt';
import { supabase } from '../index';

export async function seedAdminUser() {
  try {
    // Verifica se admin já existe
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('username', 'admin')
      .single();

    if (existing) {
      return; // Admin já existe
    }

    // Cria admin
    const passwordHash = await bcrypt.hash('admin', 10);
    
    const { error } = await supabase
      .from('users')
      .insert({
        username: 'admin',
        password_hash: passwordHash,
        role: 'ADMIN'
      });

    if (error) {
      throw error;
    }

    console.log('✅ Admin user created: admin/admin');
  } catch (error: any) {
    if (error.code !== '23505') { // Ignora erro de duplicação
      throw error;
    }
  }
}

