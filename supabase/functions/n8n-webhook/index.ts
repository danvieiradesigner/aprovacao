import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface N8nWebhookPayload {
  id_code?: string;
  requester_id?: string;
  requester_email?: string;
  requester_phone?: string;
  approver_id?: string;
  approver_email?: string;
  base: string;
  description: string;
  amount: number;
  note?: string;
  receipt_url?: string;
  status?: 'PENDING' | 'NEEDS_INFO' | 'APPROVED' | 'REJECTED' | 'CANCELED';
}

async function generateIdCode(supabaseAdmin: any): Promise<string> {
  const year = new Date().getFullYear();
  
  const { data: counter, error: counterError } = await supabaseAdmin
    .from('request_counters')
    .select('seq')
    .eq('year', year)
    .single();

  let newSeq = 1;
  
  if (counterError || !counter) {
    const { error: insertError } = await supabaseAdmin
      .from('request_counters')
      .insert({ year, seq: 1 });
    
    if (insertError) {
      throw new Error('Erro ao criar contador: ' + insertError.message);
    }
  } else {
    newSeq = counter.seq + 1;
    const { error: updateError } = await supabaseAdmin
      .from('request_counters')
      .update({ seq: newSeq })
      .eq('year', year);
    
    if (updateError) {
      throw new Error('Erro ao atualizar contador: ' + updateError.message);
    }
  }

  return `REQ-${year}-${String(newSeq).padStart(4, '0')}`;
}

async function getUserByEmail(supabaseAdmin: any, email: string): Promise<string | null> {
  const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
  
  if (error) {
    throw new Error('Erro ao buscar usuário: ' + error.message);
  }

  const user = users.find((u: any) => u.email === email);
  return user?.id || null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Método não permitido' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload: N8nWebhookPayload = await req.json();

    if (!payload.base || !payload.description || !payload.amount) {
      return new Response(
        JSON.stringify({ 
          error: 'Campos obrigatórios faltando',
          details: ['base', 'description', 'amount são obrigatórios']
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let requesterId = payload.requester_id;
    
    if (!requesterId && payload.requester_email) {
      requesterId = await getUserByEmail(supabaseAdmin, payload.requester_email);
      if (!requesterId) {
        return new Response(
          JSON.stringify({ error: `Usuário com email ${payload.requester_email} não encontrado` }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
    if (!requesterId) {
      const { data: defaultUser, error: defaultError } = await supabaseAdmin
        .from('user_profiles')
        .select('id')
        .in('role', ['REQUESTER', 'ADMIN'])
        .limit(1)
        .single();
      
      if (defaultError || !defaultUser) {
        return new Response(
          JSON.stringify({ 
            error: 'Nenhum usuário padrão encontrado no sistema. Crie pelo menos um usuário no Supabase Auth ou forneça requester_email/requester_id'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      requesterId = defaultUser.id;
    }

    if (payload.amount <= 0) {
      return new Response(
        JSON.stringify({ error: 'amount deve ser maior que zero' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let approverId = payload.approver_id || null;
    if (!approverId && payload.approver_email) {
      approverId = await getUserByEmail(supabaseAdmin, payload.approver_email);
      if (!approverId) {
        return new Response(
          JSON.stringify({ error: `Aprovador com email ${payload.approver_email} não encontrado` }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    let idCode = payload.id_code;
    if (!idCode) {
      idCode = await generateIdCode(supabaseAdmin);
    } else {
      const { data: existing } = await supabaseAdmin
        .from('approval_requests')
        .select('id')
        .eq('id_code', idCode)
        .single();

      if (existing) {
        return new Response(
          JSON.stringify({ error: `id_code ${idCode} já existe` }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const status = payload.status || 'PENDING';

    let requesterPhone = payload.requester_phone;
    if (requesterPhone) {
      requesterPhone = requesterPhone.replace(/[^0-9]/g, '');
    }

    const { data: request, error: insertError } = await supabaseAdmin
      .from('approval_requests')
      .insert({
        id_code: idCode,
        requester_id: requesterId,
        approver_id: approverId,
        base: payload.base,
        description: payload.description,
        amount: payload.amount.toString(),
        note: payload.note || null,
        receipt_url: payload.receipt_url || null,
        status: status,
        requester_email: payload.requester_email || null,
        requester_phone: requesterPhone || null,
      })
      .select()
      .single();

    if (insertError) {
      return new Response(
        JSON.stringify({ error: 'Erro ao criar solicitação: ' + insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    await supabaseAdmin
      .from('request_events')
      .insert({
        request_id: request.id,
        actor_id: requesterId,
        action: 'CREATE',
        message: 'Solicitação criada via n8n',
      });

    return new Response(
      JSON.stringify({
        success: true,
        request: {
          id: request.id,
          id_code: request.id_code,
          requester_id: request.requester_id,
          approver_id: request.approver_id,
          base: request.base,
          description: request.description,
          amount: request.amount,
          note: request.note,
          receipt_url: request.receipt_url,
          status: request.status,
          created_at: request.created_at,
          updated_at: request.updated_at,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
