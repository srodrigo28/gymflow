import { Hono } from 'hono';
import { z } from 'zod';

import { isUniqueViolation, prisma } from '../db.js';
import { HttpError, readJson } from '../lib/http.js';
import { hashPassword, verifyDecoy, verifyPassword } from '../lib/password.js';
import { isAdminEmail, publicUser, startSession } from '../lib/users.js';
import { requireAuth } from '../middleware/auth.js';
import type { AppEnv } from '../types.js';

const MINUTE = 60 * 1000;

// Mesmas regras e mensagens do formulário do app.
export const emailSchema = z
  .string('Informe seu e-mail.')
  .trim()
  .toLowerCase()
  .min(1, 'Informe seu e-mail.')
  .max(254, 'Informe um e-mail válido.')
  .pipe(z.email('Informe um e-mail válido.'));

const signUpSchema = z.object({
  email: emailSchema,
  name: z.string('Informe seu nome.').trim().min(2, 'Informe seu nome.').max(80, 'Use um nome com até 80 caracteres.'),
  password: z
    .string('Informe uma senha.')
    .min(6, 'A senha precisa ter pelo menos 6 caracteres.')
    .max(128, 'Use uma senha com até 128 caracteres.'),
});

const signInSchema = z.object({
  email: emailSchema,
  password: z.string('Informe sua senha.').min(1, 'Informe sua senha.').max(128, 'E-mail ou senha inválidos.'),
});

export const authRoutes = new Hono<AppEnv>()
  .post('/sign-up', async (c) => {
    c.get('limit')(`sign-up:${c.get('ip')}`, 10, 60 * MINUTE);
    const input = await readJson(c, signUpSchema);

    if (await prisma.user.findUnique({ select: { id: true }, where: { email: input.email } })) {
      throw new HttpError(409, 'EMAIL_IN_USE', 'Este e-mail já está em uso.');
    }

    let user;

    try {
      user = await prisma.user.create({
        data: {
          email: input.email,
          name: input.name,
          passwordHash: await hashPassword(input.password),
          role: isAdminEmail(input.email) ? 'ADMIN' : 'USER',
        },
      });
    } catch (error) {
      // Dois cadastros com o mesmo e-mail ao mesmo tempo: o banco decide.
      if (isUniqueViolation(error)) {
        throw new HttpError(409, 'EMAIL_IN_USE', 'Este e-mail já está em uso.');
      }

      throw error;
    }

    return c.json({ token: await startSession(user.id), user: publicUser(user) }, 201);
  })
  .post('/sign-in', async (c) => {
    const input = await readJson(c, signInSchema);
    c.get('limit')(`sign-in:ip:${c.get('ip')}`, 30, 15 * MINUTE);
    c.get('limit')(`sign-in:email:${input.email}`, 10, 15 * MINUTE);

    let user = await prisma.user.findUnique({ where: { email: input.email } });
    const valid = user ? await verifyPassword(input.password, user.passwordHash) : await verifyDecoy(input.password);

    if (!user || !valid) {
      throw new HttpError(401, 'INVALID_CREDENTIALS', 'E-mail ou senha inválidos.');
    }

    // Quem entrou para a lista de administradores depois do cadastro vira admin no próximo login.
    if (user.role !== 'ADMIN' && isAdminEmail(user.email)) {
      user = await prisma.user.update({ data: { role: 'ADMIN' }, where: { id: user.id } });
    }

    return c.json({ token: await startSession(user.id), user: publicUser(user) });
  })
  .post('/sign-out', requireAuth, async (c) => {
    await prisma.authSession.deleteMany({ where: { id: c.get('sessionId') } });

    return c.body(null, 204);
  });
