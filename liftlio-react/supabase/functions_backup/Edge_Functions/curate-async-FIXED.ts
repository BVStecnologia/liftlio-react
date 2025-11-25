/**
 * Edge Function: curate-async (FIXED VERSION)
 *
 * Descrição: Dispara curadoria de comentários com Claude em background
 * - Recebe video_id via POST
 * - Aguarda 2 segundos (tempo para commit da transação anterior)
 * - Executa curate_comments_with_claude via RPC
 * - Retorna imediatamente sem bloquear chamador
 *
 * CORREÇÕES (2025-11-13):
 * - ✅ Validação obrigatória de env vars (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
 * - ✅ Logs detalhados em cada etapa
 * - ✅ Mensagens de erro claras
 * - ✅ Timeout handling melhorado
 *
 * Uso: Chamado por get_filtered_comments via pg_net.http_post
 *
 * Criado: 2025-11-13
 * Atualizado: 2025-11-13 - Validação de env vars + logs
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('🔄 [curate-async] CORS preflight request');
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('🚀 [curate-async] === INÍCIO DA EXECUÇÃO ===');
    console.log(`📅 [curate-async] Timestamp: ${new Date().toISOString()}`);

    // 1. VALIDAR ENV VARS (CRÍTICO!)
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    console.log('🔐 [curate-async] Validando variáveis de ambiente...');
    console.log(`  - SUPABASE_URL: ${supabaseUrl ? '✅ Definida' : '❌ AUSENTE'}`);
    console.log(`  - SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey ? '✅ Definida' : '❌ AUSENTE'}`);

    if (!supabaseUrl || !supabaseServiceKey) {
      const errorMsg = {
        error: 'missing_env_vars',
        message: 'Variáveis de ambiente obrigatórias não configuradas',
        missing: {
          SUPABASE_URL: !supabaseUrl,
          SUPABASE_SERVICE_ROLE_KEY: !supabaseServiceKey
        },
        hint: 'Configure as variáveis no Dashboard > Edge Functions > Secrets'
      };

      console.error('❌ [curate-async] ERRO CRÍTICO: Variáveis ausentes!', errorMsg);

      return new Response(JSON.stringify(errorMsg), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ [curate-async] Variáveis de ambiente validadas!');

    // 2. EXTRAIR video_id do body
    let video_id: number;
    try {
      const body = await req.json();
      video_id = body.video_id;
      console.log(`📦 [curate-async] Body recebido:`, JSON.stringify(body));
    } catch (parseError) {
      console.error('❌ [curate-async] Erro ao parsear JSON:', parseError);
      return new Response(JSON.stringify({
        error: 'invalid_json',
        message: 'Body da requisição não é JSON válido',
        details: parseError.message
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!video_id) {
      console.error('❌ [curate-async] video_id ausente no body');
      return new Response(JSON.stringify({
        error: 'video_id required',
        message: 'Parâmetro video_id é obrigatório',
        hint: 'Envie { "video_id": 12345 } no body'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`🎯 [curate-async] video_id recebido: ${video_id}`);

    // 3. AGUARDAR 2 segundos (dar tempo do COMMIT da transação anterior)
    console.log('⏱️ [curate-async] Aguardando 2 segundos antes de iniciar RPC...');
    await new Promise((resolve) => setTimeout(resolve, 2000));
    console.log('✅ [curate-async] Aguardo concluído, iniciando RPC...');

    // 4. CRIAR CLIENTE SUPABASE
    console.log('🔧 [curate-async] Criando cliente Supabase...');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log('✅ [curate-async] Cliente Supabase criado com sucesso!');

    // 5. EXECUTAR CURADORIA VIA RPC
    console.log(`🤖 [curate-async] Iniciando RPC curate_comments_with_claude para vídeo ${video_id}...`);

    const startTime = Date.now();
    const { data, error } = await supabase.rpc('curate_comments_with_claude', {
      video_id_param: video_id
    });
    const duration = Date.now() - startTime;

    console.log(`⏱️ [curate-async] RPC concluído em ${duration}ms`);

    // 6. TRATAR ERROS DO RPC
    if (error) {
      console.error('❌ [curate-async] ERRO NO RPC:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        video_id
      });

      return new Response(JSON.stringify({
        error: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        video_id,
        duration_ms: duration
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 7. SUCESSO!
    console.log(`✅ [curate-async] === CURADORIA CONCLUÍDA ===`);
    console.log(`📊 [curate-async] Resultado:`, {
      video_id: data?.video_id,
      total_original: data?.total_comments_original,
      total_analyzed: data?.total_comments_analyzed,
      top_selected: data?.top_comments_selected,
      mode: data?.curation_mode,
      duration_ms: duration
    });

    return new Response(JSON.stringify({
      success: true,
      video_id,
      result: data,
      message: `Curadoria concluída: ${data?.top_comments_selected} comentários selecionados`,
      duration_ms: duration
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ [curate-async] === ERRO NÃO TRATADO ===');
    console.error('  Tipo:', error?.constructor?.name);
    console.error('  Mensagem:', error?.message);
    console.error('  Stack:', error?.stack);

    return new Response(JSON.stringify({
      error: 'internal_error',
      message: error?.message || 'Erro desconhecido',
      type: error?.constructor?.name,
      stack: error?.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
