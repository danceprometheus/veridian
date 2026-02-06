import { Room } from '@colyseus/core';
import { VeridianState, Player } from '../schema/VeridianState.js';

export class VeridianRoom extends Room {
  maxClients = 50;

  onCreate(options) {
    this.setState(new VeridianState());

    // Allow reconnection within 30 seconds
    this.autoDispose = false;

    // Increase seat reservation timeout
    this.setSeatReservationTime(20);

    console.log(`✔ Room created: ${this.roomId} | Max clients: ${this.maxClients}`);

    // ─── Message Handlers ───────────────────────────────────────
    this.onMessage('move', (client, data) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      if (typeof data.x !== 'number' || typeof data.y !== 'number' || typeof data.z !== 'number') return;

      player.x = data.x;
      player.y = data.y;
      player.z = data.z;
      player.rotX = data.rotX || 0;
      player.rotY = data.rotY || 0;
      player.rotZ = data.rotZ || 0;
      player.inVR = data.inVR || false;
      player.timestamp = Date.now();
    });

    this.onMessage('chat', (client, data) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      if (!data.message || typeof data.message !== 'string') return;

      const message = data.message.trim().substring(0, 500);
      if (!message) return;

      this.broadcast('chat', {
        sessionId: client.sessionId,
        displayName: player.displayName,
        message,
        timestamp: Date.now(),
      });
    });

    // ─── Asset Placement (real-time broadcast) ──────────────────
    this.onMessage('place_asset', (client, data) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      if (!data.assetId || !data.assetType || !data.cdnUrl) return;
      if (typeof data.x !== 'number' || typeof data.y !== 'number' || typeof data.z !== 'number') return;

      console.log(`🎨 Asset placed by ${player.displayName}: ${data.assetType} at (${data.x.toFixed(1)}, ${data.y.toFixed(1)}, ${data.z.toFixed(1)})`);

      // Broadcast to all OTHER players (sender already placed it locally)
      this.broadcast('asset_placed', {
        sessionId: client.sessionId,
        displayName: player.displayName,
        assetId: data.assetId,
        assetType: data.assetType,
        cdnUrl: data.cdnUrl,
        filename: data.filename || '',
        x: data.x,
        y: data.y,
        z: data.z,
        scale: data.scale || 1.0,
        rotY: data.rotY || 0,
        timestamp: Date.now(),
      }, { except: client });
    });

    // ─── Asset Removal (real-time broadcast) ────────────────────
    this.onMessage('remove_asset', (client, data) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      if (!data.assetId) return;

      console.log(`🗑️ Asset removed by ${player.displayName}: ${data.assetId}`);

      this.broadcast('asset_removed', {
        sessionId: client.sessionId,
        assetId: data.assetId,
        timestamp: Date.now(),
      }, { except: client });
    });

    // Heartbeat
    this.onMessage('ping', (client) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        player.timestamp = Date.now();
      }
    });

    this.setSimulationInterval((deltaTime) => this.update(deltaTime), 50);
  }

  onJoin(client, options) {
    const name = options.displayName || 'Anonymous';
    console.log(`✔ Player joined: ${client.sessionId} (${name})`);

    const player = new Player();
    player.sessionId = client.sessionId;
    player.userId = options.userId || 'guest';
    player.displayName = name;
    player.avatarUrl = options.avatarUrl || '';
    player.x = 0;
    player.y = 1.6;
    player.z = 10;
    player.rotX = 0;
    player.rotY = 0;
    player.rotZ = 0;
    player.inVR = false;
    player.connected = true;
    player.timestamp = Date.now();

    this.state.players.set(client.sessionId, player);

    this.broadcast(
      'player_joined',
      {
        sessionId: client.sessionId,
        displayName: player.displayName,
        playerCount: this.state.players.size,
      },
      { except: client }
    );

    client.send('welcome', {
      sessionId: client.sessionId,
      playerCount: this.state.players.size,
    });
  }

  async onLeave(client, consented) {
    const player = this.state.players.get(client.sessionId);

    if (player) {
      player.connected = false;

      if (!consented) {
        try {
          console.log(`⏳ Waiting for reconnect: ${client.sessionId} (${player.displayName})`);
          await this.allowReconnection(client, 30);
          player.connected = true;
          player.timestamp = Date.now();
          console.log(`✔ Player reconnected: ${client.sessionId}`);
          return;
        } catch (e) {
          console.log(`✗ Reconnection timeout: ${client.sessionId}`);
        }
      }

      this.broadcast('player_left', {
        sessionId: client.sessionId,
        displayName: player.displayName,
        playerCount: this.state.players.size - 1,
      });

      this.state.players.delete(client.sessionId);
      console.log(`✗ Player removed: ${client.sessionId} | Remaining: ${this.state.players.size}`);
    }
  }

  update(deltaTime) {}

  onDispose() {
    console.log(`✗ Room disposed: ${this.roomId}`);
  }
}
