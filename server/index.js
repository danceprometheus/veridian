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

app.use(express.json());

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
