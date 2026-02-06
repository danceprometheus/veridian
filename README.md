# Veridian — Project Structure & Deployment

## Problem That Was Fixed
The repo had the **server** `package.json` at the root, which meant Cloudflare Pages
was trying to install Colyseus/Express instead of Three.js/Vite. The client and server
are now properly separated.

## Structure

```
veridian/
├── index.html          ← Client entry point
├── package.json        ← CLIENT dependencies (three, colyseus.js, supabase, vite)
├── vite.config.js      ← Vite build config
├── public/             ← Static assets
│   └── _redirects      ← Cloudflare SPA routing
├── src/                ← Client source
│   ├── main.js         ← Entry point (config + auth init)
│   ├── app.js          ← Three.js world, controls, asset manager
│   ├── multiplayer.js  ← Colyseus client (FIXED: reconnection, heartbeat, throttle)
│   ├── auth.js         ← Supabase auth flow
│   ├── supabase.js     ← Supabase client init
│   ├── wallet.js       ← MetaMask / NFT integration
│   └── styles.css      ← UI styles
└── server/             ← Colyseus server (deploys to Fly.io SEPARATELY)
    ├── index.js        ← Express + Colyseus setup (FIXED: CORS preflight)
    ├── fly.toml        ← Fly.io config (FIXED: WS concurrency, idle timeout)
    ├── Dockerfile      ← Docker build
    ├── package.json    ← SERVER dependencies (colyseus, express, cors)
    ├── .env
    ├── rooms/
    │   └── VeridianRoom.js  ← Room logic (FIXED: reconnection, no aggressive timeout)
    └── schema/
        └── VeridianState.js ← Colyseus state schema
```

## Deploying the Client (Cloudflare Pages)

1. Push this repo to GitHub
2. In Cloudflare Pages → Settings → Build:
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Root directory:** `/` (the repo root)
3. Environment variables needed:
   - `VITE_SUPABASE_URL` — your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` — your Supabase anon key
4. Deploy

## Deploying the Server (Fly.io)

```bash
cd server
fly deploy
```

The server deploys independently from the `server/` directory.

## What Was Fixed

### CORS Issues
- Added explicit `app.options('*', cors())` for preflight requests
- Colyseus matchmaking makes HTTP POST before WebSocket upgrade — preflight was failing

### Multiplayer Issues
- **Removed aggressive 30s timeout** that kicked idle-but-connected players
- **Added reconnection support** — players get 30s to reconnect after drops
- **Added client-side reconnection** with exponential backoff (up to 5 retries)
- **Added heartbeat** (client pings every 10s)
- **Added position throttling** (max 20 updates/sec instead of every frame)
- **Added smooth interpolation** for other players' movement (lerp)
- **Added XSS protection** — chat messages are now HTML-escaped

### Fly.io Config
- Added `concurrency` settings for long-lived WebSocket connections
- Added `idle_timeout = 300` to prevent proxy from killing WS connections
- Added TCP health check

### Package.json
- Root `package.json` now has CLIENT deps (three, colyseus.js, vite, supabase)
- Server has its own `package.json` in `server/`
