import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ContactPayload {
  phone_number: string;
  name?: string;
  email?: string;
  base?: string;
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

    const payload: ContactPayload = await req.json();

    if (!payload.phone_number) {
      return new Response(
        JSON.stringify({ error: 'phone_number é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const phoneNumber = payload.phone_number.replace(/[^0-9]/g, '');

    const { data: existingContact, error: fetchError } = await supabaseAdmin
      .from('contacts')
      .select('*')
      .eq('phone_number', phoneNumber)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar contato: ' + fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (existingContact) {
      const updateData: Partial<ContactPayload> = {};
      if (payload.name) updateData.name = payload.name;
      if (payload.email) updateData.email = payload.email;
      if (payload.base) updateData.base = payload.base;

      if (Object.keys(updateData).length > 0) {
        const { data: updatedContact, error: updateError } = await supabaseAdmin
          .from('contacts')
          .update(updateData)
          .eq('phone_number', phoneNumber)
          .select()
          .single();

        if (updateError) {
          return new Response(
            JSON.stringify({ error: 'Erro ao atualizar contato: ' + updateError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, contact: updatedContact, created: false }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, contact: existingContact, created: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: newContact, error: insertError } = await supabaseAdmin
      .from('contacts')
      .insert({
        phone_number: phoneNumber,
        name: payload.name || null,
        email: payload.email || null,
        base: payload.base || null,
      })
      .select()
      .single();

    if (insertError) {
      return new Response(
        JSON.stringify({ error: 'Erro ao criar contato: ' + insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, contact: newContact, created: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
