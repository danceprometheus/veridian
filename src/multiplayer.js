import { Client } from 'colyseus.js';
import * as THREE from 'three';

export class MultiplayerClient {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.client = null;
    this.room = null;
    this.serverUrl = 'wss://veridian-d3rswa.fly.dev';
    this.players = new Map();
    this.sessionId = null;
    this._heartbeatInterval = null;
    this._reconnecting = false;
    this._user = null;
    this._positionThrottle = 0;
  }

  async connect(user) {
    this._user = user;

    try {
      console.log('🔌 Connecting to:', this.serverUrl);

      this.client = new Client(this.serverUrl);

      this.room = await this.client.joinOrCreate('veridian_hall', {
        userId: user.id,
        displayName:
          user.user_metadata?.display_name ||
          user.email?.split('@')[0] ||
          'Anonymous',
        avatarUrl: user.user_metadata?.avatar_url || '',
      });

      this.sessionId = this.room.sessionId;
      console.log('✓ Connected! Session:', this.sessionId);

      this.setupListeners();
      this._startHeartbeat();
      return true;
    } catch (error) {
      console.error('❌ Connection failed:', error.message || error);
      // Attempt one retry after 3s
      if (!this._reconnecting) {
        this._reconnecting = true;
        console.log('🔄 Retrying connection in 3s...');
        await new Promise((r) => setTimeout(r, 3000));
        this._reconnecting = false;
        return this.connect(user);
      }
      return false;
    }
  }

  setupListeners() {
    // --- State change listeners ---
    this.room.state.players.onAdd((player, sessionId) => {
      if (sessionId === this.sessionId) {
        console.log('✓ You joined as', player.displayName);
        return;
      }
      console.log('✓ Player joined:', player.displayName);
      this.addPlayer(player, sessionId);
      this.showNotification(`${player.displayName} joined`);

      // Listen for changes on this specific player
      player.onChange(() => {
        this.updatePlayer(player, sessionId);
      });
    });

    this.room.state.players.onRemove((player, sessionId) => {
      console.log('✗ Player left:', player.displayName);
      this.removePlayer(sessionId);
      this.showNotification(`${player.displayName} left`);
    });

    // --- Custom messages ---
    this.room.onMessage('chat', (data) => {
      this.showChat(data);
    });

    this.room.onMessage('welcome', (data) => {
      console.log('✓ Welcome! Players online:', data.playerCount);
    });

    // --- Connection lifecycle ---
    this.room.onLeave((code) => {
      console.log('⚠️ Disconnected from room, code:', code);
      this._stopHeartbeat();

      // code 1000 = normal close, anything else = unexpected
      if (code !== 1000 && this._user) {
        console.log('🔄 Attempting reconnection...');
        this._attemptReconnect();
      }
    });

    this.room.onError((code, message) => {
      console.error('❌ Room error:', code, message);
    });
  }

  async _attemptReconnect() {
    const maxRetries = 5;
    for (let i = 1; i <= maxRetries; i++) {
      const delay = Math.min(1000 * Math.pow(2, i), 15000); // exponential backoff, max 15s
      console.log(`🔄 Reconnect attempt ${i}/${maxRetries} in ${delay / 1000}s`);
      await new Promise((r) => setTimeout(r, delay));

      try {
        // Try to reconnect to the same room first
        if (this.room?.reconnectionToken) {
          this.room = await this.client.reconnect(this.room.reconnectionToken);
        } else {
          this.room = await this.client.joinOrCreate('veridian_hall', {
            userId: this._user.id,
            displayName:
              this._user.user_metadata?.display_name ||
              this._user.email?.split('@')[0] ||
              'Anonymous',
            avatarUrl: this._user.user_metadata?.avatar_url || '',
          });
        }

        this.sessionId = this.room.sessionId;
        console.log('✓ Reconnected! Session:', this.sessionId);
        this.setupListeners();
        this._startHeartbeat();

        const statusEl = document.getElementById('multiplayer-status');
        if (statusEl) {
          statusEl.textContent = `Connected • ${this.getPlayerCount()} online`;
          statusEl.classList.remove('disconnected');
          statusEl.classList.add('connected');
        }
        return;
      } catch (e) {
        console.warn(`Reconnect attempt ${i} failed:`, e.message || e);
      }
    }

    console.error('❌ Could not reconnect after', maxRetries, 'attempts');
    const statusEl = document.getElementById('multiplayer-status');
    if (statusEl) {
      statusEl.textContent = 'Disconnected';
      statusEl.classList.remove('connected');
      statusEl.classList.add('disconnected');
    }
  }

  _startHeartbeat() {
    this._stopHeartbeat();
    // Send a ping every 10s to keep the connection alive
    this._heartbeatInterval = setInterval(() => {
      if (this.room) {
        try {
          this.room.send('ping');
        } catch (e) {
          // ignore if room is closed
        }
      }
    }, 10000);
  }

  _stopHeartbeat() {
    if (this._heartbeatInterval) {
      clearInterval(this._heartbeatInterval);
      this._heartbeatInterval = null;
    }
  }

  addPlayer(player, sessionId) {
    // Don't add duplicate
    if (this.players.has(sessionId)) return;

    const geometry = new THREE.BoxGeometry(0.5, 1.8, 0.5);
    const hue = (sessionId.charCodeAt(0) * 137) % 360;
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(`hsl(${hue}, 70%, 60%)`),
      metalness: 0.3,
      roughness: 0.7,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(player.x, player.y, player.z);
    mesh.castShadow = true;

    // Name label
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, 256, 64);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(player.displayName, 128, 42);

    const texture = new THREE.CanvasTexture(canvas);
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: texture })
    );
    sprite.scale.set(2, 0.5, 1);
    sprite.position.y = 1.2;
    mesh.add(sprite);

    this.scene.add(mesh);
    this.players.set(sessionId, { mesh, sprite, data: player });
  }

  updatePlayer(player, sessionId) {
    const p = this.players.get(sessionId);
    if (!p) return;

    // Smooth interpolation
    p.mesh.position.lerp(
      new THREE.Vector3(player.x, player.y, player.z),
      0.3
    );
    p.mesh.rotation.set(player.rotX, player.rotY, player.rotZ);
    p.data = player;
  }

  removePlayer(sessionId) {
    const p = this.players.get(sessionId);
    if (!p) return;

    this.scene.remove(p.mesh);
    // Dispose geometry and materials
    if (p.mesh.geometry) p.mesh.geometry.dispose();
    if (p.mesh.material) p.mesh.material.dispose();
    if (p.sprite?.material?.map) p.sprite.material.map.dispose();
    this.players.delete(sessionId);
  }

  sendPosition(x, y, z, rotX, rotY, rotZ, inVR) {
    if (!this.room) return;

    // Throttle to ~20 updates/sec (every 50ms)
    const now = performance.now();
    if (now - this._positionThrottle < 50) return;
    this._positionThrottle = now;

    this.room.send('move', {
      x: Math.round(x * 100) / 100,
      y: Math.round(y * 100) / 100,
      z: Math.round(z * 100) / 100,
      rotX: Math.round(rotX * 100) / 100,
      rotY: Math.round(rotY * 100) / 100,
      rotZ: Math.round(rotZ * 100) / 100,
      inVR: inVR || false,
    });
  }

  sendChat(message) {
    if (!this.room) return;
    this.room.send('chat', { message });
  }

  showChat(data) {
    const log = document.getElementById('chat-messages');
    if (!log) return;

    const msg = document.createElement('div');
    msg.className = 'chat-message';
    msg.innerHTML = `<strong>${this._escapeHtml(data.displayName)}:</strong> ${this._escapeHtml(data.message)}`;
    log.appendChild(msg);
    log.scrollTop = log.scrollHeight;

    setTimeout(() => msg.remove(), 30000);
  }

  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  showNotification(text) {
    const el = document.getElementById('notification-display');
    if (!el) return;

    el.textContent = text;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 3000);
  }

  getPlayerCount() {
    return this.players.size + 1;
  }

  update() {
    this.players.forEach(({ sprite }) => {
      if (sprite) sprite.lookAt(this.camera.position);
    });
  }

  disconnect() {
    this._stopHeartbeat();
    if (this.room) {
      this.room.leave();
      this.room = null;
    }
    this.players.forEach((_, sessionId) => this.removePlayer(sessionId));
    this.players.clear();
  }
}
