import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';

// scrypt do próprio Node: resistente a força bruta em GPU e sem dependência nativa.
const COST = 16384;
const BLOCK_SIZE = 8;
const PARALLELISM = 1;
const KEY_LENGTH = 64;
const MAX_MEMORY = 64 * 1024 * 1024;

function derive(password: string, salt: Buffer, keyLength: number, options: ScryptOptions) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password.normalize('NFKC'), salt, keyLength, { ...options, maxmem: MAX_MEMORY }, (error, key) =>
      error ? reject(error) : resolve(key),
    );
  });
}

// Formato: scrypt$N$r$p$sal$hash, para poder subir o custo no futuro sem invalidar senhas.
export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await derive(password, salt, KEY_LENGTH, { N: COST, p: PARALLELISM, r: BLOCK_SIZE });

  return ['scrypt', COST, BLOCK_SIZE, PARALLELISM, salt.toString('base64url'), key.toString('base64url')].join('$');
}

export async function verifyPassword(password: string, stored: string) {
  const [algorithm, cost, blockSize, parallelism, salt, hash] = stored.split('$');

  if (algorithm !== 'scrypt' || !cost || !blockSize || !parallelism || !salt || !hash) {
    return false;
  }

  const expected = Buffer.from(hash, 'base64url');
  const actual = await derive(password, Buffer.from(salt, 'base64url'), expected.length, {
    N: Number(cost),
    p: Number(parallelism),
    r: Number(blockSize),
  });

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

let decoy: Promise<string> | null = null;

// Quando o e-mail não existe, gasta o mesmo tempo de uma senha errada: o tempo de resposta
// não denuncia quais e-mails têm conta.
export async function verifyDecoy(password: string) {
  decoy ??= hashPassword('senha-que-nao-existe');
  await verifyPassword(password, await decoy);
  return false;
}
