const MAX_MESSAGE_LENGTH = 500;

export function sanitizeUserMessage(input) {
  const message = (input || '').toString().trim();
  if (!message) {
    return { ok: false, reason: 'empty' };
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return { ok: false, reason: 'too_long', max: MAX_MESSAGE_LENGTH };
  }

  // Remove control chars except newline/tab
  const cleaned = message.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  return { ok: true, value: cleaned };
}

export function parseCompanionCommand(input) {
  const normalized = (input || '').toString().trim().toLowerCase();
  if (normalized === 'follow') {
    return {
      handled: true,
      command: 'follow',
      reply: 'Follow mode enabled. I will stay near you.',
    };
  }

  if (normalized === 'stay') {
    return {
      handled: true,
      command: 'stay',
      reply: 'Stay mode enabled. I will wait right here.',
    };
  }

  return { handled: false };
}

export const ANGEL_GUARDS = {
  MAX_MESSAGE_LENGTH,
};
