// Configurações de CORS padrão para todas as funções
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Content-Type': 'application/json'
};

// Função para lidar com solicitações OPTIONS (preflight CORS)
export function handleCorsPreflightRequest() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
}

// Função para adicionar cabeçalhos CORS a uma resposta
export function addCorsHeaders(response) {
  const newHeaders = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders)){
    newHeaders.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders
  });
}