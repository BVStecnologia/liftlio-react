// @ts-nocheck
/**
 * Edge Function: process-rag-batch
 *
 * Descrição:
 * Processa registros em lote para gerar embeddings e atualizar o sistema RAG.
 * Processa 50 registros por vez para evitar timeout.
 *
 * @author Valdair & Claude
 * @date 11/01/2025
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Configurações
const BATCH_SIZE = 50;
const MAX_EXECUTION_TIME = 2 * 60 * 1000; // 2 minutos
const BATCH_DELAY = 100; // 100ms entre batches

// Tabelas em ordem de prioridade
const TABLES_CONFIG = [
  {
    name: 'Mensagens',
    projectIdField: 'project_id',
    prepareFunction: 'prepare_rag_content_mensagens',
    needsJoin: false
  },
  {
    name: 'Comentarios_Principais',
    projectIdField: 'project_id',
    prepareFunction: 'prepare_rag_content_comentarios_principais',
    needsJoin: false
  },
  {
    name: 'Videos',
    prepareFunction: 'prepare_rag_content_videos',
    needsJoin: true,
    joinQuery: `
      SELECT v.id, s."Projeto_id" as project_id
      FROM "Videos" v
      JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
      WHERE v.rag_processed = false AND s."Projeto_id" IS NOT NULL
    `
  },
  {
    name: 'Respostas_Comentarios',
    prepareFunction: 'prepare_rag_content_respostas_comentarios',
    needsJoin: true,
    joinQuery: `
      SELECT r.id, c.project_id
      FROM "Respostas_Comentarios" r
      JOIN "Comentarios_Principais" c ON r.parent_comment_id = c.id_do_comentario
      WHERE r.rag_processed = false AND c.project_id IS NOT NULL
    `
  },
  {
    name: 'Videos_trancricao',
    prepareFunction: 'prepare_rag_content_videos_trancricao',
    needsJoin: true,
    joinQuery: `
      SELECT t.id, s."Projeto_id" as project_id
      FROM "Videos_trancricao" t
      JOIN "Videos" v ON v."VIDEO" = t.video_id
      JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
      WHERE t.rag_processed = false AND s."Projeto_id" IS NOT NULL
    `
  },
  {
    name: 'Scanner de videos do youtube',
    projectIdField: 'Projeto_id',
    prepareFunction: 'prepare_rag_content_scanner',
    needsJoin: false
  },
  {
    name: 'Canais do youtube',
    projectIdField: 'Projeto',
    prepareFunction: 'prepare_rag_content_canais',
    needsJoin: false
  },
  {
    name: 'Notificacoes',
    projectIdField: 'projeto_id',
    prepareFunction: 'prepare_rag_content_notificacoes',
    needsJoin: false
  },
  {
    name: 'Integrações',
    projectIdField: 'PROJETO id',
    prepareFunction: 'prepare_rag_content_integracoes',
    needsJoin: false
  },
  {
    name: 'Projeto',
    projectIdField: 'id',
    prepareFunction: 'prepare_rag_content_projeto',
    needsJoin: false
  }
];

/**
 * Processa um batch de registros
 */
async function processBatch(tableConfig: any, records: any[]) {
  const results = {
    success: 0,
    failed: 0,
    errors: [] as any[]
  };

  for (const record of records) {
    try {
      // 1. Preparar conteúdo
      const { data: content, error: prepareError } = await supabase
        .rpc(tableConfig.prepareFunction, { p_id: record.id });

      if (prepareError || !content) {
        throw new Error(`Erro ao preparar conteúdo: ${prepareError?.message}`);
      }

      // 2. Gerar embedding
      const { data: embeddingData, error: embeddingError } = await supabase.functions
        .invoke('generate-embedding', {
          body: { text: content }
        });

      if (embeddingError || !embeddingData?.embedding) {
        throw new Error(`Erro ao gerar embedding: ${embeddingError?.message}`);
      }

      // 3. Preparar metadata
      const metadata = {
        table_name: tableConfig.name,
        record_id: record.id,
        project_id: record.project_id,
        created_at: new Date().toISOString(),
        content_preview: content.substring(0, 200)
      };

      // 4. Inserir no rag_embeddings
      const { error: insertError } = await supabase
        .from('rag_embeddings')
        .upsert({
          source_table: tableConfig.name,
          source_id: record.id.toString(),
          project_id: parseInt(record.project_id),
          content,
          embedding: embeddingData.embedding,
          metadata
        }, {
          onConflict: 'source_table,source_id,project_id'
        });

      if (insertError) {
        throw new Error(`Erro ao inserir embedding: ${insertError.message}`);
      }

      // 5. Marcar como processado
      const { error: updateError } = await supabase
        .from(tableConfig.name)
        .update({
          rag_processed: true,
          rag_processed_at: new Date().toISOString()
        })
        .eq('id', record.id);

      if (updateError) {
        throw new Error(`Erro ao atualizar flag: ${updateError.message}`);
      }

      results.success++;
    } catch (error) {
      results.failed++;
      results.errors.push({
        recordId: record.id,
        error: error.message
      });
    }
  }

  return results;
}

/**
 * Busca registros não processados
 */
async function getUnprocessedRecords(tableConfig: any, limit: number) {
  if (tableConfig.needsJoin) {
    const { data, error } = await supabase
      .rpc('execute_raw_sql', {
        query: tableConfig.joinQuery + ` LIMIT ${limit}`
      });

    return { data, error };
  } else {
    const { data, error } = await supabase
      .from(tableConfig.name)
      .select(`id, ${tableConfig.projectIdField} as project_id`)
      .eq('rag_processed', false)
      .not(tableConfig.projectIdField, 'is', null)
      .limit(limit);

    return { data, error };
  }
}

Deno.serve(async (req) => {
  const startTime = Date.now();
  const results = {
    tablesProcessed: [] as any[],
    totalSuccess: 0,
    totalFailed: 0,
    executionTime: 0
  };

  try {
    console.log('Iniciando processamento RAG em batch...');

    for (const tableConfig of TABLES_CONFIG) {
      if (Date.now() - startTime > MAX_EXECUTION_TIME) {
        console.log('Tempo máximo de execução atingido');
        break;
      }

      console.log(`Processando tabela: ${tableConfig.name}`);

      const tableResults = {
        table: tableConfig.name,
        batches: 0,
        success: 0,
        failed: 0,
        errors: [] as any[]
      };

      while (Date.now() - startTime < MAX_EXECUTION_TIME) {
        const { data: records, error } = await getUnprocessedRecords(tableConfig, BATCH_SIZE);

        if (error) {
          console.error(`Erro ao buscar registros de ${tableConfig.name}:`, error);
          tableResults.errors.push({ batch: tableResults.batches, error: error.message });
          break;
        }

        if (!records || records.length === 0) {
          console.log(`Nenhum registro pendente em ${tableConfig.name}`);
          break;
        }

        console.log(`Processando batch ${tableResults.batches + 1} com ${records.length} registros`);

        const batchResults = await processBatch(tableConfig, records);

        tableResults.batches++;
        tableResults.success += batchResults.success;
        tableResults.failed += batchResults.failed;
        tableResults.errors.push(...batchResults.errors);

        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));

        if (records.length < BATCH_SIZE) {
          break;
        }
      }

      results.tablesProcessed.push(tableResults);
      results.totalSuccess += tableResults.success;
      results.totalFailed += tableResults.failed;

      if (tableResults.success === 0 && tableResults.failed === 0) {
        console.log(`Tabela ${tableConfig.name} completamente processada`);
      }
    }

    results.executionTime = Date.now() - startTime;

    console.log('Processamento concluído:', results);

    return new Response(
      JSON.stringify({
        success: true,
        results
      }),
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Erro geral:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        results
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
});
