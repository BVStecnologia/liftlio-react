// =============================================
// Edge Function: youtube-oauth-handler
// Descrição: Gerencia OAuth do YouTube e identifica conta conectada
// Criado: 2025-01-18T15:50:00.000Z
// Autor: Supabase MCP Expert Agent
// =============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { access_token, refresh_token, project_id, action } = await req.json()

    if (!access_token || !project_id) {
      throw new Error('Missing required parameters')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Buscar informações da conta YouTube usando o token
    const userInfoResponse = await fetch(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        headers: {
          'Authorization': `Bearer ${access_token}`
        }
      }
    )

    if (!userInfoResponse.ok) {
      throw new Error('Failed to get user info from Google')
    }

    const userInfo = await userInfoResponse.json()

    // Buscar informações do canal YouTube
    const channelResponse = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
      {
        headers: {
          'Authorization': `Bearer ${access_token}`
        }
      }
    )

    let channelInfo = null
    if (channelResponse.ok) {
      const channelData = await channelResponse.json()
      if (channelData.items && channelData.items.length > 0) {
        channelInfo = channelData.items[0]
      }
    }

    // Se action é 'check', verificar integrações existentes
    if (action === 'check') {
      // Buscar o user_id do projeto
      const { data: projectData } = await supabase
        .from('Projeto')
        .select('User id')
        .eq('id', project_id)
        .single()

      if (!projectData) {
        throw new Error('Project not found')
      }

      // Buscar integrações existentes com mesmo email
      const { data: existingIntegrations } = await supabase
        .from('Integrações')
        .select(`
          id,
          youtube_email,
          youtube_channel_name,
          PROJETO id,
          Projeto!inner(
            id,
            Project name,
            User id
          )
        `)
        .eq('youtube_email', userInfo.email)
        .eq('Projeto.User id', projectData['User id'])
        .eq('ativo', true)

      return new Response(
        JSON.stringify({
          email: userInfo.email,
          channel_id: channelInfo?.id,
          channel_name: channelInfo?.snippet?.title,
          existing_integrations: existingIntegrations || [],
          can_reuse: (existingIntegrations && existingIntegrations.length > 0)
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    // Se action é 'save', salvar nova integração ou atualizar existente
    if (action === 'save' || !action) {
      // Verificar se já existe integração para este projeto
      const { data: existingIntegration } = await supabase
        .from('Integrações')
        .select('id')
        .eq('PROJETO id', project_id)
        .single()

      if (existingIntegration) {
        // Atualizar integração existente
        const { error: updateError } = await supabase
          .from('Integrações')
          .update({
            Token: access_token,
            'Refresh token': refresh_token,
            'expira em': 3599,
            'Ultima atualização': new Date().toISOString(),
            youtube_email: userInfo.email,
            youtube_channel_id: channelInfo?.id || null,
            youtube_channel_name: channelInfo?.snippet?.title || null,
            ativo: true
          })
          .eq('id', existingIntegration.id)

        if (updateError) throw updateError

        // Atualizar projeto
        await supabase
          .from('Projeto')
          .update({ integracao_valida: true })
          .eq('id', project_id)

        return new Response(
          JSON.stringify({
            success: true,
            integration_id: existingIntegration.id,
            message: 'Integration updated successfully',
            youtube_info: {
              email: userInfo.email,
              channel_id: channelInfo?.id,
              channel_name: channelInfo?.snippet?.title
            }
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        )
      } else {
        // Criar nova integração
        const { data: newIntegration, error: insertError } = await supabase
          .from('Integrações')
          .insert({
            Token: access_token,
            'Refresh token': refresh_token,
            'expira em': 3599,
            'Tipo de integração': 'youtube',
            'Ultima atualização': new Date().toISOString(),
            'PROJETO id': project_id,
            youtube_email: userInfo.email,
            youtube_channel_id: channelInfo?.id || null,
            youtube_channel_name: channelInfo?.snippet?.title || null,
            ativo: true
          })
          .select('id')
          .single()

        if (insertError) throw insertError

        // Atualizar projeto com a nova integração
        const { error: projectUpdateError } = await supabase
          .from('Projeto')
          .update({
            'Integrações': newIntegration.id,
            integracao_valida: true
          })
          .eq('id', project_id)

        if (projectUpdateError) throw projectUpdateError

        return new Response(
          JSON.stringify({
            success: true,
            integration_id: newIntegration.id,
            message: 'New integration created successfully',
            youtube_info: {
              email: userInfo.email,
              channel_id: channelInfo?.id,
              channel_name: channelInfo?.snippet?.title
            }
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        )
      }
    }

    throw new Error('Invalid action')

  } catch (error) {
    console.error('Error in youtube-oauth-handler:', error)

    return new Response(
      JSON.stringify({
        error: error.message,
        details: error.stack
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})