import { Hono } from 'hono';

import { prisma } from '../db.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import type { AppEnv } from '../types.js';

// Até 200 cadastros o app é 100% grátis (22-estrategia.md, seção 5.1). Este painel é o que
// torna o gatilho verificável.
const FREE_UNTIL_USERS = 200;
const WEEK = 7 * 24 * 60 * 60 * 1000;

export const adminRoutes = new Hono<AppEnv>()
  .use(requireAuth, requireAdmin)
  .get('/metrics', async (c) => {
    const weekAgo = new Date(Date.now() - WEEK);
    const [total, newThisWeek, activeThisWeek, workoutsThisWeek] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.user.count({ where: { lastSeenAt: { gte: weekAgo } } }),
      prisma.workout.count({ where: { deletedAt: null, finishedAt: { gte: weekAgo } } }),
    ]);

    return c.json({
      freeUntilUsers: FREE_UNTIL_USERS,
      generatedAt: new Date().toISOString(),
      users: { activeThisWeek, newThisWeek, total },
      workouts: { finishedThisWeek: workoutsThisWeek },
    });
  });
