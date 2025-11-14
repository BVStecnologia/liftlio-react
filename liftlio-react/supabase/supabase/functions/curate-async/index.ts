/**
 * Edge Function: curate-async
 *
 * Descrição: Dispara curadoria de comentários com Claude em background
 * - Recebe video_id via POST
 * - Aguarda 2 segundos (tempo para commit da transação anterior)
 * - Executa curate_comments_with_claude via RPC
 * - Retorna imediatamente sem bloquear chamador
 *
 * Uso: Chamado por get_filtered_comments via pg_net.http_post
 *
 * Criado: 2025-11-13
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
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { video_id } = await req.json();

    if (!video_id) {
      return new Response(
        JSON.stringify({
          error: 'video_id required',
          message: 'Parâmetro video_id é obrigatório'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`🚀 [curate-async] Iniciando curadoria para vídeo ${video_id}`);

    // Aguardar 2 segundos (dar tempo do COMMIT da transação anterior)
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log(`⏱️ [curate-async] Aguardou 2s, iniciando RPC...`);

    // Criar cliente Supabase com service_role
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Executar curadoria via RPC
    const { data, error } = await supabase.rpc('curate_comments_with_claude', {
      video_id_param: video_id
    });

    if (error) {
      console.error(`❌ [curate-async] Erro na curadoria:`, error);
      return new Response(
        JSON.stringify({
          error: error.message,
          details: error.details,
          hint: error.hint,
          video_id
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`✅ [curate-async] Curadoria concluída para vídeo ${video_id}`);
    console.log(`📊 [curate-async] Resultado:`, {
      video_id: data?.video_id,
      total_original: data?.total_comments_original,
      total_analyzed: data?.total_comments_analyzed,
      top_selected: data?.top_comments_selected,
      mode: data?.curation_mode
    });

    return new Response(
      JSON.stringify({
        success: true,
        video_id,
        result: data,
        message: `Curadoria concluída: ${data?.top_comments_selected} comentários selecionados`
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error(`❌ [curate-async] Erro não tratado:`, error);
    return new Response(
      JSON.stringify({
        error: error.message,
        stack: error.stack
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
