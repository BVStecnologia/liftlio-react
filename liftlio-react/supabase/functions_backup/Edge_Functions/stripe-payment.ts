import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import Stripe from 'https://esm.sh/stripe@12.5.0?target=deno'

// Configurações iniciais
console.log('Stripe Payment function started')

// Obter a chave secreta do Stripe da variável de ambiente
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') || 'YOUR_STRIPE_SECRET_KEY'
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') || 'YOUR_STRIPE_WEBHOOK_SECRET'

// Inicializar o cliente Stripe
const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

serve(async (req) => {
  // Lidar com solicitações de CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    })
  }

  try {
    const url = new URL(req.url)
    const path = url.pathname.split('/').filter(Boolean)
    const endpoint = path[path.length - 1]

    // Roteamento baseado no endpoint solicitado
    switch (endpoint) {
      case 'create-payment-intent':
        return await handleCreatePaymentIntent(req)
      case 'create-checkout-session':
        return await handleCreateCheckoutSession(req)
      case 'webhook':
        return await handleWebhook(req)
      case 'payment-config':
        return await handleGetPaymentConfig(req)
      default:
        return new Response(
          JSON.stringify({
            error: 'Endpoint not found',
            availableEndpoints: [
              '/create-payment-intent',
              '/create-checkout-session',
              '/webhook',
              '/payment-config'
            ]
          }),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
    }
  } catch (error) {
    console.error('Error:', error.message)

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

/**
 * Cria um PaymentIntent do Stripe para pagamentos via elementos do Stripe
 */
async function handleCreatePaymentIntent(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  try {
    const { amount, currency = 'brl', paymentMethodType = 'card', customerId = null } = await req.json()

    if (!amount || amount <= 0) {
      throw new Error('Valid amount is required')
    }

    // Configurar o PaymentIntent
    const paymentIntentParams: any = {
      amount: Math.round(amount * 100), // Stripe espera centavos
      currency,
      payment_method_types: [paymentMethodType],
      capture_method: 'automatic',
    }

    // Adicionar customer ID se fornecido
    if (customerId) {
      paymentIntentParams.customer = customerId
    }

    // Criar o PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams)

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('Payment Intent Error:', error.message)

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
}

/**
 * Cria uma sessão de checkout do Stripe para pagamentos via Checkout
 */
async function handleCreateCheckoutSession(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  try {
    const {
      priceId,
      successUrl = 'https://seu-site.com/success',
      cancelUrl = 'https://seu-site.com/cancel',
      customerId = null,
      mode = 'payment',
      lineItems = null
    } = await req.json()

    // Configurar a sessão de checkout
    const sessionParams: any = {
      success_url: successUrl,
      cancel_url: cancelUrl,
      mode: mode, // 'payment', 'subscription', ou 'setup'
      payment_method_types: ['card', 'boleto'],
    }

    // Adicionar line items baseado no que for enviado
    if (lineItems) {
      sessionParams.line_items = lineItems
    } else if (priceId) {
      sessionParams.line_items = [
        {
          price: priceId,
          quantity: 1,
        },
      ]
    } else {
      throw new Error('Either priceId or lineItems is required')
    }

    // Adicionar customer ID se fornecido
    if (customerId) {
      sessionParams.customer = customerId
    }

    // Criar a sessão de checkout
    const session = await stripe.checkout.sessions.create(sessionParams)

    return new Response(
      JSON.stringify({
        sessionId: session.id,
        url: session.url
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('Checkout Session Error:', error.message)

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
}

/**
 * Processa webhooks do Stripe para eventos como pagamentos bem-sucedidos, falhas, etc.
 */
async function handleWebhook(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  try {
    const body = await req.text()
    const signature = req.headers.get('stripe-signature')

    if (!signature) {
      throw new Error('Stripe signature is missing')
    }

    // Verificar a assinatura do webhook
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      STRIPE_WEBHOOK_SECRET
    )

    // Processar diferentes tipos de eventos
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object)
        break
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object)
        break
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object)
        break
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(
      JSON.stringify({ received: true }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('Webhook Error:', error.message)

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
}

/**
 * Retorna configurações de pagamento para o frontend
 */
async function handleGetPaymentConfig(req: Request): Promise<Response> {
  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  // Obter a chave pública do Stripe
  const stripePublicKey = Deno.env.get('STRIPE_PUBLIC_KEY') || 'pk_test_your_key'

  // Configurações que o frontend pode precisar
  const config = {
    stripePublicKey,
    country: 'BR',
    currency: 'brl',
    supportedPaymentMethods: ['card', 'boleto', 'pix'],
    features: {
      saveCards: true,
      subscriptions: true
    }
  }

  return new Response(
    JSON.stringify(config),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}

// Handlers de eventos de webhook
async function handlePaymentIntentSucceeded(paymentIntent: any) {
  console.log('PaymentIntent succeeded:', paymentIntent.id)
}

async function handlePaymentIntentFailed(paymentIntent: any) {
  console.log('PaymentIntent failed:', paymentIntent.id, paymentIntent.last_payment_error?.message)
}

async function handleCheckoutSessionCompleted(session: any) {
  console.log('Checkout session completed:', session.id)

  if (session.payment_intent) {
    const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent)
    console.log('Associated payment details:', paymentIntent.id, paymentIntent.status)
  }
}
