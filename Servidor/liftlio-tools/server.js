/**
 * Liftlio Tools Server
 * Simple proxy to Supabase claude-chat edge function
 * Only consumes resources when used - no polling
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3500;

// Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://suqjifkhmekcdflwowiw.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cWppZmtobWVrY2RmbHdvd2l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY1MDkzNDQsImV4cCI6MjA0MjA4NTM0NH0.ajtUy21ib_z5O6jWaAYwZ78_D5Om_cWra5zFq-0X-3I';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'liftlio-tools' });
});

// Translation endpoint
app.post('/api/translate', async (req, res) => {
  try {
    const { text, targetLang } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    // Build translation prompt
    const prompt = targetLang
      ? `Translate the following text to ${targetLang}. Return ONLY the translation, nothing else:\n\n${text}`
      : `Detect the language of this text. If it's in English, translate to Portuguese (Brazil). If it's in Portuguese, translate to English. Return ONLY the translation, nothing else:\n\n${text}`;

    console.log(`[TRANSLATE] Request: ${text.substring(0, 50)}... -> ${targetLang || 'auto'}`);

    // Call Supabase claude-chat edge function
    const response = await fetch(`${SUPABASE_URL}/functions/v1/claude-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify({
        message: prompt,
        maxTurns: 1,
        model: 'opus'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[TRANSLATE] Error: ${response.status} - ${errorText}`);
      return res.status(response.status).json({ error: 'Translation failed', details: errorText });
    }

    const data = await response.json();

    console.log(`[TRANSLATE] Success: ${data.duration}ms`);

    res.json({
      success: true,
      translation: data.response,
      duration: data.duration,
      cost: data.cost
    });

  } catch (error) {
    console.error(`[TRANSLATE] Error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Liftlio Tools running on http://localhost:${PORT}`);
});
