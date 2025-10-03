// @ts-nocheck - Edge Function roda no Deno (Supabase), não no TypeScript local
/**
 * Edge Function: bright-function
 *
 * ⚠️ ATENÇÃO: Este arquivo é uma CÓPIA LOCAL para referência.
 * A versão real roda no Supabase Edge Functions (ambiente Deno).
 * Erros de TypeScript aqui são NORMAIS e esperados.
 *
 * Busca estatísticas de vídeos do YouTube usando YouTube Data API v3.
 *
 * COMO TESTAR NO PAINEL DO SUPABASE:
 * ====================================
 * Body (JSON):
 * {
 *   "project_id": 77,
 *   "video_ids": "dQw4w9WgXcQ,abc123",
 *   "parts": "statistics,snippet,contentDetails"
 * }
 *
 * RESPOSTA ESPERADA:
 * ==================
 * {
 *   "videos": [
 *     {
 *       "videoId": "dQw4w9WgXcQ",
 *       "title": "Never Gonna Give You Up",
 *       "description": "...",
 *       "channelId": "UCuAXFkgsw1L7xaCfnd5JJOw",
 *       "channelTitle": "Rick Astley",
 *       "viewCount": 1234567890,
 *       "likeCount": 12345678,
 *       "commentCount": 123456,
 *       "tags": "music,80s,pop"
 *     }
 *   ]
 * }
 *
 * CHAMADA POR:
 * ============
 * - 02_call_youtube_edge_function.sql (linha 18)
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

// Chave de API diretamente na função (em produção, use variáveis de ambiente)
const API_KEY = 'AIzaSyD9PWLCoomqo4CyvzlqLBiYWyWflQXd8U0';

serve(async (req) => {
  try {
    // Parsear o corpo da requisição
    const { project_id, video_ids, parts = 'statistics,snippet,contentDetails' } = await req.json();

    if (!video_ids) {
      return new Response(JSON.stringify({
        error: 'video_ids é obrigatório'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    // Construir a URL da API
    const apiUrl = `https://www.googleapis.com/youtube/v3/videos?id=${video_ids}&part=${encodeURIComponent(parts)}&key=${API_KEY}`;

    // Chamada à API do YouTube
    const response = await fetch(apiUrl);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Erro na API do YouTube: ${response.status} - ${errorText}`);
      return new Response(JSON.stringify({
        error: `Falha na requisição à API do YouTube: ${response.status}`
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    // Processar a resposta
    const data = await response.json();

    // Se não houver itens, retornar um array vazio
    if (!data.items || data.items.length === 0) {
      return new Response(JSON.stringify({
        videos: []
      }), {
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    // Processar cada vídeo para um formato simplificado
    // Com a adição de channelId e channelTitle
    const processedVideos = data.items.map((item) => ({
      videoId: item.id,
      title: item.snippet?.title || null,
      description: item.snippet?.description || null,
      channelId: item.snippet?.channelId || null,
      channelTitle: item.snippet?.channelTitle || null,
      viewCount: item.statistics?.viewCount ? parseInt(item.statistics.viewCount) : null,
      likeCount: item.statistics?.likeCount ? parseInt(item.statistics.likeCount) : null,
      commentCount: item.statistics?.commentCount ? parseInt(item.statistics.commentCount) : null,
      tags: item.snippet?.tags ? item.snippet.tags.join(',') : null
    }));

    // Retornar os dados processados
    return new Response(JSON.stringify({
      videos: processedVideos
    }), {
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Erro:', error.message);
    return new Response(JSON.stringify({
      error: `Erro interno: ${error.message}`
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
});

/*
// Como testar esta Edge Function:

// 1. No painel do Supabase (como mostrado na imagem):
//    - Acesse Functions > bright-function
//    - Selecione método HTTP: POST
//    - No corpo da requisição, coloque:
//      { "video_ids": "dQw4w9WgXcQ", "parts": "statistics,snippet,contentDetails" }
//    - Clique em "Send Request"

// 2. Via CLI do Supabase (localmente):
//    - supabase functions serve bright-function --no-verify-jwt
//    - Envie uma requisição:
//      curl -X POST http://localhost:54321/functions/v1/bright-function \
//      -H "Content-Type: application/json" \
//      -d '{"video_ids": "dQw4w9WgXcQ"}'

// 3. Em produção (após deploy):
//    - supabase functions deploy bright-function
//    - Teste com fetch:
//      await fetch('https://[projeto-id].supabase.co/functions/v1/bright-function', {
//        method: 'POST',
//        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer [token]' },
//        body: JSON.stringify({ "video_ids": "dQw4w9WgXcQ" })
//      })

// Nota: Considere mover a API_KEY para uma variável de ambiente:
// supabase secrets set YOUTUBE_API_KEY=sua_chave_api
// E no código: const API_KEY = Deno.env.get('YOUTUBE_API_KEY');
*/
