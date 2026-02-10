import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeUserMessage, parseCompanionCommand, ANGEL_GUARDS } from './angel-guards.js';

test('sanitizeUserMessage validates empty and oversized input', () => {
  assert.equal(sanitizeUserMessage('').ok, false);
  const oversized = 'x'.repeat(ANGEL_GUARDS.MAX_MESSAGE_LENGTH + 1);
  const result = sanitizeUserMessage(oversized);
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'too_long');
});

test('sanitizeUserMessage strips control chars and returns cleaned value', () => {
  const result = sanitizeUserMessage('hello\u0000 world');
  assert.equal(result.ok, true);
  assert.equal(result.value, 'hello world');
});

test('parseCompanionCommand handles follow/stay only', () => {
  assert.deepEqual(parseCompanionCommand('follow'), {
    handled: true,
    command: 'follow',
    reply: 'Follow mode enabled. I will stay near you.',
  });

  assert.deepEqual(parseCompanionCommand('stay'), {
    handled: true,
    command: 'stay',
    reply: 'Stay mode enabled. I will wait right here.',
  });

  assert.deepEqual(parseCompanionCommand('hello'), { handled: false });
});
