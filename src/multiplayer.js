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
  }

  async connect(user) {
    try {
      console.log('🔌 Connecting to:', this.serverUrl);
      
      this.client = new Client(this.serverUrl);
      
      this.room = await this.client.joinOrCreate('veridian_hall', {
        userId: user.id,
        displayName: user.user_metadata?.display_name || user.email?.split('@')[0] || 'Anonymous',
        avatarUrl: user.user_metadata?.avatar_url || ''
      });

      this.sessionId = this.room.sessionId;
      console.log('✓ Connected! Session:', this.sessionId);

      this.setupListeners();
      return true;
    } catch (error) {
      console.error('❌ Connection failed:', error);
      return false;
    }
  }

  setupListeners() {
    this.room.state.players.onAdd((player, sessionId) => {
      if (sessionId === this.sessionId) {
        console.log('✓ You joined');
        return;
      }

      console.log('✓ Player joined:', player.displayName);
      this.addPlayer(player, sessionId);
      this.showNotification(`${player.displayName} joined`);
    });

    this.room.state.players.onChange((player, sessionId) => {
      if (sessionId === this.sessionId) return;
      this.updatePlayer(player, sessionId);
    });

    this.room.state.players.onRemove((player, sessionId) => {
      console.log('✗ Player left:', player.displayName);
      this.removePlayer(sessionId);
      this.showNotification(`${player.displayName} left`);
    });

    this.room.onMessage('chat', (data) => {
      this.showChat(data);
    });
  }

  addPlayer(player, sessionId) {
    const geometry = new THREE.BoxGeometry(0.5, 1.8, 0.5);
    const hue = (sessionId.charCodeAt(0) * 137) % 360;
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(`hsl(${hue}, 70%, 60%)`),
      metalness: 0.3,
      roughness: 0.7
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(player.x, player.y, player.z);
    mesh.castShadow = true;

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
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture }));
    sprite.scale.set(2, 0.5, 1);
    sprite.position.y = 1.2;
    mesh.add(sprite);

    this.scene.add(mesh);
    this.players.set(sessionId, { mesh, sprite, data: player });
  }

  updatePlayer(player, sessionId) {
    const p = this.players.get(sessionId);
    if (!p) return;

    p.mesh.position.set(player.x, player.y, player.z);
    p.mesh.rotation.set(player.rotX, player.rotY, player.rotZ);
    p.data = player;
  }

  removePlayer(sessionId) {
    const p = this.players.get(sessionId);
    if (!p) return;

    this.scene.remove(p.mesh);
    this.players.delete(sessionId);
  }

  sendPosition(x, y, z, rotX, rotY, rotZ, inVR) {
    if (!this.room) return;

    this.room.send('move', {
      x: Math.round(x * 100) / 100,
      y: Math.round(y * 100) / 100,
      z: Math.round(z * 100) / 100,
      rotX: Math.round(rotX * 100) / 100,
      rotY: Math.round(rotY * 100) / 100,
      rotZ: Math.round(rotZ * 100) / 100,
      inVR: inVR || false
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
    msg.innerHTML = `<strong>${data.displayName}:</strong> ${data.message}`;
    log.appendChild(msg);
    log.scrollTop = log.scrollHeight;

    setTimeout(() => msg.remove(), 30000);
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
    if (this.room) {
      this.room.leave();
      this.room = null;
    }
    this.players.forEach((_, sessionId) => this.removePlayer(sessionId));
    this.players.clear();
  }
}
