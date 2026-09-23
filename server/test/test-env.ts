import { config } from 'dotenv';

config({ quiet: true });

// Os testes usam o mesmo Postgres do desenvolvimento, no schema "test", que é esvaziado
// a cada teste. TEST_DATABASE_URL permite apontar para outro banco.
export function testDatabaseUrl() {
  if (process.env.TEST_DATABASE_URL) {
    return process.env.TEST_DATABASE_URL;
  }

  if (!process.env.DATABASE_URL) {
    throw new Error('Defina DATABASE_URL (ou TEST_DATABASE_URL) no .env para rodar os testes.');
  }

  const url = new URL(process.env.DATABASE_URL);
  url.searchParams.set('schema', 'test');

  return url.toString();
}
