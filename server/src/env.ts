import { config } from 'dotenv';
import { z } from 'zod';

// Variáveis já definidas (no provedor ou nos testes) valem mais que o .env.
config({ quiet: true });

const list = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().default(3333),
  PUBLIC_URL: z
    .string()
    .default('http://localhost:3333')
    .transform((value) => value.replace(/\/+$/, '')),
  APP_LINK_BASE: z.string().default('gymflow://'),
  ADMIN_EMAILS: z
    .string()
    .default('')
    .transform((value) => list(value).map((email) => email.toLowerCase())),
  CORS_ORIGINS: z.string().default('').transform(list),
  TRUST_PROXY: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error(`Configuração inválida no .env:\n${z.prettifyError(parsed.error)}`);
  process.exit(1);
}

export const env = parsed.data;
