import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import OpenAI from "https://esm.sh/openai@4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";
const EVO_URL = Deno.env.get("EVOLUTION_URL") || "https://evo.appsoncafari.cloud";
const EVO_APIKEY = Deno.env.get("EVOLUTION_APIKEY") ?? "";
const EVO_INSTANCE = Deno.env.get("EVOLUTION_INSTANCE") || "aprovacao-oncafari";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// ========== HELPERS ==========

async function aiClassify(userText: string, options: string[], context: string): Promise<string | null> {
  const indexedOptions = options.map((opt, i) => `${i + 1}) ${opt}`).join("\n");
  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: `Determine a opção: ${context}.\n\nOpções:\n${indexedOptions}\n\nResponda APENAS o nome exato ou "null".` },
        { role: "user", content: userText }
      ],
      temperature: 0
    });
    const result = res.choices[0].message.content?.trim() || "null";
    return result === "null" ? null : result;
  } catch (e) { return null; }
}

function parseValorBR(str: string): number | null {
  if (!str) return null;
  const cleaned = str.replace(/R\$\s*/gi, "").replace(/\./g, "").replace(",", ".").trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function parseDataBR(str: string): string | null {
  if (!str) return null;
  const m = str.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (!m) return null;
  const d = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10);
  const y = m[3]?.length === 2 ? 2000 + parseInt(m[3], 10) : parseInt(m[3] || "2026", 10);
  const date = new Date(y, mo - 1, d);
  return isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function formatList(items: any[], field: string): string {
  if (!items || !items.length) return "";
  return items.map((x, i) => `${i + 1}) ${x[field] || x.nome || x.Base || x.Forma || x.Nome || ""}`).join("\n");
}

async function sendWhatsAppMessage(number: string, text: string) {
  const cleanNumber = number.replace(/\D/g, "");
  const url = `${EVO_URL}/message/sendText/${EVO_INSTANCE}`;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": EVO_APIKEY },
      body: JSON.stringify({ number: cleanNumber, text, options: { delay: 1000, presence: "composing" } })
    });
  } catch (e) { console.error("Erro WhatsApp:", e); }
}

async function getListData(tipo: string, base?: string): Promise<any[]> {
  try {
    switch (tipo) {
      case 'bases': {
        const { data: bData } = await supabase.from('list_bases').select('nome').eq('ativo', true).order('ordem');
        return (bData || []).map((r: any) => ({ Base: r.nome }));
      }
      case 'formas_pagamento': {
        const { data: pData } = await supabase.from('list_formas_pagamento').select('nome').eq('ativo', true).order('ordem');
        return (pData || []).map((r: any) => ({ Forma: r.nome }));
      }
      case 'bases_centro_custo': {
        const { data: ccData } = await supabase.from('list_bases_centro_custo').select('nome, descricao').eq('ativo', true).order('ordem');
        return (ccData || []).map((r: any) => ({ Nome: r.nome, base_centro_custo: r.descricao ? `${r.nome} - ${r.descricao}` : r.nome }));
      }
      default: return [];
    }
  } catch (e) { return []; }
}

// ========== MAIN ==========
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const payload = await req.json().catch(() => ({}));
    if (payload.event && payload.event !== "messages.upsert") return new Response("ok", { headers: corsHeaders });

    const msgData = payload.data;
    if (!msgData || !msgData.key || msgData.key.fromMe) return new Response("ok", { headers: corsHeaders });

    const remoteJid = msgData.key.remoteJid;
    const sessionKey = remoteJid.split("@")[0];

    const userText = (msgData.message?.conversation || msgData.message?.extendedTextMessage?.text || msgData.message?.imageMessage?.caption || "").trim();
    const isImage = msgData.messageType === "imageMessage";
    const base64Image = msgData.message?.base64 || msgData.message?.imageMessage?.base64;

    // --- FORÇAR SALVAMENTO RÍGIDO ---
    // Em vez de upsert (que depende de PK), vamos usar DELETE e depois INSERT
    // Isso garante que o estado atualize mesmo que o banco esteja "teimoso"
    
    // 1. Pega estado atual
    let { data: session } = await supabase.from("whatsapp_sessions").select("*").eq("phone_number", sessionKey).maybeSingle();
    let step = session?.step || 1;
    let data = session?.data || {};
    let nextStep = step;
    let message = "";

    console.log(`[DEBUG] Ativo: ${sessionKey} | Passo: ${step}`);

    // 2. Lógica de Negócio
    switch (step) {
      case 1:
        const bases = await getListData('bases');
        const mB = await aiClassify(userText, bases.map(b => b.Base), "Base");
        if (mB) {
          data.base = mB; nextStep = 2;
          message = "Show! Agora me envie a foto ou print do seu comprovante.";
        } else {
          message = "Não identifiquei a base. Escolha uma da lista:\n\n" + formatList(bases, 'Base');
        }
        break;

      case 2:
        if (isImage && base64Image) {
          try {
            message = "⏳ Lendo comprovante...";
            await sendWhatsAppMessage(sessionKey, message);
            const buffer = Uint8Array.from(atob(base64Image.replace(/\s/g, "")), (c) => c.charCodeAt(0));
            const fN = `${sessionKey}_${Date.now()}.jpg`;
            await supabase.storage.from('receipts').upload(fN, buffer, { contentType: 'image/jpeg' });
            const { data: { publicUrl } } = supabase.storage.from('receipts').getPublicUrl(fN);
            data.link_comprovante = publicUrl;

            const ocr = await openai.chat.completions.create({
              model: "gpt-4o-mini",
              messages: [{ role: "user", content: [{ type: "text", text: "Extraia: descricao, valor (numero), data (YYYY-MM-DD), nf. JSON." }, { type: "image_url", image_url: { url: publicUrl } }]}],
              response_format: { type: "json_object" }
            });
            const ocrRes = JSON.parse(ocr.choices[0].message.content || "{}");
            data = { ...data, ...ocrRes };
            nextStep = 3;
            message = `Identifiquei:\n\n📅 Data: ${data.data || "???"}\n💰 Valor: R$ ${data.valor ? data.valor.toFixed(2).replace('.',',') : "???"}\n\nConfirma a data? (sim/não)`;
          } catch (err) {
            message = "⚠️ Erro na leitura. Digite a DATA (DD/MM/AAAA):";
            nextStep = 3;
          }
        } else {
          message = "Por favor, envie a foto do comprovante.";
        }
        break;
    }

    // --- SALVAMENTO ATÔMICO (DELETE + INSERT) ---
    // Se o passo mudou, forçamos a atualização deletando o registro antigo e inserindo o novo
    if (nextStep !== step || !session) {
      console.log(`[DEBUG] Mudando passo de ${step} para ${nextStep}. Forçando gravação.`);
      await supabase.from("whatsapp_sessions").delete().eq("phone_number", sessionKey);
      await supabase.from("whatsapp_sessions").insert({ 
        phone_number: sessionKey, 
        step: nextStep, 
        data, 
        updated_at: new Date().toISOString() 
      });
    }

    if (message) await sendWhatsAppMessage(sessionKey, message);
    return new Response("ok", { status: 200, headers: corsHeaders });
  } catch (e: any) {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }
});
