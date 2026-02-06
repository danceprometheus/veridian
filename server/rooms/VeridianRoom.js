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

      // Basic validation
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

      // Sanitize and limit message length
      const message = data.message.trim().substring(0, 500);
      if (!message) return;

      this.broadcast('chat', {
        sessionId: client.sessionId,
        displayName: player.displayName,
        message,
        timestamp: Date.now(),
      });
    });

    // Heartbeat / keep-alive from client
    this.onMessage('ping', (client) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        player.timestamp = Date.now();
      }
    });

    // Simulation loop — 20 ticks/second
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

    // Notify others
    this.broadcast(
      'player_joined',
      {
        sessionId: client.sessionId,
        displayName: player.displayName,
        playerCount: this.state.players.size,
      },
      { except: client }
    );

    // Tell the joining client about the current player count
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
        // Unexpected disconnect — allow reconnection for 30s
        try {
          console.log(`⏳ Waiting for reconnect: ${client.sessionId} (${player.displayName})`);
          await this.allowReconnection(client, 30);
          // Player reconnected
          player.connected = true;
          player.timestamp = Date.now();
          console.log(`✔ Player reconnected: ${client.sessionId}`);
          return;
        } catch (e) {
          // Reconnection timed out
          console.log(`✗ Reconnection timeout: ${client.sessionId}`);
        }
      }

      // Remove player
      this.broadcast('player_left', {
        sessionId: client.sessionId,
        displayName: player.displayName,
        playerCount: this.state.players.size - 1,
      });

      this.state.players.delete(client.sessionId);
      console.log(`✗ Player removed: ${client.sessionId} | Remaining: ${this.state.players.size}`);
    }

    // If no players, dispose after a delay
    if (this.state.players.size === 0) {
      console.log('⚠️ Room empty — will auto-dispose');
    }
  }

  update(deltaTime) {
    // No aggressive timeout — Colyseus ping/pong handles dead connections.
    // Only clean up players explicitly marked disconnected beyond reconnect window.
    // The allowReconnection() in onLeave handles this already.
  }

  onDispose() {
    console.log(`✗ Room disposed: ${this.roomId}`);
  }
}
