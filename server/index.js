import { createServer } from 'http';
import express from 'express';
import cors from 'cors';
import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { VeridianRoom } from './rooms/VeridianRoom.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 2567;

// ─── CORS Configuration ───────────────────────────────────────────
// Colyseus matchmaking uses HTTP POST before upgrading to WebSocket.
// Both the POST and the WebSocket upgrade need proper CORS headers.
const ALLOWED_ORIGINS = [
  'https://metahvn.com',
  'https://www.metahvn.com',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:8080',
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, WebSocket upgrades)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    // In production, you may want to reject unknown origins:
    // return callback(new Error('CORS not allowed'), false);
    // For now, allow all for testing:
    console.log(`⚠️ CORS: allowing unlisted origin: ${origin}`);
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
  ],
  exposedHeaders: ['Content-Length', 'X-Request-Id'],
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Explicitly handle preflight for ALL routes (including Colyseus matchmaking)
app.options('*', cors(corsOptions));

app.use(express.json({ limit: '1mb' }));

// ─── Angela Companion API (chat + voice) ─────────────────────────
app.post('/api/angel/chat', async (req, res) => {
  try {
    const message = (req.body?.message || '').toString().trim();
    const systemPrompt = (req.body?.systemPrompt || '').toString().trim();

    if (!message) {
      return res.status(400).json({ error: 'message is required' });
    }

    const gatewayUrl = process.env.OPENCLAW_GATEWAY_URL || 'http://127.0.0.1:18789';
    const gatewayToken = process.env.OPENCLAW_GATEWAY_TOKEN;

    if (!gatewayToken) {
      return res.json({
        reply: 'I am here with you in Veridian. (Set OPENCLAW_GATEWAY_TOKEN on the server to connect me to live OpenClaw intelligence.)',
      });
    }

    const response = await fetch(`${gatewayUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${gatewayToken}`,
        'x-openclaw-agent-id': process.env.OPENCLAW_AGENT_ID || 'main',
      },
      body: JSON.stringify({
        model: 'openclaw:main',
        messages: [
          ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
          { role: 'user', content: message },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`OpenClaw chat failed (${response.status}): ${body.slice(0, 200)}`);
    }

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content?.trim() || 'I am here.';
    return res.json({ reply });
  } catch (err) {
    console.error('Angel chat error:', err.message || err);
    return res.status(500).json({ error: 'angel chat failed' });
  }
});

app.post('/api/angel/tts', async (req, res) => {
  try {
    const text = (req.body?.text || '').toString().trim();
    if (!text) return res.status(400).json({ error: 'text is required' });

    const elevenKey = process.env.ELEVENLABS_API_KEY;
    const voiceId = process.env.ELEVENLABS_VOICE_ID;

    if (!elevenKey || !voiceId) {
      return res.status(204).end();
    }

    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': elevenKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.45,
          similarity_boost: 0.78,
          style: 0.25,
          use_speaker_boost: true,
        },
      }),
    });

    if (!r.ok) {
      const body = await r.text().catch(() => '');
      throw new Error(`ElevenLabs failed (${r.status}): ${body.slice(0, 200)}`);
    }

    const audioBuffer = Buffer.from(await r.arrayBuffer());
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-store');
    return res.send(audioBuffer);
  } catch (err) {
    console.error('Angel TTS error:', err.message || err);
    return res.status(204).end();
  }
});

// ─── Health / Info Routes ─────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    name: 'Veridian Multiplayer Server',
    version: '1.1.0',
    status: 'online',
    rooms: ['veridian_hall'],
    cors: 'enabled',
    websocket: 'ready',
    uptime: Math.floor(process.uptime()) + 's',
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    websocket: 'enabled',
    uptime: Math.floor(process.uptime()) + 's',
  });
});

// ─── Create HTTP + Colyseus Server ────────────────────────────────
const server = createServer(app);

const gameServer = new Server({
  transport: new WebSocketTransport({
    server,
    pingInterval: 5000,
    pingMaxRetries: 3,
    verifyClient: (info, callback) => {
      // Check origin on WebSocket upgrade
      const origin = info.origin || info.req.headers.origin;
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        callback(true);
      } else {
        // Allow all for now (tighten in production)
        console.log(`⚠️ WS: allowing unlisted origin: ${origin}`);
        callback(true);
      }
    },
  }),
  gracefullyShutdown: true,
});

// ─── Define Rooms ─────────────────────────────────────────────────
gameServer.define('veridian_hall', VeridianRoom);

// ─── Start ────────────────────────────────────────────────────────
gameServer.listen(PORT).then(() => {
  console.log(`🚀 Veridian Multiplayer Server v1.1.0 on port ${PORT}`);
  console.log(`🌐 HTTP:  http://0.0.0.0:${PORT}`);
  console.log(`🎮 WS:    ws://0.0.0.0:${PORT}`);
  console.log(`✔ CORS enabled | WebSocket transport ready`);
});
