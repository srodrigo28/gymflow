import { createHash, randomBytes, randomInt } from 'node:crypto';

// O token vai para o aparelho; o banco guarda só o hash. Vazar o banco não abre sessões.
export function newSessionToken() {
  return randomBytes(32).toString('base64url');
}

export function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

// Sem 0/O, 1/I/L: o código é lido em voz alta e digitado à mão.
const INVITE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function newInviteCode(length = 8) {
  let code = '';

  for (let index = 0; index < length; index += 1) {
    code += INVITE_ALPHABET[randomInt(INVITE_ALPHABET.length)];
  }

  return code;
}
