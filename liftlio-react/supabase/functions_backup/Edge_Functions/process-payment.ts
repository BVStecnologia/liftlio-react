import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
/**
 * EDGE FUNCTION: process-payment (VERSÃO FINAL)
 *
 * Processa pagamentos usando cartões salvos
 *
 * TESTE BÁSICO:
 * {
 *   "card_id": 4,
 *   "amount": 100,
 *   "items": [{"name": "Test Payment", "amount": 100}],
 *   "isDev": true
 * }
 *
 * TESTE COM ASSINATURA:
 * {
 *   "card_id": 4,
 *   "amount": 2999,
 *   "items": [{"name": "Premium Plan", "amount": 2999}],
 *   "subscription_id": 1,
 *   "isDev": true
 * }
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req)=>{
  console.log('=== INICIO DO PROCESSAMENTO ===');
  console.log('Method:', req.method);

  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }

  try {
    console.log('Headers:', Object.fromEntries(req.headers.entries()));

    const body = await req.json();
    console.log('Body recebido:', JSON.stringify(body));

    const { card_id, amount, items = [], subscription_id = null, idempotency_key = crypto.randomUUID(), isDev = true } = body;

    // Validate
    if (!card_id || !amount) {
      throw new Error('card_id and amount are required');
    }

    console.log('Validação OK - card_id:', card_id, 'amount:', amount);

    // Get auth info
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    const token = authHeader.replace('Bearer ', '');
    const parts = token.split('.');
    console.log('Token parts:', parts.length);

    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }

    const payload = JSON.parse(atob(parts[1]));
    console.log('Token payload:', payload);
    console.log('Role:', payload.role);
    console.log('Subject:', payload.sub);

    // Initialize Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    console.log('Supabase URL:', supabaseUrl);
    console.log('Service key exists:', !!supabaseKey);

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get card and customer
    console.log('Buscando cartão:', card_id);
    const { data: card, error: cardError } = await supabase
      .from('cards')
      .select('*, customer:customers(*)')
      .eq('id', card_id)
      .eq('is_active', true)
      .single();

    console.log('Card query result:', { card, cardError });

    if (cardError || !card) {
      throw new Error(`Card not found or inactive: ${cardError?.message || 'no card'}`);
    }

    console.log('Card found:', card.id, 'Customer:', card.customer.user_id);

    // Para service_role (cron), não verificar propriedade
    // Para usuários normais, verificar se o cartão pertence a eles
    if (payload.role !== 'service_role') {
      const userId = payload.sub;
      console.log('Verificando propriedade - userId:', userId, 'card owner:', card.customer.user_id);

      if (!userId) {
        throw new Error('User ID not found in token');
      }
      if (card.customer.user_id !== userId) {
        throw new Error('Unauthorized: Card does not belong to user');
      }
    } else {
      console.log('Service role detectado - pulando verificação de propriedade');
    }

    // Square setup
    const squareToken = isDev ? Deno.env.get('SQUARE_ACCESS_TOKEN_SANDBOX') : Deno.env.get('SQUARE_ACCESS_TOKEN_PRODUCTION');
    const squareBaseUrl = isDev ? 'https://connect.squareupsandbox.com' : 'https://connect.squareup.com';

    console.log('Square mode:', isDev ? 'SANDBOX' : 'PRODUCTION');
    console.log('Square token exists:', !!squareToken);

    // Create payment in Square
    const paymentRequest = {
      idempotency_key,
      source_id: card.square_card_id,
      customer_id: card.customer.square_customer_id,
      amount_money: {
        amount: amount,
        currency: 'USD'
      },
      autocomplete: true
    };

    console.log('Payment request:', JSON.stringify(paymentRequest));
    console.log('Creating Square payment...');

    const paymentResponse = await fetch(`${squareBaseUrl}/v2/payments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${squareToken}`,
        'Square-Version': '2024-06-04',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(paymentRequest)
    });

    const paymentData = await paymentResponse.json();
    console.log('Square response status:', paymentResponse.status);
    console.log('Square response:', JSON.stringify(paymentData));

    let savedPayment = null;
    if (paymentResponse.ok && paymentData.payment) {
      // Payment successful - save to database
      // IMPORTANTE: Converter status para minúsculo
      const paymentToInsert = {
        subscription_id,
        square_payment_id: paymentData.payment.id,
        amount: amount,
        items: items.length > 0 ? items : [],
        status: paymentData.payment.status.toLowerCase(),
        error_details: null
      };
      console.log('Inserting payment:', paymentToInsert);
      const { data, error } = await supabase.from('payments').insert(paymentToInsert).select().single();
      if (error) {
        console.error('Database error:', error);
        // Retornar sucesso do pagamento mesmo se falhar no banco
        savedPayment = {
          ...paymentToInsert,
          id: null,
          created_at: new Date().toISOString(),
          database_error: error.message
        };
      } else {
        savedPayment = data;
        console.log('Payment saved successfully:', data);
      }
      // Update subscription if applicable
      if (subscription_id && savedPayment && savedPayment.id) {
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        const { error: updateError } = await supabase.from('subscriptions').update({
          next_billing_date: nextMonth.toISOString().split('T')[0],
          updated_at: new Date().toISOString()
        }).eq('id', subscription_id);
        if (updateError) {
          console.error('Subscription update error:', updateError);
        }
      }
    } else {
      // Payment failed - still save the failure
      const errorDetails = paymentData.errors ? JSON.stringify(paymentData.errors) : 'Payment declined';
      const { data, error } = await supabase.from('payments').insert({
        subscription_id,
        square_payment_id: paymentData.payment?.id || null,
        amount: amount,
        items: items.length > 0 ? items : [],
        status: 'failed',
        error_details: errorDetails
      }).select().single();
      savedPayment = data || {
        status: 'failed',
        error_details: errorDetails
      };
      throw new Error(`Payment failed: ${errorDetails}`);
    }
    return new Response(JSON.stringify({
      success: true,
      payment: savedPayment,
      square_payment: paymentData.payment
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('=== ERRO CAPTURADO ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);

    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 400,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
