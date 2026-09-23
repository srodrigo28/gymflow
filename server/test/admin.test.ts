import { describe, expect, it } from 'vitest';

import { prisma } from '../src/db.js';
import { client, workoutPayload } from './helpers.js';

const DAY = 24 * 60 * 60 * 1000;

describe('painel de administração', () => {
  it('mostra cadastros, ativos e treinos da semana para quem é admin', async () => {
    const api = client();
    const admin = await api.signUp('Dona', 'admin@gynflow.test');
    const ana = await api.signUp('Ana');
    const antigo = await api.signUp('Antigo');

    // Uma pessoa que se cadastrou e sumiu faz um mês.
    const monthAgo = new Date(Date.now() - 30 * DAY);
    await prisma.user.update({ data: { createdAt: monthAgo, lastSeenAt: monthAgo }, where: { id: antigo.user.id } });
    await api.request('POST', '/sync/workouts', { body: { workouts: [workoutPayload()] }, token: ana.token });

    const response = await api.request('GET', '/admin/metrics', { token: admin.token });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      freeUntilUsers: 200,
      users: { activeThisWeek: 2, newThisWeek: 2, total: 3 },
      workouts: { finishedThisWeek: 1 },
    });
  });

  it('recusa quem não é admin', async () => {
    const api = client();
    const ana = await api.signUp('Ana');
    const response = await api.request('GET', '/admin/metrics', { token: ana.token });

    expect(response.status).toBe(403);
    expect(response.body.error.message).toBe('Esta área é só para administradores.');
  });
});
