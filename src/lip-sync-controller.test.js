import test from 'node:test';
import assert from 'node:assert/strict';
import { LipSyncController } from './lip-sync-controller.js';
import { AngelCompanion } from './angel-companion.js';

test('LipSyncController ramps in and out smoothly across speech lifecycle', () => {
  const controller = new LipSyncController({
    attackPerSecond: 4,
    releasePerSecond: 4,
    minOpen: 0.1,
    maxOpen: 0.9,
    frequencyHz: 6,
  });

  const idle = controller.update(1 / 60, 0);
  assert.equal(idle, 1);

  controller.start();
  const firstFrame = controller.update(1 / 60, 0.1);
  const secondFrame = controller.update(1 / 60, 0.12);

  assert(firstFrame > 1, 'first speaking frame should open mouth above idle');
  assert(secondFrame >= firstFrame, 'attack should ramp mouth openness without hard snap');

  controller.stop();
  const releaseFrame = controller.update(1 / 60, 0.14);
  assert(releaseFrame < secondFrame, 'release should begin decaying after speech ends');

  for (let i = 0; i < 30; i += 1) {
    controller.update(1 / 60, 0.16 + i * (1 / 60));
  }

  const settled = controller.update(1 / 60, 0.9);
  assert.equal(settled, 1, 'mouth should settle back to idle after release');
});

test('AngelCompanion audio lip-sync hooks start and stop controller', async () => {
  const companion = Object.create(AngelCompanion.prototype);
  companion.mouth = { scale: { y: 1 } };
  companion.lipSyncController = new LipSyncController({ attackPerSecond: 8, releasePerSecond: 8 });

  const audio = {
    onended: null,
    onerror: null,
    async play() {},
  };

  await companion._playAudioWithLipSync(audio);
  assert.equal(companion.lipSyncController.active, true);

  audio.onended();
  assert.equal(companion.lipSyncController.active, false);

  const postEnd = companion.lipSyncController.update(0.5, 1);
  assert.equal(postEnd, 1);
});

test('AngelCompanion can hard-reset lip-sync state to idle mouth scale', () => {
  const companion = Object.create(AngelCompanion.prototype);
  companion.mouth = { scale: { y: 1 } };
  companion.lipSyncController = new LipSyncController();

  companion._startLipSync();
  companion.lipSyncController.update(0.1, 0.2);

  companion._resetLipSync();

  assert.equal(companion.lipSyncController.active, false);
  assert.equal(companion.lipSyncController.envelope, 0);
  assert.equal(companion.mouth.scale.y, 1);
});
