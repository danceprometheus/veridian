import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { ANGELA_BEHAVIOR_MODES, AngelaBehaviorModeController } from './angel-behavior-mode.js';
import { AngelCompanion } from './angel-companion.js';

test('AngelaBehaviorModeController transitions are deterministic', () => {
  const controller = new AngelaBehaviorModeController();

  assert.equal(controller.getMode(), ANGELA_BEHAVIOR_MODES.FOLLOW);
  assert.equal(controller.shouldFollow(), true);

  const stayResult = controller.setStay();
  assert.deepEqual(stayResult, {
    changed: true,
    mode: ANGELA_BEHAVIOR_MODES.STAY,
    valid: true,
  });
  assert.equal(controller.shouldFollow(), false);

  const repeatedStay = controller.setStay();
  assert.deepEqual(repeatedStay, {
    changed: false,
    mode: ANGELA_BEHAVIOR_MODES.STAY,
    valid: true,
  });

  const invalid = controller.transitionTo('teleport');
  assert.deepEqual(invalid, {
    changed: false,
    mode: ANGELA_BEHAVIOR_MODES.STAY,
    valid: false,
  });

  const followResult = controller.setFollow();
  assert.deepEqual(followResult, {
    changed: true,
    mode: ANGELA_BEHAVIOR_MODES.FOLLOW,
    valid: true,
  });
});

test('command handler supports follow/stay without side effects for unknown commands', () => {
  const controller = new AngelaBehaviorModeController(ANGELA_BEHAVIOR_MODES.STAY);

  assert.deepEqual(controller.applyCommand('follow'), {
    handled: true,
    changed: true,
    mode: ANGELA_BEHAVIOR_MODES.FOLLOW,
    valid: true,
  });

  assert.deepEqual(controller.applyCommand('  stay  '), {
    handled: true,
    changed: true,
    mode: ANGELA_BEHAVIOR_MODES.STAY,
    valid: true,
  });

  assert.deepEqual(controller.applyCommand('hello angela'), {
    handled: false,
    changed: false,
    mode: ANGELA_BEHAVIOR_MODES.STAY,
    valid: false,
  });
});

test('AngelCompanion.update gates movement based on behavior mode', () => {
  const companion = Object.create(AngelCompanion.prototype);
  companion.behaviorController = new AngelaBehaviorModeController(ANGELA_BEHAVIOR_MODES.FOLLOW);
  companion.followDistance = 2.8;
  companion.followHeight = 0.2;
  companion.camera = {
    quaternion: new THREE.Quaternion(),
    position: new THREE.Vector3(0, 1.6, 0),
  };
  companion.group = {
    position: new THREE.Vector3(0, 0, 0),
    lookAt() {},
  };
  companion.leftWing = { rotation: { y: 0 } };
  companion.rightWing = { rotation: { y: 0 } };
  companion.halo = { material: { emissiveIntensity: 0 }, rotation: { z: 0 } };
  companion.mouth = { scale: { y: 1 } };
  companion.isSpeaking = false;

  companion.update(1);
  assert.notEqual(companion.group.position.z, 0);

  const zAfterFollow = companion.group.position.z;
  companion.behaviorController.setStay();
  companion.update(1.1);

  assert.equal(companion.group.position.z, zAfterFollow);
});
