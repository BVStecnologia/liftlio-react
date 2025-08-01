import posthog from 'posthog-js'
import { PostHogConfig } from 'posthog-js'

const posthogConfig: Partial<PostHogConfig> = {
  api_host: process.env.REACT_APP_POSTHOG_HOST || 'https://us.i.posthog.com',
  capture_pageview: true,
  capture_pageleave: true,
  session_recording: {
    recordCrossOriginIframes: true,
  },
  autocapture: {
    dom_event_allowlist: ['click', 'submit', 'change'],
    element_allowlist: ['a', 'button', 'form', 'input', 'select', 'textarea'],
  },
  loaded: (posthog) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('PostHog loaded!', posthog)
      // Em desenvolvimento, você pode desabilitar para não poluir os dados
      // posthog.opt_out_capturing()
    }
  }
}

export const initPostHog = () => {
  const key = process.env.REACT_APP_POSTHOG_KEY
  
  if (!key) {
    console.warn('PostHog key not found. Analytics will not be tracked.')
    return
  }

  posthog.init(key, posthogConfig)
}

export default posthog