import { afterAll, beforeEach } from 'vitest';

import { testDatabaseUrl } from './test-env.js';

process.env.DATABASE_URL = testDatabaseUrl();
process.env.NODE_ENV = 'test';
process.env.ADMIN_EMAILS = 'admin@gynflow.test';
process.env.PUBLIC_URL = 'https://api.gynflow.test';
process.env.APP_LINK_BASE = 'gymflow://';
// Cada requisição dos testes chega com um IP diferente (X-Forwarded-For), para o limite de
// tentativas só agir onde o teste quer.
process.env.TRUST_PROXY = 'true';

// Importado só depois das variáveis acima: o módulo lê o ambiente ao carregar.
const { prisma, table } = await import('../src/db.js');

const tables = [
  'users',
  'auth_sessions',
  'workouts',
  'workout_exercises',
  'workout_sets',
  'challenges',
  'challenge_members',
];

beforeEach(async () => {
  await prisma.$executeRawUnsafe(`TRUNCATE ${tables.map(table).join(', ')} CASCADE`);
});

afterAll(async () => {
  await prisma.$disconnect();
});
