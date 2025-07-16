// Script para debug do RAG v17
// Testar diretamente a geração de embedding e busca

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const SUPABASE_URL = 'https://suqjifkhmekcdflwowiw.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY_HERE';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testRAGSearch() {
  console.log('=== TESTE RAG v17 ===');
  
  // 1. Testar geração de embedding
  const testPrompts = [
    "como estão as menções postadas hoje?",
    "menções hoje",
    "postagens 13/07/2025",
    "POSTAGEM REALIZADA"
  ];
  
  for (const prompt of testPrompts) {
    console.log(`\nTestando prompt: "${prompt}"`);
    
    try {
      // Gerar embedding
      const { data: embeddingData, error: embeddingError } = await supabase.functions.invoke('generate-embedding', {
        body: { text: prompt }
      });
      
      if (embeddingError) {
        console.error('Erro ao gerar embedding:', embeddingError);
        continue;
      }
      
      console.log('Embedding gerado com sucesso');
      
      // Buscar com diferentes thresholds
      const thresholds = [0.7, 0.5, 0.3, 0.1];
      
      for (const threshold of thresholds) {
        const { data: results, error: searchError } = await supabase.rpc('search_project_rag', {
          query_embedding: embeddingData.embedding,
          project_filter: 58,
          similarity_threshold: threshold,
          match_count: 5
        });
        
        if (searchError) {
          console.error(`Erro na busca com threshold ${threshold}:`, searchError);
          continue;
        }
        
        console.log(`Threshold ${threshold}: ${results?.length || 0} resultados`);
        if (results && results.length > 0) {
          console.log('Top resultado:', {
            source: results[0].source_table,
            similarity: results[0].similarity,
            preview: results[0].content.substring(0, 100)
          });
          break; // Parar se encontrou resultados
        }
      }
    } catch (error) {
      console.error('Erro:', error);
    }
  }
}

// Para executar:
// Deno.serve(async () => {
//   await testRAGSearch();
//   return new Response('Test completed');
// });