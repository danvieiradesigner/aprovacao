import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Configurações (Secrets)
const EVO_URL = Deno.env.get("EVOLUTION_URL") || "https://evo.appsoncafari.cloud";
const EVO_APIKEY = Deno.env.get("EVOLUTION_APIKEY") ?? "";
const EVO_INSTANCE = Deno.env.get("EVOLUTION_INSTANCE") || "aprovacao-oncafari";

interface ResponseWebhookPayload {
  status: 'aprovar' | 'rejeitar' | 'esclarecer';
  descricao: string;
  request_id: string;
  id_code: string;
  telefone: string | null;
  purchase_description?: string | null;
  purchase_date?: string | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload: ResponseWebhookPayload = await req.json();

    if (!payload.status || !payload.id_code || !payload.telefone) {
      return new Response(
        JSON.stringify({ error: 'Campos obrigatórios faltando: status, id_code, telefone' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Formatar data para exibição
    let formattedDate = '';
    if (payload.purchase_date) {
      try {
        const date = new Date(payload.purchase_date);
        formattedDate = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
      } catch (e) { console.error(e); }
    }

    // Montar mensagem
    let statusEmoji = payload.status === 'aprovar' ? '✅' : payload.status === 'rejeitar' ? '❌' : '⚠️';
    let statusText = payload.status === 'aprovar' ? 'APROVADA' : payload.status === 'rejeitar' ? 'REJEITADA' : 'NECESSITA ESCLARECIMENTO';
    
    let message = `${statusEmoji} *DESPESA ${statusText}*\n\n`;
    message += `Cod: ${payload.id_code}\n`;
    if (formattedDate) message += `Data: ${formattedDate}\n`;
    if (payload.purchase_description) message += `Descrição: ${payload.purchase_description}\n`;
    
    if (payload.descricao) {
      message += `\n*Observação do Aprovador:*\n${payload.descricao}`;
    }

    // Enviar para Evolution API diretamente
    const url = `${EVO_URL}/message/sendText/${EVO_INSTANCE}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVO_APIKEY,
      },
      body: JSON.stringify({
        number: payload.telefone.replace(/\D/g, ''),
        text: message,
        options: { delay: 1000, presence: "composing" }
      }),
    });

    const result = await response.json();

    return new Response(
      JSON.stringify({ success: true, evolution: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[send-response-webhook] Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
