import { PrismaPg } from '@prisma/adapter-pg';

import { Prisma, PrismaClient } from '../generated/prisma/client.js';
import { env } from './env.js';

// O schema do Postgres vem da própria URL (?schema=...), como no Prisma CLI. Os testes
// usam o mesmo banco com outro schema.
function schemaOf(url: string) {
  try {
    return new URL(url).searchParams.get('schema') ?? 'public';
  } catch {
    return 'public';
  }
}

export const dbSchema = schemaOf(env.DATABASE_URL);

if (!/^[a-z_][a-z0-9_]*$/i.test(dbSchema)) {
  throw new Error(`Schema inválido na DATABASE_URL: ${dbSchema}`);
}

export const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: env.DATABASE_URL }, { schema: dbSchema }),
});

// Nome qualificado para SQL escrito à mão (o adaptador só qualifica as consultas do Prisma).
export function table(name: string) {
  return `"${dbSchema}"."${name}"`;
}

export function isUniqueViolation(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}
