import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useProject } from '../context/ProjectContext';

// Type definition for mention data
export interface MentionData {
  id: number;
  video: {
    id: string;
    youtube_id: string;
    thumbnail: string;
    title: string;
    views: number;
    likes: number;
    channel?: string;
  };
  type: string;
  score: number;
  comment: {
    author: string;
    date: string;
    text: string;
    likes: number;
  };
  response: {
    text: string;
    date: string | null;
    status: string; // 'posted' | 'scheduled' | 'draft' | 'new'
  };
  favorite: boolean;
  msg_respondido: boolean;
}

// Statistics about mentions
export interface MentionStats {
  totalMentions: number;
  respondedMentions: number;
  pendingResponses: number;
  responseRate: number;
  trends: {
    totalMentionsTrend: number;
    respondedMentionsTrend: number;
    pendingResponsesTrend: number;
    responseRateTrend: number;
  };
}

// Performance data for charts
export interface MentionPerformance {
  day: string;
  mentions: number;
  responses: number;
  led: number;
  brand: number;
}

export type TimeframeType = 'day' | 'week' | 'month' | 'year';
export type TabType = 'all' | 'scheduled' | 'posted' | 'favorites';

export const useMentionsData = (activeTab: TabType = 'all') => {
  // Obter o projeto atual do contexto global
  const { currentProject } = useProject();
  const projectId = currentProject?.id;  // Extraindo o ID do projeto para fácil referência
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // States for data
  const [mentionsData, setMentionsData] = useState<MentionData[]>([]);
  const [mentionStats, setMentionStats] = useState<MentionStats>({
    totalMentions: 0,
    respondedMentions: 0,
    pendingResponses: 0,
    responseRate: 0,
    trends: {
      totalMentionsTrend: 0,
      respondedMentionsTrend: 0,
      pendingResponsesTrend: 0,
      responseRateTrend: 0
    }
  });
  const [performanceData, setPerformanceData] = useState<MentionPerformance[]>([]);
  const [currentTimeframe, setCurrentTimeframe] = useState<TimeframeType>('week');
  
  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 5; // Limit of 5 items per page
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  
  // Helper function to process data in the interface format
  const processMentionsData = (data: any[]): MentionData[] => {
    return data.map((item: any) => ({
      id: item.comment_id,
      video: {
        id: item.video_id,
        youtube_id: item.video_youtube_id || '',
        thumbnail: item.video_youtube_id ? 
          `https://i.ytimg.com/vi/${item.video_youtube_id}/hqdefault.jpg` : 
          '',
        title: item.video_title || 'No title',
        views: parseInt(item.video_views) || 0,
        likes: parseInt(item.video_likes) || 0,
        channel: item.video_channel || 'Unknown channel'
      },
      type: item.msg_type === 1 ? 'LED' : item.msg_type === 2 ? 'BRAND' : 'Outro',
      score: parseFloat(item.comment_lead_score || '0'),
      comment: {
        author: item.comment_author || 'Anonymous',
        date: item.comment_published_at_formatted || '',
        text: item.comment_text || '',
        likes: parseInt(item.comment_likes) || 0
      },
      response: {
        text: item.msg_text || '',
        date: item.msg_created_at_formatted || null,
        status: item.mention_status || 'new'
      },
      favorite: item.is_favorite || item.msg_template || item.template || false,
      msg_respondido: item.msg_respondido || false
    }));
  };
  
  // Helper function to calculate statistics
  const calculateStats = (data: any[]) => {
    // Se estamos na aba 'all', usamos todos os dados
    let dataToUse = data;
    
    // Se estamos em outra aba mas queremos estatísticas de todos os dados do projeto atual
    if (activeTab !== 'all') {
      // Por enquanto, vamos usar os dados disponíveis
      console.log('Calculando estatísticas baseadas nos dados disponíveis');
    }
    
    const totalMentions = dataToUse.length;
    const respondedMentions = dataToUse.filter((item: any) => 
      item.msg_created_at_formatted !== null).length;
    const pendingResponses = dataToUse.filter((item: any) => 
      item.msg_created_at_formatted === null).length;
    
    console.log(`Statistics: Total: ${totalMentions}, Responded: ${respondedMentions}, Pending: ${pendingResponses}`);
    const responseRate = totalMentions > 0 ? 
      (respondedMentions / totalMentions) * 100 : 0;
    
    // Trends (simulated for now)
    setMentionStats({
      totalMentions,
      respondedMentions,
      pendingResponses,
      responseRate,
      trends: {
        totalMentionsTrend: 5,
        respondedMentionsTrend: 12,
        pendingResponsesTrend: -3,
        responseRateTrend: 8
      }
    });
  };
  
  // Function to fetch and process data
  const fetchMentionsData = async () => {
    if (!projectId) {
      console.log('Não foi possível buscar dados: ID do projeto não disponível');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log(`Buscando dados para aba: ${activeTab}, projeto ID: ${projectId}`);
        
        // Base query on the mentions_overview view
        let query = supabase
          .from('mentions_overview')
          .select('*') // Select all fields
          .eq('scanner_project_id', projectId)
          .order('comment_published_at', { ascending: false }) // Order by most recent
          .range((currentPage - 1) * itemsPerPage, (currentPage * itemsPerPage) - 1); // Apply pagination
        
        // Apply specific filters for different tabs
        if (activeTab === 'scheduled') {
          console.log('Applying filter for scheduled mentions (msg_text not empty and msg_respondido = FALSE)');
          query = query
            .not('msg_text', 'is', null)    // Filter for non-empty msg_text
            .eq('msg_respondido', false);   // And msg_respondido = FALSE
        } else if (activeTab === 'posted') {
          console.log('Applying filter for posted mentions (published_date not empty)');
          query = query.not('msg_created_at_formatted', 'is', null); // Filter for non-empty published_date
        } else if (activeTab === 'favorites' as TabType) {
          console.log('Applying filter for favorite mentions (msg_template=TRUE)');
          
          // Updated to filter only by msg_template=TRUE
          console.log('Finding msg_template=TRUE');
          
          const favResults = await Promise.all([
            supabase
              .from('mentions_overview')
              .select('*')
              .eq('scanner_project_id', projectId)
              .eq('msg_template', true)
              .order('comment_published_at', { ascending: false })
          ]);
          
          // Usar os resultados diretamente
          let favData: any[] = [];
          if (favResults[0].data) favData = [...favResults[0].data];
          
          // Calcular o total de páginas
          const totalFavorites = favData.length;
          const totalPages = Math.ceil(totalFavorites / itemsPerPage);
          
          // Atualizar o total de itens
          setTotalItems(totalFavorites);
          
          console.log(`Found ${favData.length} total favorites (${favResults[0].data?.length || 0} with msg_template=TRUE) - Page ${currentPage} of ${totalPages}`);
          
          // Processar os dados diretamente
          if (favData.length === 0) {
            setMentionsData([]);
            setMentionStats({
              totalMentions: 0,
              respondedMentions: 0,
              pendingResponses: 0,
              responseRate: 0,
              trends: {
                totalMentionsTrend: 0,
                respondedMentionsTrend: 0,
                pendingResponsesTrend: 0,
                responseRateTrend: 0
              }
            });
            setPerformanceData([]);
            setLoading(false);
            return; // Sair da função para evitar processamento adicional
          }
          
          // Ordenar dados combinados por data mais recente
          favData.sort((a, b) => {
            const dateA = new Date(a.comment_published_at || 0).getTime();
            const dateB = new Date(b.comment_published_at || 0).getTime();
            return dateB - dateA; // Ordenação decrescente
          });
          
          // Aplicar paginação manualmente aos dados combinados
          const paginatedFavData = favData.slice(
            (currentPage - 1) * itemsPerPage,
            currentPage * itemsPerPage
          );
          
          console.log(`Paginação: mostrando ${paginatedFavData.length} de ${favData.length} favoritos (página ${currentPage})`);
          
          // Continuar processamento normal com os dados paginados
          const processedMentions: MentionData[] = processMentionsData(paginatedFavData);
          setMentionsData(processedMentions);
          calculateStats(favData); // Maintain statistics about all data
          
          // Exit the function to avoid additional processing
          setLoading(false);
          return;
          
          // The lines below are never executed because we return above
          query = query.eq('is_favorite', true);
        }
        
        // Execute the main query
        const { data, error } = await query;
        
        // Execute a separate query to get the total count
        // Instead of counting, let's fetch all IDs and count them manually
        let countQuery = supabase
          .from('mentions_overview')
          .select('comment_id')
          .eq('scanner_project_id', currentProject.id);
          
        // Apply the same filters in the count query
        if (activeTab === 'scheduled') {
          countQuery = countQuery
            .not('msg_text', 'is', null)    // Filter for non-empty msg_text
            .eq('msg_respondido', false);   // And msg_respondido = FALSE
        } else if (activeTab === 'posted') {
          countQuery = countQuery.not('msg_created_at_formatted', 'is', null);
        }
        
        // Se quisermos buscar somente as menções deste projeto específico, podemos adicionar isso aqui
        // countQuery = countQuery.eq('scanner_project_id', currentProject.id);
        
        const { data: countData } = await countQuery;
        
        // Count manually
        const count = countData?.length || 0;
        
        // Update total items
        setTotalItems(count);
        
        console.log(`Results found: ${data?.length || 0} of ${count} total (page ${currentPage} of ${Math.ceil(count / itemsPerPage)})`);
        if (data?.length === 0) {
          console.log('No results found with applied filters');
        } else if (activeTab === 'favorites' as TabType) {
          // Detailed log for debugging favorites
          console.log('Favorites found:');
          data.forEach((item: any, index: number) => {
            console.log(`Item ${index}: is_favorite=${item.is_favorite}, msg_template=${item.msg_template}, msg_respondido=${item.msg_respondido}`);
          });
        }
        
        if (error) throw error;
        
        if (!data || data.length === 0) {
          setMentionsData([]);
          setMentionStats({
            totalMentions: 0,
            respondedMentions: 0,
            pendingResponses: 0,
            responseRate: 0,
            trends: {
              totalMentionsTrend: 0,
              respondedMentionsTrend: 0,
              pendingResponsesTrend: 0,
              responseRateTrend: 0
            }
          });
          setPerformanceData([]);
          setLoading(false);
          return;
        }
        
        // Process data using the helper function
        const processedMentions: MentionData[] = processMentionsData(data);
        setMentionsData(processedMentions);
        
        // Calculate statistics
        calculateStats(data);
        
        // Performance data for the chart (grouped by day)
        // This would be a good case for a separate view in the database,
        // but we can calculate it here for now
        const performanceMap = new Map<string, { mentions: number, responses: number, led: number, brand: number }>();
        
        // Define an interval according to the timeframe
        const startDate = new Date();
        if (currentTimeframe === 'week') {
          startDate.setDate(startDate.getDate() - 7);
        } else if (currentTimeframe === 'month') {
          startDate.setMonth(startDate.getMonth() - 1);
        } else if (currentTimeframe === 'year') {
          startDate.setFullYear(startDate.getFullYear() - 1);
        } else {
          startDate.setDate(startDate.getDate() - 1);
        }
        
        // Create dates for the interval
        const dates: string[] = [];
        const currentDate = new Date();
        let tempDate = new Date(startDate);
        
        while (tempDate <= currentDate) {
          const formattedDate = tempDate.toLocaleDateString('default', {
            month: 'short',
            day: 'numeric'
          });
          dates.push(formattedDate);
          performanceMap.set(formattedDate, { mentions: 0, responses: 0, led: 0, brand: 0 });
          
          tempDate.setDate(tempDate.getDate() + 1);
        }
        
        // Fill in real data
        data.forEach((item: any) => {
          // Processar todos os itens, independentemente do status
          // A data pode ser a data de publicação ou data atual se não estiver publicado
          const commentDate = item.comment_published_at ? new Date(item.comment_published_at) : new Date();
          if (commentDate >= startDate) {
            const formattedDate = commentDate.toLocaleDateString('default', {
              month: 'short',
              day: 'numeric'
            });
            
            const existing = performanceMap.get(formattedDate) || { mentions: 0, responses: 0, led: 0, brand: 0 };
            existing.mentions += 1;
            
            // If it was responded to (has a publication date)
            if (item.msg_created_at_formatted !== null) {
              existing.responses += 1;
            }
            
            // Classificar como LED (msg_type = 1) ou Brand (msg_type = 2)
            console.log(`Classificando item: msg_type=${item.msg_type}, author=${item.comment_author}`);
            
            if (item.msg_type === 1) {
              existing.led += 1;
              console.log('Classificado como LED');
            } else if (item.msg_type === 2) {
              existing.brand += 1;
              console.log('Classificado como Brand');
            } else {
              console.log('ALERTA: Item não classificado em nenhuma categoria!');
            }
            
            performanceMap.set(formattedDate, existing);
          }
        });
        
        // Convert to array for the chart
        const performance: MentionPerformance[] = dates.map(day => ({
          day,
          mentions: performanceMap.get(day)?.mentions || 0,
          responses: performanceMap.get(day)?.responses || 0,
          led: performanceMap.get(day)?.led || 0,
          brand: performanceMap.get(day)?.brand || 0
        }));
        
        setPerformanceData(performance);
        
      } catch (err: any) {
        console.error('Error fetching mentions data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
  // Fetch and process data based on timeframe and tab
  useEffect(() => {
    if (!projectId) {
      console.log('Não foi possível configurar assinatura em tempo real: ID do projeto não disponível');
      return;
    }
    
    fetchMentionsData();
    
    // Configure listener for real-time updates
    const subscription = supabase
      .channel('mentions-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'Comentarios_Principais',
        filter: `video_id=in.(select id from "Videos" where scanner_id in (select id from "Scanner de videos do youtube" where "Projeto_id"=${projectId}))`
      }, () => {
        fetchMentionsData();
      })
      .subscribe();
    
    return () => {
      subscription.unsubscribe();
    };
  }, [projectId, currentTimeframe, activeTab, currentPage]);
  
  // Função para atualizar o timeframe
  const setTimeframe = (timeframe: TimeframeType) => {
    setCurrentTimeframe(timeframe);
  };
  
  // Funções para navegação de páginas
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  };
  
  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };
  
  const goToPage = (page: number) => {
    const targetPage = Math.min(Math.max(1, page), totalPages);
    setCurrentPage(targetPage);
  };
  
  // Função auxiliar para testar a tabela Mensagens
  const testarTabelaMensagens = async () => {
    console.log("Testando acesso à tabela Mensagens no Supabase...");
    
    try {
      const { data, error } = await supabase
        .from('Mensagens')
        .select('id, template')
        .limit(1);
        
      console.log("Teste acesso tabela Mensagens:", { 
        sucesso: !error, 
        erro: error ? error.message : null,
        dados: data,
        colunas: data && data.length > 0 ? Object.keys(data[0]) : []
      });
      
      return !error;
    } catch (err) {
      console.error("Erro crítico ao acessar tabela Mensagens:", err);
      return false;
    }
  };
  
  // Função para testes diretos no banco
  const testeDiretoMensagens = async () => {
    console.log("==== TESTE DIRETO NAS MENSAGENS ====");
    
    // 1. Buscar uma mensagem existente
    try {
      const { data: msgData, error: msgError } = await supabase
        .from('Mensagens')
        .select('*')
        .limit(1);
        
      console.log("Mensagem para teste:", {
        sucesso: !msgError,
        erro: msgError ? msgError.message : null,
        dados: msgData,
        colunas: msgData && msgData.length > 0 ? Object.keys(msgData[0]) : []
      });
      
      // Se encontrou uma mensagem, tentar atualizar o campo template
      if (msgData && msgData.length > 0) {
        const idTeste = msgData[0].id;
        const templateAtual = msgData[0].template || false;
        
        console.log(`Tentativa de update direto: id=${idTeste}, template atual=${templateAtual}, novo valor=${!templateAtual}`);
        
        // Tentar atualizar
        const { data: updateTeste, error: updateTesteError } = await supabase
          .from('Mensagens')
          .update({ template: !templateAtual })
          .eq('id', idTeste)
          .select();
          
        console.log("Resultado update teste:", {
          sucesso: !updateTesteError,
          erro: updateTesteError ? updateTesteError.message : null,
          dados: updateTeste
        });
        
        // Verificar se a atualização funcionou
        const { data: checkTeste } = await supabase
          .from('Mensagens')
          .select('id, template')
          .eq('id', idTeste)
          .single();
          
        console.log("Verificação pós-update teste:", {
          dados: checkTeste,
          template_atual: checkTeste ? checkTeste.template : null,
          alterou: checkTeste ? checkTeste.template !== templateAtual : false
        });
      }
    } catch (err) {
      console.error("Erro no teste direto:", err);
    }
    
    console.log("==== FIM DO TESTE DIRETO ====");
  };

  // Função para alternar favorito
  const toggleFavorite = async (mentionId: number) => {
    // Executar testes para diagnosticar o problema
    console.log("=== DIAGNÓSTICO DO BOTÃO FAVORITO ===");
    console.log(`Botão clicado para mentionId=${mentionId}`);
    
    // Executar teste direto
    await testeDiretoMensagens();
    if (!currentProject) return;
    
    try {
      // Encontrar menção nos dados atuais
      const mention = mentionsData.find(m => m.id === mentionId);
      if (!mention) return;
      
      const newFavoriteState = !mention.favorite;
      
      console.log(`Alternando favorito: ID=${mentionId}, Novo estado=${newFavoriteState}`);
      
      // Atualizar localmente para feedback imediato (otimista)
      setMentionsData(prev => 
        prev.map(item => 
          item.id === mentionId 
            ? { ...item, favorite: newFavoriteState } 
            : item
        )
      );
      
      try {
        // Buscar o comentário para obter os dados necessários
        console.log(`Buscando comentário com comment_id=${mentionId}`);
        const { data: comentario, error: fetchError } = await supabase
          .from('mentions_overview')
          .select('id, comment_id, msg_id, msg_template, template, is_favorite')
          .eq('comment_id', mentionId)
          .single();
          
        if (fetchError) {
          console.error('Erro ao buscar comentário:', fetchError);
          throw fetchError;
        }
        
        if (!comentario) {
          console.error(`Comentário com ID ${mentionId} não encontrado`);
          throw new Error(`Comentário não encontrado`);
        }
        
        console.log("DEBUG: Dados encontrados", JSON.stringify(comentario));
        
        // Verificar se temos um msg_id (ID da mensagem)
        if (comentario.msg_id) {
          console.log(`Atualizando diretamente a mensagem com ID=${comentario.msg_id}, template=${newFavoriteState}`);
          
          // Depurar parâmetros
          console.log('DEBUG - Parâmetros para update:', {
            tabela: 'mensagens',
            id: comentario.msg_id,
            novoValor: { template: newFavoriteState },
            tipoId: typeof comentario.msg_id
          });
          
          // Verificar antes o valor atual
          console.log('Verificando valor atual do template antes da atualização...');
          try {
            const { data: beforeCheck, error: beforeError } = await supabase
              .from('Mensagens')
              .select('id, template')
              .eq('id', comentario.msg_id)
              .single();
              
            if (beforeError) {
              console.log(`Erro ao verificar valor atual: ${beforeError.message}`);
            } else {
              console.log(`Valor do template antes: ${beforeCheck ? beforeCheck.template : 'valor não encontrado'}`);
            }
          } catch (e) {
            console.error('Erro ao verificar valor antes da atualização:', e);
          }
          
          // Tentar atualizar a tabela Mensagens conforme a documentação do Supabase
          console.log(`REQUISIÇÃO SUPABASE: Atualizando tabela Mensagens com { template: ${newFavoriteState} } onde id=${comentario.msg_id}`);
          
          // TESTE ADICIONAL: Converter ID para número, caso seja string
          const msgIdNumber = typeof comentario.msg_id === 'string' ? parseInt(comentario.msg_id, 10) : comentario.msg_id;
          
          console.log(`Tentando atualizações com diferentes formatos do ID:
            - Formato original: ${comentario.msg_id} (tipo: ${typeof comentario.msg_id})
            - Formato numérico: ${msgIdNumber} (tipo: ${typeof msgIdNumber})
          `);
          
          // Usar formato correto da documentação do Supabase
          console.log("Tentativa 1: Usando ID no formato original");
          const { data: updateData, error: updateError } = await supabase
            .from('Mensagens')
            .update({ template: newFavoriteState })
            .eq('id', comentario.msg_id)
            .select();
            
          // Se falhou, tentar com o formato numérico
          if (updateError && typeof comentario.msg_id !== 'number') {
            console.log("Tentativa 2: Usando ID numérico");
            const { data: updateData2, error: updateError2 } = await supabase
              .from('Mensagens')
              .update({ template: newFavoriteState })
              .eq('id', msgIdNumber)
              .select();
              
            console.log("Resultado tentativa 2:", {
              sucesso: !updateError2,
              erro: updateError2 ? updateError2.message : null,
              dados: updateData2
            });
            
            // Se a segunda tentativa foi bem-sucedida, use os resultados dela
            if (!updateError2) {
              // Usar resultados da segunda tentativa
              console.log("Usando resultados da tentativa 2 (ID numérico)");
            }
          }
            
          console.log('Resposta da atualização:', { 
            data: updateData, 
            error: updateError ? updateError.message : null 
          });
            
          console.log('Resposta bruta do Supabase:', { data: updateData, error: updateError });
            
          if (updateError) {
            console.error('Erro ao atualizar template na tabela mensagens:', updateError);
            
            // Tentativa final com instrução SQL direta
            console.log("Tentativa final: Usando uma abordagem alternativa");
            try {
              // Tentativa direta com update manual em SQL
              console.log(`Verificando novamente se a mensagem com ID ${comentario.msg_id} existe...`);
              
              const { data: checkAgain, error: checkAgainError } = await supabase
                .from('Mensagens')
                .select('*')
                .eq('id', comentario.msg_id)
                .single();
                
              console.log("Verificação final:", {
                sucesso: !checkAgainError,
                erro: checkAgainError ? checkAgainError.message : null,
                dados: checkAgain
              });
                
              if (!checkAgainError && checkAgain) {
                console.log("Mensagem existe, mas não conseguimos atualizá-la.");
              } else {
                console.log("Parece que a mensagem com esse ID não existe.");
              }
              
              throw updateError; // Usar o erro original
            } catch (finalErr) {
              console.error("Erro na tentativa final:", finalErr);
              throw updateError; // Usar o erro original
            }
          }
          
          // Log detalhado da resposta
          console.log(`Mensagem atualizada com sucesso: ID=${comentario.msg_id}, template=${newFavoriteState}`);
          console.log('Resposta do Supabase:', JSON.stringify(updateData));
          
          // Verificar se o valor foi realmente atualizado no banco
          console.log("Verificando se a atualização foi efetivada no banco de dados...");
          try {
            const { data: checkData, error: checkError } = await supabase
              .from('Mensagens')
              .select('id, template')
              .eq('id', comentario.msg_id)
              .single();
              
            console.log("Verificação pós-update:", {
              sucesso: !checkError,
              erro: checkError ? checkError.message : null,
              dados: checkData,
              template_atual: checkData ? checkData.template : null
            });
          } catch (checkErr) {
            console.error("Erro ao verificar atualização:", checkErr);
          }
        } else {
          console.error(`Não foi encontrado msg_id para este comentário (comment_id=${mentionId}). Não é possível atualizar.`);
          throw new Error(`Mensagem não encontrada para o comentário ${mentionId}`);
        }
        
        // Recarregar dados para garantir consistência da UI
        console.log('Recarregando dados...');
        await fetchMentionsData();
        
      } catch (innerErr) {
        console.error('Erro durante atualização:', innerErr);
        
        // Verificar se ainda não temos um msg_id, tentar criar uma mensagem vazia
        if (typeof innerErr === 'object' && innerErr !== null && 
            'message' in innerErr && 
            typeof (innerErr as Error).message === 'string' &&
            (innerErr as Error).message.includes('não encontrado')) {
          console.log('Tentando criar uma nova mensagem para este comentário...');
          // Implementar lógica para criar mensagem se necessário
        }
        
        throw innerErr;
      }
    } catch (err) {
      console.error('Erro ao alternar favorito:', err);
      // Reverter atualização local em caso de erro
      setMentionsData(prev => 
        prev.map(item => 
          item.id === mentionId 
            ? { ...item, favorite: !item.favorite } // Reverter para estado anterior
            : item
        )
      );
    }
  };
  
  return {
    loading,
    error,
    mentionsData,
    mentionStats,
    performanceData,
    timeframe: currentTimeframe,
    setTimeframe,
    toggleFavorite,
    // Adicionar informações e funções de paginação
    pagination: {
      currentPage,
      totalPages,
      totalItems,
      itemsPerPage,
      goToNextPage,
      goToPrevPage,
      goToPage
    }
  };
};