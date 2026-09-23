import { describe, expect, it } from 'vitest';

import { prisma } from '../src/db.js';
import { client, saoPauloMidnight, workoutPayload } from './helpers.js';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

async function createChallenge(api: ReturnType<typeof client>, token: string, name = 'Setembro sem falta') {
  const response = await api.request('POST', '/challenges', {
    body: { days: 30, name, startsAt: Date.now(), timezone: 'America/Sao_Paulo' },
    token,
  });

  expect(response.status).toBe(201);
  return response.body.challenge;
}

describe('desafios', () => {
  it('cria o desafio com quem criou dentro e o link de convite', async () => {
    const api = client();
    const ana = await api.signUp('Ana Souza');
    const challenge = await createChallenge(api, ana.token);

    expect(challenge).toMatchObject({
      days: 30,
      isOwner: true,
      memberCount: 1,
      myPoints: 0,
      myRank: 1,
      name: 'Setembro sem falta',
      status: 'active',
      timezone: 'America/Sao_Paulo',
    });
    expect(challenge.inviteCode).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
    expect(challenge.inviteUrl).toBe(`https://api.gynflow.test/c/${challenge.inviteCode}`);
  });

  it('valida nome, duração e início', async () => {
    const api = client();
    const ana = await api.signUp('Ana');
    const cases = [
      [{ days: 30, name: 'x' }, 'Dê um nome ao desafio.'],
      [{ days: 10, name: 'Desafio' }, 'Escolha 7, 14 ou 30 dias.'],
      [{ days: 7, name: 'Desafio', startsAt: Date.now() + 10 * DAY }, 'O desafio precisa começar hoje ou amanhã.'],
    ] as const;

    for (const [body, message] of cases) {
      const response = await api.request('POST', '/challenges', { body, token: ana.token });
      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe(message);
    }
  });

  it('prévia pública do convite mostra só o primeiro nome de quem criou', async () => {
    const api = client();
    const ana = await api.signUp('Ana Souza');
    const challenge = await createChallenge(api, ana.token);
    const preview = await api.request('GET', `/invites/${challenge.inviteCode.toLowerCase()}`);

    expect(preview.status).toBe(200);
    expect(preview.body.invite).toMatchObject({
      code: challenge.inviteCode,
      days: 30,
      memberCount: 1,
      name: 'Setembro sem falta',
      ownerFirstName: 'Ana',
      status: 'active',
    });
    expect(JSON.stringify(preview.body)).not.toContain('Souza');
    expect((await api.request('GET', '/invites/NAOEXISTE')).status).toBe(404);
  });

  it('entrar pelo código é idempotente e aparece na lista de quem entrou', async () => {
    const api = client();
    const ana = await api.signUp('Ana');
    const bruno = await api.signUp('Bruno');
    const challenge = await createChallenge(api, ana.token);

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const joined = await api.request('POST', '/challenges/join', {
        body: { code: challenge.inviteCode.toLowerCase() },
        token: bruno.token,
      });
      expect(joined.body).toEqual({ challengeId: challenge.id });
    }

    const list = await api.request('GET', '/challenges', { token: bruno.token });
    expect(list.body.challenges).toHaveLength(1);
    expect(list.body.challenges[0]).toMatchObject({ id: challenge.id, isOwner: false, memberCount: 2 });
  });

  it('código errado e desafio encerrado dão mensagens claras', async () => {
    const api = client();
    const ana = await api.signUp('Ana');
    const bruno = await api.signUp('Bruno');
    const challenge = await createChallenge(api, ana.token);

    const unknown = await api.request('POST', '/challenges/join', { body: { code: 'ZZZZZZZZ' }, token: bruno.token });
    expect(unknown.status).toBe(404);
    expect(unknown.body.error.message).toBe('Convite não encontrado. Confira o código.');

    await prisma.challenge.update({
      data: { endsAt: new Date(Date.now() - HOUR), startsAt: new Date(Date.now() - 8 * DAY) },
      where: { id: challenge.id },
    });
    const ended = await api.request('POST', '/challenges/join', { body: { code: challenge.inviteCode }, token: bruno.token });
    expect(ended.status).toBe(410);
    expect(ended.body.error.message).toBe('Este desafio já terminou.');
  });

  it('placar: um ponto por dia com treino, no fuso do desafio, só no período e com série feita', async () => {
    const api = client();
    const ana = await api.signUp('Ana');
    const bruno = await api.signUp('Bruno');
    const challenge = await createChallenge(api, ana.token);
    await api.request('POST', '/challenges/join', { body: { code: challenge.inviteCode }, token: bruno.token });

    // Período fixo: começa à meia-noite de São Paulo de 5 dias atrás.
    const start = saoPauloMidnight(5);
    await prisma.challenge.update({
      data: { endsAt: new Date(start + 30 * DAY), startsAt: new Date(start) },
      where: { id: challenge.id },
    });

    const anaWorkouts = [
      // Dia 1, 23h30 em São Paulo (já é dia 2 em UTC): conta como dia 1.
      workoutPayload({ startedAt: start + DAY + 23.5 * HOUR }),
      // Dia 2, 9h e 18h: dois treinos no mesmo dia valem um ponto.
      workoutPayload({ startedAt: start + 2 * DAY + 9 * HOUR }),
      workoutPayload({ startedAt: start + 2 * DAY + 18 * HOUR }),
    ];
    const brunoWorkouts = [
      // Antes do início.
      workoutPayload({ startedAt: start - 2 * HOUR }),
      // Sem nenhuma série concluída.
      workoutPayload({ done: false, startedAt: start + DAY + 10 * HOUR }),
      // Ainda em andamento.
      workoutPayload({ finishedAt: null, startedAt: start + 2 * DAY + 10 * HOUR }),
    ];
    await api.request('POST', '/sync/workouts', { body: { workouts: anaWorkouts }, token: ana.token });
    await api.request('POST', '/sync/workouts', { body: { workouts: brunoWorkouts }, token: bruno.token });

    const detail = await api.request('GET', `/challenges/${challenge.id}`, { token: bruno.token });

    expect(detail.status).toBe(200);
    expect(detail.body.leaderboard).toEqual([
      { isMe: false, name: 'Ana', points: 2, rank: 1, userId: ana.user.id },
      { isMe: true, name: 'Bruno', points: 0, rank: 2, userId: bruno.user.id },
    ]);
  });

  it('empate divide a posição e treino apagado deixa de contar', async () => {
    const api = client();
    const ana = await api.signUp('Ana');
    const bruno = await api.signUp('Bruno');
    const challenge = await createChallenge(api, ana.token);
    await api.request('POST', '/challenges/join', { body: { code: challenge.inviteCode }, token: bruno.token });

    const start = saoPauloMidnight(3);
    await prisma.challenge.update({
      data: { endsAt: new Date(start + 7 * DAY), startsAt: new Date(start) },
      where: { id: challenge.id },
    });

    const anaWorkout = workoutPayload({ startedAt: start + 10 * HOUR });
    await api.request('POST', '/sync/workouts', { body: { workouts: [anaWorkout] }, token: ana.token });
    await api.request('POST', '/sync/workouts', {
      body: { workouts: [workoutPayload({ startedAt: start + DAY + 10 * HOUR })] },
      token: bruno.token,
    });

    const tied = await api.request('GET', `/challenges/${challenge.id}`, { token: ana.token });
    expect(tied.body.leaderboard.map((row: { rank: number }) => row.rank)).toEqual([1, 1]);

    await api.request('POST', '/sync/workouts', { body: { workouts: [{ deleted: true, id: anaWorkout.id }] }, token: ana.token });
    const after = await api.request('GET', `/challenges/${challenge.id}`, { token: ana.token });
    expect(after.body.leaderboard.map((row: { name: string; points: number }) => [row.name, row.points])).toEqual([
      ['Bruno', 1],
      ['Ana', 0],
    ]);
  });

  it('só quem participa vê o placar, e sair tira a pessoa dele', async () => {
    const api = client();
    const ana = await api.signUp('Ana');
    const bruno = await api.signUp('Bruno');
    const carla = await api.signUp('Carla');
    const challenge = await createChallenge(api, ana.token);
    await api.request('POST', '/challenges/join', { body: { code: challenge.inviteCode }, token: bruno.token });

    expect((await api.request('GET', `/challenges/${challenge.id}`, { token: carla.token })).status).toBe(404);

    expect((await api.request('DELETE', `/challenges/${challenge.id}/membership`, { token: bruno.token })).status).toBe(204);
    const detail = await api.request('GET', `/challenges/${challenge.id}`, { token: ana.token });
    expect(detail.body.leaderboard).toHaveLength(1);
    expect((await api.request('GET', `/challenges/${challenge.id}`, { token: bruno.token })).status).toBe(404);
  });

  it('o desafio continua para os outros quando quem criou apaga a conta', async () => {
    const api = client();
    const ana = await api.signUp('Ana');
    const bruno = await api.signUp('Bruno');
    const challenge = await createChallenge(api, ana.token);
    await api.request('POST', '/challenges/join', { body: { code: challenge.inviteCode }, token: bruno.token });

    await api.request('DELETE', '/me', { body: { password: ana.password }, token: ana.token });

    const detail = await api.request('GET', `/challenges/${challenge.id}`, { token: bruno.token });
    expect(detail.status).toBe(200);
    expect(detail.body.leaderboard).toHaveLength(1);
    expect(detail.body.challenge.isOwner).toBe(false);
  });
});

describe('página do convite', () => {
  it('traz a prévia para o WhatsApp e o link que abre o app, com o nome escapado', async () => {
    const api = client();
    const ana = await api.signUp('Ana Souza');
    const challenge = await createChallenge(api, ana.token, '<script>alert(1)</script>');
    const response = await api.request('GET', `/c/${challenge.inviteCode}`);

    expect(response.status).toBe(200);
    expect(response.body).toContain('<meta property="og:title" content="Desafio: &lt;script&gt;alert(1)&lt;/script&gt;">');
    expect(response.body).toContain('Ana te chamou para treinar 30 dias');
    expect(response.body).toContain(`href="gymflow://convite/${challenge.inviteCode}"`);
    expect(response.body).not.toContain('<script>alert(1)');
  });

  it('link desconhecido mostra uma página de convite não encontrado', async () => {
    const response = await client().request('GET', '/c/NAOEXISTE');

    expect(response.status).toBe(404);
    expect(response.body).toContain('Convite não encontrado');
  });
});
