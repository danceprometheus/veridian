import { Schema, MapSchema, type } from '@colyseus/schema';

export class Player extends Schema {
  constructor() {
    super();
    this.sessionId = '';
    this.userId = '';
    this.displayName = '';
    this.avatarUrl = '';
    this.x = 0;
    this.y = 1.6;
    this.z = 10;
    this.rotX = 0;
    this.rotY = 0;
    this.rotZ = 0;
    this.inVR = false;
    this.timestamp = 0;
    this.connected = true;
  }
}

type('string')(Player.prototype, 'sessionId');
type('string')(Player.prototype, 'userId');
type('string')(Player.prototype, 'displayName');
type('string')(Player.prototype, 'avatarUrl');
type('number')(Player.prototype, 'x');
type('number')(Player.prototype, 'y');
type('number')(Player.prototype, 'z');
type('number')(Player.prototype, 'rotX');
type('number')(Player.prototype, 'rotY');
type('number')(Player.prototype, 'rotZ');
type('boolean')(Player.prototype, 'inVR');
type('number')(Player.prototype, 'timestamp');
type('boolean')(Player.prototype, 'connected');

export class VeridianState extends Schema {
  constructor() {
    super();
    this.players = new MapSchema();
  }
}

type({ map: Player })(VeridianState.prototype, 'players');
