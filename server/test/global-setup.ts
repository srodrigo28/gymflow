import { execSync } from 'node:child_process';

import { testDatabaseUrl } from './test-env.js';

// Aplica as migrações no schema de teste antes de tudo.
export default function setup() {
  try {
    execSync('npx prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: testDatabaseUrl() },
      stdio: 'pipe',
    });
  } catch (error) {
    const { stderr, stdout } = error as { stderr?: Buffer; stdout?: Buffer };
    console.error(stdout?.toString(), stderr?.toString());
    throw new Error('Não foi possível preparar o banco de teste. O Postgres local está no ar? (npx prisma dev)');
  }
}
