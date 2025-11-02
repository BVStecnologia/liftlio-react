// =============================================
// Edge Function: Canal_youtube_dados
// Descrição: Busca detalhes de um canal do YouTube via YouTube Data API v3
// Criado: 2025-01-21
// Atualizado: 2025-01-23 - Usa Deno.env.get('YOUTUBE_API_KEY')
// =============================================

Deno.serve(async (req) => {
  // Headers CORS
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  // Verificar se é OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Verificar se é um método POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({
      error: 'Apenas método POST é suportado'
    }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  try {
    // Receber os dados da requisição
    const { channelId } = await req.json()

    // Verificar se o channelId foi fornecido
    if (!channelId) {
      return new Response(JSON.stringify({
        error: 'É necessário fornecer um channelId'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Buscar API key das variáveis de ambiente da Edge Function
    const apiKey = Deno.env.get('YOUTUBE_API_KEY')

    if (!apiKey) {
      console.error('YOUTUBE_API_KEY não configurada')
      return new Response(JSON.stringify({
        error: 'YOUTUBE_API_KEY não configurada nas variáveis de ambiente'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // URL da API do YouTube para buscar detalhes do canal
    const apiUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&id=${channelId}&key=${apiKey}`

    // Fazer a requisição para a API do YouTube
    const response = await fetch(apiUrl)

    // Verificar se a resposta foi bem-sucedida
    if (!response.ok) {
      const errorData = await response.json()
      console.error('Erro da YouTube API:', errorData)
      return new Response(JSON.stringify({
        error: 'Erro ao buscar dados do canal',
        details: errorData
      }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Obter os dados da resposta
    const data = await response.json()

    // Verificar se encontrou o canal
    if (!data.items || data.items.length === 0) {
      return new Response(JSON.stringify({
        error: 'Canal não encontrado'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Extrair informações relevantes do canal
    const channelInfo = data.items[0]

    // Formatar os dados para retornar
    const channelDetails = {
      id: channelInfo.id,
      title: channelInfo.snippet.title,
      description: channelInfo.snippet.description,
      customUrl: channelInfo.snippet.customUrl,
      publishedAt: channelInfo.snippet.publishedAt,
      thumbnails: channelInfo.snippet.thumbnails,
      country: channelInfo.snippet.country,
      statistics: {
        viewCount: channelInfo.statistics.viewCount,
        subscriberCount: channelInfo.statistics.subscriberCount,
        hiddenSubscriberCount: channelInfo.statistics.hiddenSubscriberCount,
        videoCount: channelInfo.statistics.videoCount
      },
      uploadsPlaylistId: channelInfo.contentDetails?.relatedPlaylists?.uploads
    }

    // Retornar os dados formatados
    return new Response(JSON.stringify(channelDetails), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    // Tratar erros
    console.error('Erro ao processar requisição:', error)
    return new Response(JSON.stringify({
      error: 'Erro ao processar a requisição',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
