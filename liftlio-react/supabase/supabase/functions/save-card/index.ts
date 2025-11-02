import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    const { paymentToken, isDev = true } = await req.json();
    // Get auth header and user ID
    const authHeader = req.headers.get('Authorization');
    const token = authHeader.replace('Bearer ', '');
    const payload = JSON.parse(atob(token.split('.')[1]));
    const userId = payload.sub;
    // Initialize Supabase
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
    // Square setup
    const squareToken = isDev ? Deno.env.get('SQUARE_ACCESS_TOKEN_SANDBOX') : Deno.env.get('SQUARE_ACCESS_TOKEN_PRODUCTION');
    const squareBaseUrl = isDev ? 'https://connect.squareupsandbox.com' : 'https://connect.squareup.com';
    // Check if customer exists
    let customer = await supabase.from('customers').select('*').eq('user_id', userId).maybeSingle();
    let squareCustomerId = customer.data?.square_customer_id;
    // Create Square customer if doesn't exist
    if (!squareCustomerId) {
      // Get user auth data
      const { data: { user } } = await supabase.auth.admin.getUserById(userId);
      const customerData = {
        idempotency_key: crypto.randomUUID(),
        given_name: user.user_metadata?.full_name?.split(' ')[0] || user.email.split('@')[0],
        email_address: user.email
      };
      const squareCustomerResponse = await fetch(`${squareBaseUrl}/v2/customers`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${squareToken}`,
          'Square-Version': '2024-06-04',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(customerData)
      });
      const squareCustomer = await squareCustomerResponse.json();
      if (!squareCustomerResponse.ok) {
        throw new Error(`Square customer error: ${JSON.stringify(squareCustomer.errors)}`);
      }
      squareCustomerId = squareCustomer.customer.id;
      // Save in Supabase
      const newCustomerData = await supabase.from('customers').insert({
        user_id: userId,
        email: user.email,
        name: user.user_metadata?.full_name || customerData.given_name,
        square_customer_id: squareCustomerId
      }).select().single();
      customer = newCustomerData;
    }
    // Create card in Square
    const cardResponse = await fetch(`${squareBaseUrl}/v2/cards`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${squareToken}`,
        'Square-Version': '2024-06-04',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        idempotency_key: crypto.randomUUID(),
        source_id: paymentToken,
        card: {
          customer_id: squareCustomerId
        }
      })
    });
    const cardData = await cardResponse.json();
    if (!cardResponse.ok) {
      throw new Error(`Square card error: ${JSON.stringify(cardData.errors)}`);
    }
    // Save card in Supabase
    const savedCard = await supabase.from('cards').insert({
      customer_id: customer.data.id,
      square_card_id: cardData.card.id,
      last_4: cardData.card.last_4,
      brand: cardData.card.card_brand,
      exp_month: cardData.card.exp_month,
      exp_year: cardData.card.exp_year,
      is_default: true,
      is_active: true
    }).select().single();
    return new Response(JSON.stringify({
      success: true,
      card: savedCard.data,
      square_card: cardData.card
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error:', error);
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