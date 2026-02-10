export const ANGELA_BEHAVIOR_MODES = Object.freeze({
  FOLLOW: 'follow',
  STAY: 'stay',
});

const MODE_SET = new Set(Object.values(ANGELA_BEHAVIOR_MODES));

export class AngelaBehaviorModeController {
  constructor(initialMode = ANGELA_BEHAVIOR_MODES.FOLLOW) {
    this.mode = MODE_SET.has(initialMode) ? initialMode : ANGELA_BEHAVIOR_MODES.FOLLOW;
  }

  getMode() {
    return this.mode;
  }

  shouldFollow() {
    return this.mode === ANGELA_BEHAVIOR_MODES.FOLLOW;
  }

  setFollow() {
    return this.transitionTo(ANGELA_BEHAVIOR_MODES.FOLLOW);
  }

  setStay() {
    return this.transitionTo(ANGELA_BEHAVIOR_MODES.STAY);
  }

  transitionTo(nextMode) {
    if (!MODE_SET.has(nextMode)) {
      return { changed: false, mode: this.mode, valid: false };
    }

    const changed = this.mode !== nextMode;
    this.mode = nextMode;
    return { changed, mode: this.mode, valid: true };
  }

  applyCommand(commandText = '') {
    const normalized = commandText.trim().toLowerCase();

    if (normalized === ANGELA_BEHAVIOR_MODES.FOLLOW) {
      return { handled: true, ...this.setFollow() };
    }

    if (normalized === ANGELA_BEHAVIOR_MODES.STAY) {
      return { handled: true, ...this.setStay() };
    }

    return { handled: false, changed: false, mode: this.mode, valid: false };
  }
}
