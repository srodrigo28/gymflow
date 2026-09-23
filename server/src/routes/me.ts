import { Hono } from 'hono';
import { z } from 'zod';

import { prisma } from '../db.js';
import { HttpError, readJson } from '../lib/http.js';
import { verifyPassword } from '../lib/password.js';
import { publicUser } from '../lib/users.js';
import { requireAuth } from '../middleware/auth.js';
import type { AppEnv } from '../types.js';

const deleteSchema = z.object({
  password: z.string('Confirme sua senha.').min(1, 'Confirme sua senha.').max(128),
});

export const meRoutes = new Hono<AppEnv>()
  .use(requireAuth)
  .get('/', (c) => c.json({ user: publicUser(c.get('user')) }))
  // Direito de apagar a conta (LGPD). Pede a senha para um token vazado não conseguir
  // apagar tudo. Treinos, sessões e participações saem juntos, em cascata.
  .delete('/', async (c) => {
    const { password } = await readJson(c, deleteSchema);
    const user = c.get('user');

    if (!(await verifyPassword(password, user.passwordHash))) {
      throw new HttpError(401, 'INVALID_CREDENTIALS', 'Senha incorreta.');
    }

    await prisma.user.delete({ where: { id: user.id } });

    return c.body(null, 204);
  });
