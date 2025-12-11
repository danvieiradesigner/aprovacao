import { supabase } from '../index';

export async function generateIdCode(): Promise<string> {
  const year = new Date().getFullYear();
  
  // Busca ou cria contador para o ano
  const { data: counter } = await supabase
    .from('request_counters')
    .select('seq')
    .eq('year', year)
    .single();

  let nextSeq: number;

  if (counter) {
    // Incrementa sequência
    const { data: updated } = await supabase
      .from('request_counters')
      .update({ seq: counter.seq + 1 })
      .eq('year', year)
      .select('seq')
      .single();

    nextSeq = updated?.seq || counter.seq + 1;
  } else {
    // Cria novo contador para o ano
    const { data: newCounter } = await supabase
      .from('request_counters')
      .insert({ year, seq: 1 })
      .select('seq')
      .single();

    nextSeq = newCounter?.seq || 1;
  }

  // Formata: ALC-YYYY-XXXXXX (6 dígitos)
  const seqStr = nextSeq.toString().padStart(6, '0');
  return `ALC-${year}-${seqStr}`;
}

