import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface ResponseWebhookPayload {
  status: 'aprovar' | 'rejeitar' | 'esclarecer';
  descricao: string;
  request_id: string;
  id_code: string;
  telefone: string | null;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload: ResponseWebhookPayload = await req.json();

    // Validação básica
    if (!payload.status || !payload.request_id || !payload.id_code) {
      return new Response(
        JSON.stringify({ error: 'Campos obrigatórios faltando: status, request_id, id_code' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // URL do webhook do n8n
    const n8nWebhookUrl = 'https://n8n.appsoncafari.cloud/webhook/resposta';

    console.log('[send-response-webhook] Enviando para n8n:', {
      url: n8nWebhookUrl,
      method: 'POST',
      payload: payload,
    });

    // Faz a requisição para o n8n
    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    let responseData;
    
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }

    console.log('[send-response-webhook] Resposta do n8n:', {
      status: response.status,
      statusText: response.statusText,
      data: responseData,
    });

    if (!response.ok) {
      // Se for 404, pode ser que o webhook não esteja configurado corretamente no n8n
      if (response.status === 404) {
        console.error('[send-response-webhook] Webhook não encontrado no n8n. Verifique:');
        console.error('  1. Se o webhook está ativo no n8n');
        console.error('  2. Se o webhook está configurado para aceitar POST');
        console.error('  3. Se a URL está correta:', n8nWebhookUrl);
        console.error('  4. Resposta do n8n:', responseData);
      }
      
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao enviar webhook para n8n',
          details: responseData,
          status: response.status,
          message: response.status === 404 
            ? 'Webhook não encontrado. Verifique se está ativo e configurado para POST no n8n.'
            : 'Erro ao comunicar com n8n'
        }),
        { 
          status: response.status || 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Webhook enviado com sucesso',
        data: responseData 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error: any) {
    console.error('[send-response-webhook] Erro:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno ao processar webhook',
        message: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
