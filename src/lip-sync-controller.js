export class LipSyncController {
  constructor({
    attackPerSecond = 9,
    releasePerSecond = 7,
    minOpen = 0.2,
    maxOpen = 1.1,
    frequencyHz = 9,
  } = {}) {
    this.attackPerSecond = attackPerSecond;
    this.releasePerSecond = releasePerSecond;
    this.minOpen = minOpen;
    this.maxOpen = maxOpen;
    this.frequencyHz = frequencyHz;

    this.active = false;
    this.envelope = 0;
  }

  start() {
    this.active = true;
  }

  stop() {
    this.active = false;
  }

  reset() {
    this.active = false;
    this.envelope = 0;
  }

  update(deltaSeconds, timeSeconds) {
    const dt = Number.isFinite(deltaSeconds) ? Math.max(0, deltaSeconds) : 0;
    const rise = this.attackPerSecond * dt;
    const fall = this.releasePerSecond * dt;

    if (this.active) {
      this.envelope = Math.min(1, this.envelope + rise);
    } else {
      this.envelope = Math.max(0, this.envelope - fall);
    }

    if (this.envelope <= 0) return 1;

    const pulse = Math.abs(Math.sin(timeSeconds * Math.PI * 2 * this.frequencyHz));
    const openness = this.minOpen + pulse * this.maxOpen;
    return 1 + openness * this.envelope;
  }
}
