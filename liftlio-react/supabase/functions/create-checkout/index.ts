import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
/**
 * EDGE FUNCTION: create-checkout v2
 *
 * Fluxo completo de checkout com preços corretos
 * {
  "paymentToken": "cnon:card-nonce-ok",
  "planId": "Plan-2",
  "isDev": true
}
 * PLANOS:
 * - Plan-1: Starter - $49/month
 * - Plan-2: Growth - $99/month (Most Popular)
 * - Plan-3: Scale - $199/month
 *
 * REQUEST:
 * {
 *   "paymentToken": "cnon:card-nonce-ok",
 *   "planId": "Plan-1",  // Plan-1, Plan-2, ou Plan-3
 *   "extraItems": [],    // Opcional
 *   "isDev": true
 * }
 *
 * RESPONSE SUCCESS:
 * {
 *   "success": true,
 *   "card": {...},
 *   "subscription": {...},
 *   "payment": {...},
 *   "summary": {
 *     "plan": "Starter",
 *     "amount": "$49.00",
 *     "nextBilling": "2025-07-26"
 *   }
 * }
 */ const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
// Configuração dos planos com preços corretos
const PLAN_CONFIGS = {
  'Plan-1': {
    name: 'Starter',
    displayName: 'Starter - Perfect to get started',
    amount: 4900,
    features: [
      '75 brand mentions monthly',
      'in high-engagement discussions',
      '10 Liftlio AI questions per month',
      'Trending topics monitoring'
    ]
  },
  'Plan-2': {
    name: 'Growth',
    displayName: 'Growth - Most popular',
    amount: 9900,
    mostPopular: true,
    features: [
      '200 brand mentions per month',
      'with advanced targeting',
      'Detailed analytics',
      'Approval workflows',
      '30 Liftlio AI questions per month',
      'Trending topics monitoring'
    ]
  },
  'Plan-3': {
    name: 'Scale',
    displayName: 'Scale - For large teams',
    amount: 19900,
    features: [
      '450 brand mentions per month',
      'with full customization',
      '100 Liftlio AI questions per month',
      'Trending topics monitoring'
    ]
  }
};
serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  let currentStep = 'initialization';
  try {
    const { paymentToken, planId, extraItems = [], isDev = true } = await req.json();
    console.log('Checkout request:', {
      planId,
      isDev
    });
    // Validações
    if (!paymentToken || !planId) {
      throw new Error('paymentToken and planId are required');
    }
    // Validar planId contra secret
    const planSecret = Deno.env.get(planId);
    if (!planSecret) {
      throw new Error('Invalid plan selected');
    }
    const planConfig = PLAN_CONFIGS[planId];
    if (!planConfig) {
      throw new Error('Plan configuration not found');
    }
    console.log(`Processing ${planConfig.name} plan for $${(planConfig.amount / 100).toFixed(2)}`);
    // Get auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization required');
    }
    // Initialize Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    // STEP 1: Salvar cartão
    currentStep = 'save-card';
    console.log('Step 1: Saving card...');
    const cardResponse = await fetch(`${supabaseUrl}/functions/v1/save-card`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        paymentToken,
        isDev
      })
    });
    const cardResult = await cardResponse.json();
    if (!cardResponse.ok || !cardResult.success) {
      throw new Error(cardResult.error || 'Failed to save card');
    }
    const savedCard = cardResult.card;
    console.log('Card saved:', savedCard.id);
    // STEP 2: Criar assinatura
    currentStep = 'create-subscription';
    console.log('Step 2: Creating subscription...');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    // Calcular total (plano + extras)
    const extraItemsTotal = extraItems.reduce((sum, item)=>sum + item.amount, 0);
    const totalAmount = planConfig.amount + extraItemsTotal;
    // Data para próxima cobrança (30 dias)
    const nextBillingDate = new Date();
    nextBillingDate.setDate(nextBillingDate.getDate() + 30);
    // Criar subscription
    const { data: subscription, error: subError } = await supabase.from('subscriptions').insert({
      customer_id: savedCard.customer_id,
      card_id: savedCard.id,
      plan_name: planConfig.name,
      base_amount: planConfig.amount,
      extra_items: extraItems.length > 0 ? extraItems : null,
      status: 'active',
      next_billing_date: nextBillingDate.toISOString().split('T')[0],
      is_production: !isDev // CAMPO ADICIONADO: true se for produção, false se for sandbox
    }).select().single();
    if (subError) {
      throw new Error(`Failed to create subscription: ${subError.message}`);
    }
    console.log('Subscription created:', subscription.id);
    // STEP 3: Processar primeiro pagamento
    currentStep = 'process-payment';
    console.log('Step 3: Processing initial payment...');
    const paymentItems = [
      {
        name: `${planConfig.name} Plan - First Month`,
        amount: planConfig.amount
      },
      ...extraItems
    ];
    const paymentResponse = await fetch(`${supabaseUrl}/functions/v1/process-payment`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        card_id: savedCard.id,
        amount: totalAmount,
        items: paymentItems,
        subscription_id: subscription.id,
        isDev
      })
    });
    const paymentResult = await paymentResponse.json();
    if (!paymentResponse.ok || !paymentResult.success) {
      // Reverter subscription se pagamento falhar
      await supabase.from('subscriptions').update({
        status: 'payment_failed',
        updated_at: new Date().toISOString()
      }).eq('id', subscription.id);
      throw new Error(paymentResult.error || 'Payment failed');
    }
    console.log('Payment processed successfully:', paymentResult.payment.id);
    // STEP 4: Adicionar mentions ao customer
    currentStep = 'add-mentions';
    const mentionsToAdd = {
      'Starter': 80,
      'Growth': 210,
      'Scale': 500
    }[planConfig.name] || 0;
    if (mentionsToAdd > 0) {
      console.log(`Adding ${mentionsToAdd} mentions to customer ${savedCard.customer_id}`);
      const { error: mentionsError } = await supabase.from('customers').update({
        Mentions: mentionsToAdd
      }).eq('id', savedCard.customer_id);
      if (mentionsError) {
        console.error('Failed to add mentions:', mentionsError);
      // Não falhar o checkout por causa de mentions
      } else {
        console.log(`Successfully added ${mentionsToAdd} mentions`);
      }
    }
    // SUCESSO - Retornar todos os dados
    return new Response(JSON.stringify({
      success: true,
      card: savedCard,
      subscription: subscription,
      payment: paymentResult.payment,
      summary: {
        plan: planConfig.name,
        displayName: planConfig.displayName,
        amount: `$${(totalAmount / 100).toFixed(2)}`,
        monthlyAmount: `$${(planConfig.amount / 100).toFixed(2)}`,
        nextBilling: subscription.next_billing_date,
        features: planConfig.features,
        mentions: mentionsToAdd // Adicionado para confirmar mentions
      }
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error(`Error at step ${currentStep}:`, error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      step: currentStep
    }), {
      status: 400,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});