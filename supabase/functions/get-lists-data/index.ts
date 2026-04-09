import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type ListType = 'bases' | 'codigos' | 'fornecedores' | 'formas_pagamento' | 'bases_centro_custo' | 'numeros_referencia';

const VALID_TIPOS: ListType[] = [
  'bases',
  'codigos',
  'fornecedores',
  'formas_pagamento',
  'bases_centro_custo',
  'numeros_referencia',
];

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
        JSON.stringify({ error: 'Método não permitido. Use POST.' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const tipo = (body.tipo || '').toLowerCase().trim();
    const base = (body.base || '').trim() || null; // Filtro opcional para numeros_referencia

    if (!tipo || !VALID_TIPOS.includes(tipo as ListType)) {
      return new Response(
        JSON.stringify({
          error: 'tipo inválido',
          tipos_validos: VALID_TIPOS,
          exemplo: { tipo: 'bases' },
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let data: Record<string, unknown>[] = [];

    switch (tipo) {
      case 'bases': {
        const { data: rows } = await supabaseAdmin
          .from('list_bases')
          .select('nome, descricao')
          .eq('ativo', true)
          .order('ordem')
          .order('nome');
        data = (rows || []).map((r) => ({ Base: r.nome, Descrição: r.descricao || '' }));
        break;
      }

      case 'codigos': {
        let query = supabaseAdmin
          .from('list_numeros_referencia')
          .select('numero_referencia, descricao, base')
          .eq('ativo', true)
          .order('ordem')
          .order('numero_referencia');
        if (base) {
          query = query.eq('base', base);
        }
        const { data: rows } = await query;
        data = (rows || []).map((r) => ({
          Código: r.numero_referencia,
          Descrição: r.descricao || '',
          codigo_completo: `${r.numero_referencia} - ${r.descricao || ''}`,
          numero_referencia: r.numero_referencia,
          descricao: r.descricao || '',
        }));
        break;
      }

      case 'fornecedores': {
        const { data: rows } = await supabaseAdmin
          .from('list_fornecedores')
          .select('nome')
          .eq('ativo', true)
          .order('ordem')
          .order('nome');
        data = (rows || []).map((r) => ({ Fornecedor: r.nome }));
        break;
      }

      case 'formas_pagamento': {
        const { data: rows } = await supabaseAdmin
          .from('list_formas_pagamento')
          .select('nome')
          .eq('ativo', true)
          .order('ordem')
          .order('nome');
        data = (rows || []).map((r) => ({ Forma: r.nome }));
        break;
      }

      case 'bases_centro_custo': {
        const { data: rows } = await supabaseAdmin
          .from('list_bases_centro_custo')
          .select('nome, descricao')
          .eq('ativo', true)
          .order('ordem')
          .order('nome');
        data = (rows || []).map((r) => ({
          Nome: r.nome,
          Descrição: r.descricao || '',
          base_centro_custo: r.descricao ? `${r.nome} - ${r.descricao}` : r.nome,
        }));
        break;
      }

      case 'numeros_referencia': {
        let query = supabaseAdmin
          .from('list_numeros_referencia')
          .select('numero_referencia, descricao, base')
          .eq('ativo', true)
          .order('ordem')
          .order('numero_referencia');
        if (base) {
          query = query.eq('base', base);
        }
        const { data: rows } = await query;
        data = (rows || []).map((r) => ({
          'Nº referência': r.numero_referencia,
          Descrição: r.descricao || '',
          Base: r.base || '',
          codigo_completo: `${r.numero_referencia} - ${r.descricao || ''}`,
          numero_referencia: r.numero_referencia,
          descricao: r.descricao || '',
        }));
        break;
      }
    }

    return new Response(
      JSON.stringify({ success: true, tipo, data, count: data.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro interno do servidor';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
