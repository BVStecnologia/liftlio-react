import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
// Puxar key do Vault (NÃO hardcoded!)
const API_KEY = Deno.env.get('YOUTUBE_API_KEY');
if (!API_KEY) {
  throw new Error('YOUTUBE_API_KEY not set in environment');
}
serve(async (req)=>{
  try {
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
    const apiUrl = `https://www.googleapis.com/youtube/v3/videos?id=${video_ids}&part=${encodeURIComponent(parts)}&key=${API_KEY}`;
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
    const data = await response.json();
    if (!data.items || data.items.length === 0) {
      return new Response(JSON.stringify({
        videos: []
      }), {
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    const processedVideos = data.items.map((item)=>({
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
