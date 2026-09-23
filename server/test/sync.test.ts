import { describe, expect, it } from 'vitest';

import { prisma } from '../src/db.js';
import { client, workoutPayload } from './helpers.js';

describe('sincronização de treinos', () => {
  it('sobe o treino com exercícios e séries', async () => {
    const api = client();
    const account = await api.signUp('Ana');
    const workout = workoutPayload({ note: 'Peito', sets: 3 });
    const response = await api.request('POST', '/sync/workouts', { body: { workouts: [workout] }, token: account.token });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ invalid: [], rejected: [], synced: [workout.id] });

    const stored = await prisma.workout.findUniqueOrThrow({
      include: { exercises: { include: { sets: true } } },
      where: { id: workout.id },
    });
    expect(stored.userId).toBe(account.user.id);
    expect(stored.note).toBe('Peito');
    expect(stored.startedAt.getTime()).toBe(workout.startedAt);
    expect(stored.exercises).toHaveLength(1);
    expect(stored.exercises[0]?.name).toBe('Supino reto');
    expect(stored.exercises[0]?.sets).toHaveLength(3);
  });

  it('reenviar o mesmo treino não duplica e troca as séries pelas novas', async () => {
    const api = client();
    const account = await api.signUp('Ana');
    const first = workoutPayload({ sets: 3, updatedAt: 1000 });
    await api.request('POST', '/sync/workouts', { body: { workouts: [first] }, token: account.token });

    const edited = workoutPayload({ id: first.id, sets: 1, startedAt: first.startedAt, updatedAt: 2000 });
    await api.request('POST', '/sync/workouts', { body: { workouts: [edited] }, token: account.token });

    expect(await prisma.workout.count()).toBe(1);
    expect(await prisma.workoutExercise.count()).toBe(1);
    expect(await prisma.workoutSet.count()).toBe(1);
  });

  it('mantém a versão mais nova quando chega uma mais antiga', async () => {
    const api = client();
    const account = await api.signUp('Ana');
    const newer = workoutPayload({ note: 'nova', updatedAt: 5000 });
    await api.request('POST', '/sync/workouts', { body: { workouts: [newer] }, token: account.token });

    const older = { ...workoutPayload({ note: 'antiga', updatedAt: 4000 }), id: newer.id };
    const response = await api.request('POST', '/sync/workouts', { body: { workouts: [older] }, token: account.token });

    expect(response.body.synced).toEqual([newer.id]);
    expect((await prisma.workout.findUniqueOrThrow({ where: { id: newer.id } })).note).toBe('nova');
  });

  it('treino apagado no aparelho fica marcado e perde as séries', async () => {
    const api = client();
    const account = await api.signUp('Ana');
    const workout = workoutPayload();
    await api.request('POST', '/sync/workouts', { body: { workouts: [workout] }, token: account.token });

    const response = await api.request('POST', '/sync/workouts', {
      body: { workouts: [{ deleted: true, id: workout.id }] },
      token: account.token,
    });

    expect(response.body.synced).toEqual([workout.id]);
    expect((await prisma.workout.findUniqueOrThrow({ where: { id: workout.id } })).deletedAt).not.toBeNull();
    expect(await prisma.workoutSet.count()).toBe(0);
  });

  it('apagar um treino que nunca subiu não dá erro', async () => {
    const api = client();
    const account = await api.signUp('Ana');
    const response = await api.request('POST', '/sync/workouts', {
      body: { workouts: [{ deleted: true, id: 'nunca-subiu' }] },
      token: account.token,
    });

    expect(response.body).toEqual({ invalid: [], rejected: [], synced: ['nunca-subiu'] });
  });

  it('uma conta não mexe no treino de outra com o mesmo id', async () => {
    const api = client();
    const ana = await api.signUp('Ana');
    const bruno = await api.signUp('Bruno');
    const workout = workoutPayload({ note: 'da Ana' });
    await api.request('POST', '/sync/workouts', { body: { workouts: [workout] }, token: ana.token });

    const attack = await api.request('POST', '/sync/workouts', {
      body: { workouts: [{ ...workoutPayload({ note: 'do Bruno', updatedAt: Date.now() + 60_000 }), id: workout.id }] },
      token: bruno.token,
    });
    const erase = await api.request('POST', '/sync/workouts', {
      body: { workouts: [{ deleted: true, id: workout.id }] },
      token: bruno.token,
    });

    expect(attack.body.rejected).toEqual([workout.id]);
    expect(erase.body.rejected).toEqual([workout.id]);
    const stored = await prisma.workout.findUniqueOrThrow({ where: { id: workout.id } });
    expect(stored.userId).toBe(ana.user.id);
    expect(stored.note).toBe('da Ana');
    expect(stored.deletedAt).toBeNull();
  });

  it('um treino fora do formato não trava os outros do mesmo envio', async () => {
    const api = client();
    const account = await api.signUp('Ana');
    const valid = workoutPayload();
    const typo = workoutPayload();
    typo.exercises[0]!.sets[0]!.weightKg = 6000;

    const response = await api.request('POST', '/sync/workouts', {
      body: { workouts: [typo, valid] },
      token: account.token,
    });

    expect(response.status).toBe(200);
    expect(response.body.synced).toEqual([valid.id]);
    expect(response.body.invalid).toEqual([{ id: typo.id, reason: expect.stringContaining('2000') }]);
    expect(await prisma.workout.count()).toBe(1);
  });

  it('exige login e recusa envio sem a lista de treinos', async () => {
    const api = client();
    const account = await api.signUp('Ana');

    expect((await api.request('POST', '/sync/workouts', { body: { workouts: [] } })).status).toBe(401);
    expect((await api.request('POST', '/sync/workouts', { body: { treinos: [] }, token: account.token })).status).toBe(
      400,
    );
  });
});
