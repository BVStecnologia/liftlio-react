// Test script para Edge Functions locais
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Configurar Supabase local
const supabaseUrl = 'http://127.0.0.1:54321'
const supabaseKey = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH' // anon key do supabase local

const supabase = createClient(supabaseUrl, supabaseKey)

// Testar a função Canal_youtube_dados
console.log('🧪 Testando Edge Function: Canal_youtube_dados')
console.log('Canal: MrBeast (UCX6OQ3DkcsbYNE6H8uQQuVA)\n')

const { data, error } = await supabase.functions.invoke('Canal_youtube_dados', {
  body: {
    channelId: 'UCX6OQ3DkcsbYNE6H8uQQuVA' // MrBeast
  }
})

if (error) {
  console.error('❌ Erro:', error)
} else {
  console.log('✅ Sucesso!\n')
  console.log('📺 Nome do Canal:', data.title)
  console.log('👥 Inscritos:', parseInt(data.statistics.subscriberCount).toLocaleString())
  console.log('👀 Total Views:', parseInt(data.statistics.viewCount).toLocaleString())
  console.log('🎥 Total Vídeos:', data.statistics.videoCount)
  console.log('\n📄 Dados completos:', JSON.stringify(data, null, 2))
}
