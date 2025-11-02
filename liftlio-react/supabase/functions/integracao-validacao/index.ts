import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';
import { formatError, validateRequiredParam } from '../_shared/utils.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Função para desativar todas as integrações exceto a mais recente
async function desativarIntegracoesAntigas(supabase, projetoId, integracaoAtualId) {
  try {
    console.log(`Tentando desativar integrações antigas para o projeto ${projetoId}, mantendo apenas a integração ${integracaoAtualId}`);

    // Primeiro, vamos verificar quais integrações serão desativadas
    const { data: integracoesParaDesativar } = await supabase
      .from('Integrações')
      .select('id, created_at, "Tipo de integração", ativo')
      .eq('PROJETO id', projetoId)
      .neq('id', integracaoAtualId);

    console.log(`Integrações a serem desativadas: ${integracoesParaDesativar?.length || 0}`);
    if (integracoesParaDesativar?.length) {
      console.log(`IDs a desativar: ${integracoesParaDesativar.map((i)=>i.id).join(', ')}`);
    }

    // Desativar cada integração individualmente
    const integracoesDesativadas = [];
    for (const integracao of integracoesParaDesativar || []){
      // Pular se já estiver inativa
      if (integracao.ativo === false) {
        console.log(`Integração ${integracao.id} já está inativa, pulando`);
        continue;
      }

      // Desativar a integração em vez de excluir
      const { data, error } = await supabase
        .from('Integrações')
        .update({
          ativo: false
        })
        .eq('id', integracao.id)
        .select('id, created_at');

      if (error) {
        console.error(`Erro ao desativar integração ${integracao.id}:`, error.message);
      } else if (data?.length) {
        console.log(`Integração ${integracao.id} desativada com sucesso`);
        integracoesDesativadas.push(data[0]);
      }
    }

    return {
      success: true,
      count: integracoesDesativadas.length,
      data: integracoesDesativadas
    };
  } catch (error) {
    console.error('Exceção ao desativar integrações antigas:', error);
    return {
      success: false,
      count: 0,
      error
    };
  }
}

console.log('Integração Validação function started');

// Função para verificar a validade do token do YouTube
async function verificarTokenYoutube(accessToken) {
  try {
    console.log('Verificando token do YouTube com chamada à API...');
    const response = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    // Se a resposta não for ok, vamos obter mais detalhes sobre o erro
    if (!response.ok) {
      const errorData = await response.json().catch(()=>({
          error: 'Erro desconhecido'
        }));
      console.error(`Erro na verificação do token do YouTube (${response.status}):`, errorData);

      // Registrar informações adicionais para depuração
      if (response.status === 401) {
        console.error('Token inválido ou expirado (401 Unauthorized)');
      } else if (response.status === 403) {
        console.error('Permissões insuficientes ou token bloqueado (403 Forbidden)');
      }
    }

    return response.ok;
  } catch (error) {
    console.error('Exceção ao verificar token do YouTube:', error);
    return false;
  }
}

// Função para atualizar o token usando o refresh token
async function refreshYoutubeToken(refreshToken) {
  try {
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      throw new Error('Credenciais do Google não configuradas');
    }

    console.log('Tentando atualizar token usando refresh token...');

    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    });

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    // Se o refresh falhar, capturar detalhes do erro
    if (!response.ok) {
      const errorData = await response.json().catch(()=>({
          error: 'Erro desconhecido'
        }));
      console.error(`Erro na atualização do token (${response.status}):`, errorData);

      if (errorData.error === 'invalid_grant') {
        throw new Error('Refresh token inválido ou expirado. Necessário reautenticar.');
      } else {
        throw new Error(`Falha ao atualizar token: ${errorData.error || response.statusText}`);
      }
    }

    const data = await response.json();

    // Verificar se a resposta contém os dados esperados
    if (!data.access_token) {
      console.error('Resposta do refresh sem access_token:', data);
      throw new Error('Resposta de refresh inválida: token não encontrado');
    }

    console.log('Token atualizado com sucesso. Expira em:', data.expires_in, 'segundos');

    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in
    };
  } catch (error) {
    console.error('Erro ao atualizar refresh token:', error);
    throw error;
  }
}

// Função para listar todas as integrações
async function listarIntegracoes(supabase) {
  try {
    const { data, error } = await supabase
      .from('Integrações')
      .select('*')
      .order('created_at', {
        ascending: false
      });

    if (error) {
      console.error('Erro ao listar integrações:', error.message);
      return {
        success: false,
        error: error.message
      };
    }

    return {
      success: true,
      count: data?.length || 0,
      integracoes: data
    };
  } catch (error) {
    console.error('Erro ao listar integrações:', error);
    return {
      success: false,
      error: String(error)
    };
  }
}

// Função para desativar uma integração específica
async function desativarIntegracao(supabase, integracaoId) {
  try {
    console.log(`Tentando desativar integração com ID ${integracaoId}`);

    // Verificar primeiro se a integração existe e está ativa
    const { data: checkData, error: checkError } = await supabase
      .from('Integrações')
      .select('id, ativo')
      .eq('id', integracaoId)
      .maybeSingle();

    if (checkError) {
      console.error(`Erro ao verificar integração ${integracaoId}:`, checkError.message);
      return {
        success: false,
        error: checkError.message
      };
    }

    if (!checkData) {
      return {
        success: false,
        error: `Integração com ID ${integracaoId} não encontrada`
      };
    }

    if (checkData.ativo === false) {
      return {
        success: true,
        desativado: false,
        message: `Integração ${integracaoId} já está inativa`
      };
    }

    // Em vez de excluir, vamos desativar a integração
    const { data, error } = await supabase
      .from('Integrações')
      .update({
        ativo: false
      })
      .eq('id', integracaoId)
      .select('id');

    if (error) {
      console.error(`Erro ao desativar integração ${integracaoId}:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }

    return {
      success: true,
      desativado: data?.length > 0,
      idDesativado: data?.length > 0 ? data[0].id : null
    };
  } catch (error) {
    console.error(`Erro ao desativar integração ${integracaoId}:`, error);
    return {
      success: false,
      error: String(error)
    };
  }
}

serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest();
  }

  // Apenas aceita solicitações POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify(formatError('Apenas método POST é suportado')), {
      status: 405,
      headers: corsHeaders
    });
  }

  try {
    // Parse the request body
    const { projetoId, forceCleanup, scanAll, deleteId } = await req.json();

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Se solicitado, desativar uma integração específica
    if (deleteId) {
      const resultado = await desativarIntegracao(supabase, deleteId);
      return new Response(JSON.stringify(resultado), {
        status: 200,
        headers: corsHeaders
      });
    }

    // Se solicitado, listar todas as integrações
    if (scanAll) {
      const resultado = await listarIntegracoes(supabase);
      return new Response(JSON.stringify(resultado), {
        status: 200,
        headers: corsHeaders
      });
    }

    // Validate required parameters
    validateRequiredParam(projetoId, 'projetoId');

    // Buscar todas as integrações para o projeto
    const { data: todasIntegracoes, error: integracaoError } = await supabase
      .from('Integrações')
      .select('*')
      .eq('PROJETO id', projetoId)
      .order('created_at', {
        ascending: false
      });

    console.log(`Total de integrações encontradas para o projeto ${projetoId}: ${todasIntegracoes?.length || 0}`);

    // Verificar se existem integrações
    if (!todasIntegracoes || todasIntegracoes.length === 0) {
      return new Response(JSON.stringify({
        status: 'nao_encontrada',
        message: 'Nenhuma integração encontrada para este projeto'
      }), {
        status: 200,
        headers: corsHeaders
      });
    }

    // Pegar a mais recente
    const integracao = todasIntegracoes[0];

    // Identificar integrações antigas a serem removidas
    const integracoesAntigas = todasIntegracoes.slice(1); // todas, exceto a primeira (mais recente)

    if (integracaoError) {
      return new Response(JSON.stringify(formatError(`Erro ao buscar integrações: ${integracaoError.message}`)), {
        status: 400,
        headers: corsHeaders
      });
    }

    // Se não existir integração, retornar status correspondente
    if (!integracao) {
      return new Response(JSON.stringify({
        status: 'nao_encontrada',
        message: 'Nenhuma integração encontrada para este projeto'
      }), {
        status: 200,
        headers: corsHeaders
      });
    }

    // Verificar se a integração está ativa
    if (!integracao.ativo) {
      return new Response(JSON.stringify({
        status: 'inativa',
        message: 'A integração está inativa',
        integracao: {
          id: integracao.id,
          tipo: integracao['Tipo de integração'],
          ultimaAtualizacao: integracao['Ultima atualização'],
          ativo: integracao.ativo
        }
      }), {
        status: 200,
        headers: corsHeaders
      });
    }

    // Verificar se a integração está expirada
    const agora = new Date();
    const ultimaAtualizacao = integracao['Ultima atualização'] ? new Date(integracao['Ultima atualização']) : null;
    const expiraEm = integracao['expira em'] || 0; // Em segundos
    const refreshToken = integracao['Refresh token'];
    const accessToken = integracao['Token'];
    const tipoIntegracao = integracao['Tipo de integração'];

    // Começamos assumindo que a integração é inválida até provarmos o contrário
    let status = 'invalida';
    let message = 'Integração inválida, verificação necessária';
    let tokenRefreshed = false;
    let newToken = accessToken;
    let newExpiresIn = expiraEm;

    console.log(`Verificando integração ${integracao.id} do projeto ${projetoId}:`);
    console.log(`- Tipo: ${tipoIntegracao}`);
    console.log(`- Última atualização: ${ultimaAtualizacao}`);
    console.log(`- Token presente: ${!!accessToken}`);
    console.log(`- Refresh token presente: ${!!refreshToken}`);

    if (!integracao.ativo) {
      status = 'inativa';
      message = 'A integração está inativa';
    } else if (ultimaAtualizacao) {
      const tempoDecorrido = Math.floor((agora.getTime() - ultimaAtualizacao.getTime()) / 1000); // Em segundos
      const tempoRestante = expiraEm - tempoDecorrido;

      console.log(`- Tempo decorrido desde última atualização: ${tempoDecorrido} segundos`);
      console.log(`- Tempo restante: ${tempoRestante} segundos`);

      // Verificar se o token está expirado ou prestes a expirar
      if (tempoRestante <= 0) {
        status = 'expirada';
        message = 'A integração está expirada e precisa ser renovada';
      } else if (tempoRestante < 300) {
        status = 'expirando';
        message = 'A integração está prestes a expirar';
      // Verificar se o token está prestes a expirar (menos de 1 hora)
      } else if (tempoRestante < 3600 && refreshToken && tipoIntegracao && [
        'youtube',
        'Youtube'
      ].includes(tipoIntegracao)) {
        try {
          console.log('Token expirando em menos de 1 hora, atualizando...');

          // Tentar atualizar o token
          const refreshResult = await refreshYoutubeToken(refreshToken);

          // Verificar se o refresh foi bem-sucedido
          if (!refreshResult || !refreshResult.accessToken) {
            throw new Error('Refresh token não retornou um novo token válido');
          }

          newToken = refreshResult.accessToken;
          newExpiresIn = refreshResult.expiresIn;

          // Verificar se o novo token é válido fazendo uma chamada à API
          const novoTokenValido = await verificarTokenYoutube(newToken);
          console.log(`Novo token após refresh é válido? ${novoTokenValido ? 'Sim' : 'Não'}`);

          if (!novoTokenValido) {
            throw new Error('O novo token gerado pelo refresh não é válido');
          }

          // Atualizar o token no banco de dados
          const { error: updateError } = await supabase
            .from('Integrações')
            .update({
              'Token': newToken,
              'expira em': newExpiresIn,
              'Ultima atualização': agora.toISOString()
            })
            .eq('id', integracao.id);

          if (updateError) {
            console.error('Erro ao atualizar token:', updateError.message);
            throw new Error(`Erro ao atualizar token: ${updateError.message}`);
          }

          tokenRefreshed = true;
          status = 'atualizada';
          message = 'Token atualizado com sucesso';
        } catch (error) {
          console.error('Erro ao atualizar token:', error);
          status = 'invalida';
          message = 'Token e refresh token inválidos. Necessário reautenticar.';
        }
      } else if (tempoRestante <= 0) {
        status = 'expirada';
        message = 'A integração está expirada e precisa ser renovada';
      } else if (tempoRestante < 300) {
        status = 'expirando';
        message = 'A integração está prestes a expirar';
      } else if (tipoIntegracao && [
        'youtube',
        'Youtube'
      ].includes(tipoIntegracao) && accessToken) {
        console.log('Verificando se o token do YouTube é válido...');

        // Verificar se o token ainda é válido fazendo uma chamada à API do YouTube
        const tokenValido = await verificarTokenYoutube(accessToken);
        console.log(`Resultado da verificação do token: ${tokenValido ? 'Válido' : 'Inválido'}`);

        if (tokenValido) {
          // Token passou na verificação, está válido
          status = 'valida';
          message = 'Integração válida';
        } else if (refreshToken) {
          try {
            console.log('Token inválido, tentando atualizar usando refresh token...');

            // Tentar atualizar o token
            const refreshResult = await refreshYoutubeToken(refreshToken);

            // Verificar se o refresh foi bem-sucedido
            if (!refreshResult || !refreshResult.accessToken) {
              throw new Error('Refresh token não retornou um novo token válido');
            }

            newToken = refreshResult.accessToken;
            newExpiresIn = refreshResult.expiresIn;

            // Verificar se o novo token é válido fazendo uma chamada à API
            const novoTokenValido = await verificarTokenYoutube(newToken);
            console.log(`Novo token após refresh é válido? ${novoTokenValido ? 'Sim' : 'Não'}`);

            if (!novoTokenValido) {
              throw new Error('O novo token gerado pelo refresh não é válido');
            }

            // Atualizar o token no banco de dados
            const { error: updateError } = await supabase
              .from('Integrações')
              .update({
                'Token': newToken,
                'expira em': newExpiresIn,
                'Ultima atualização': agora.toISOString()
              })
              .eq('id', integracao.id);

            if (updateError) {
              console.error('Erro ao atualizar token:', updateError.message);
              throw new Error(`Erro ao atualizar token: ${updateError.message}`);
            }

            tokenRefreshed = true;
            status = 'atualizada';
            message = 'Token atualizado com sucesso';
          } catch (error) {
            console.error('Erro ao atualizar token:', error);
            status = 'invalida';
            message = 'Token e refresh token inválidos. Necessário reautenticar.';
          }
        } else {
          status = 'invalida';
          message = 'O token não é mais válido e não possui refresh token';
        }
      } else {
        status = 'indefinida';
        message = 'Não foi possível determinar a validade da integração';
      }
    } else {
      status = 'incompleta';
      message = 'A integração não possui data de última atualização';
    }

    // Usar a função centralizada para desativar integrações antigas
    const desativacaoResult = await desativarIntegracoesAntigas(supabase, projetoId, integracao.id);

    if (!desativacaoResult.success) {
      console.error('Falha ao desativar integrações antigas:', desativacaoResult.error);
    } else {
      console.log(`Integrações antigas desativadas com sucesso: ${desativacaoResult.count}`);
    }

    // Para compatibilidade com o código existente
    const deleteResult = desativacaoResult.data || [];

    // Retornar resultado
    return new Response(JSON.stringify({
      status,
      message,
      tokenRefreshed,
      integracoesAntigasDesativadas: desativacaoResult.count,
      integracao: {
        id: integracao.id,
        tipo: integracao['Tipo de integração'],
        ultimaAtualizacao: integracao['Ultima atualização'],
        ativo: integracao.ativo,
        expiraEm: tokenRefreshed ? newExpiresIn : integracao['expira em'],
        token: tokenRefreshed ? newToken : accessToken
      }
    }), {
      status: 200,
      headers: corsHeaders
    });
  } catch (error) {
    console.error('Error:', error.message);
    return new Response(JSON.stringify(formatError(error)), {
      status: 500,
      headers: corsHeaders
    });
  }
});
