import { describe, expect, it } from 'vitest';

import { prisma } from '../src/db.js';
import { client, newIp, workoutPayload } from './helpers.js';

describe('cadastro', () => {
  it('cria a conta e devolve token e pessoa, sem o hash da senha', async () => {
    const api = client();
    const response = await api.request('POST', '/auth/sign-up', {
      body: { email: '  Ana@GynFlow.TEST ', name: '  Ana Souza ', password: 'Treino2026' },
    });

    expect(response.status).toBe(201);
    expect(response.body.token).toMatch(/^[\w-]{40,}$/);
    expect(response.body.user).toEqual({
      email: 'ana@gynflow.test',
      id: expect.any(String),
      name: 'Ana Souza',
      role: 'user',
    });
    expect(JSON.stringify(response.body)).not.toContain('scrypt');

    const stored = await prisma.user.findUniqueOrThrow({ where: { email: 'ana@gynflow.test' } });
    expect(stored.passwordHash).toMatch(/^scrypt\$/);
    expect(stored.passwordHash).not.toContain('Treino2026');
  });

  it('recusa e-mail repetido, sem diferenciar maiúsculas', async () => {
    const api = client();
    await api.signUp('Ana', 'ana@gynflow.test');
    const response = await api.request('POST', '/auth/sign-up', {
      body: { email: 'ANA@gynflow.test', name: 'Outra Ana', password: 'Treino2026' },
    });

    expect(response.status).toBe(409);
    expect(response.body.error).toEqual({ code: 'EMAIL_IN_USE', message: 'Este e-mail já está em uso.' });
  });

  it('valida com as mesmas mensagens do formulário do app', async () => {
    const api = client();
    const cases = [
      [{ email: 'ana@gynflow.test', name: 'Ana', password: '123' }, 'A senha precisa ter pelo menos 6 caracteres.'],
      [{ email: 'ana@', name: 'Ana', password: 'Treino2026' }, 'Informe um e-mail válido.'],
      [{ email: 'ana@gynflow.test', name: ' ', password: 'Treino2026' }, 'Informe seu nome.'],
      [{ name: 'Ana', password: 'Treino2026' }, 'Informe seu e-mail.'],
    ] as const;

    for (const [body, message] of cases) {
      const response = await api.request('POST', '/auth/sign-up', { body });
      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe(message);
    }
  });

  it('recusa corpo que não é JSON', async () => {
    const response = await client().request('POST', '/auth/sign-up', { body: undefined });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_JSON');
  });

  it('dá papel de admin a quem está em ADMIN_EMAILS', async () => {
    const { user } = await client().signUp('Dona do App', 'admin@gynflow.test');

    expect(user.role).toBe('admin');
  });

  it('limita cadastros em série vindos do mesmo IP', async () => {
    const api = client();
    const ip = newIp();
    const statuses: number[] = [];

    for (let attempt = 0; attempt < 11; attempt += 1) {
      const response = await api.request('POST', '/auth/sign-up', {
        body: { email: `pessoa${attempt}@gynflow.test`, name: 'Pessoa', password: 'Treino2026' },
        ip,
      });
      statuses.push(response.status);
    }

    expect(statuses.slice(0, 10).every((status) => status === 201)).toBe(true);
    expect(statuses[10]).toBe(429);
  });
});

describe('login', () => {
  it('entra com a senha certa, com o e-mail em qualquer caixa', async () => {
    const api = client();
    const account = await api.signUp('Ana', 'ana@gynflow.test');
    const response = await api.request('POST', '/auth/sign-in', {
      body: { email: 'Ana@GynFlow.test', password: account.password },
    });

    expect(response.status).toBe(200);
    expect(response.body.user.id).toBe(account.user.id);
    expect(response.body.token).not.toBe(account.token);
  });

  it('responde igual para senha errada e para e-mail que não existe', async () => {
    const api = client();
    await api.signUp('Ana', 'ana@gynflow.test');
    const wrongPassword = await api.request('POST', '/auth/sign-in', {
      body: { email: 'ana@gynflow.test', password: 'errada123' },
    });
    const unknownEmail = await api.request('POST', '/auth/sign-in', {
      body: { email: 'ninguem@gynflow.test', password: 'errada123' },
    });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body).toEqual(unknownEmail.body);
    expect(wrongPassword.body.error.message).toBe('E-mail ou senha inválidos.');
  });

  it('bloqueia o e-mail depois de 10 tentativas, mesmo trocando de IP', async () => {
    const api = client();
    await api.signUp('Ana', 'ana@gynflow.test');
    const statuses: number[] = [];

    for (let attempt = 0; attempt < 11; attempt += 1) {
      const response = await api.request('POST', '/auth/sign-in', {
        body: { email: 'ana@gynflow.test', password: 'errada123' },
      });
      statuses.push(response.status);
    }

    expect(statuses.slice(0, 10).every((status) => status === 401)).toBe(true);
    expect(statuses[10]).toBe(429);
  });

  it('promove a admin no login quem entrou na lista depois do cadastro', async () => {
    const api = client();
    const account = await api.signUp('Dona', 'admin@gynflow.test');
    await prisma.user.update({ data: { role: 'USER' }, where: { id: account.user.id } });
    const response = await api.request('POST', '/auth/sign-in', {
      body: { email: 'admin@gynflow.test', password: account.password },
    });

    expect(response.body.user.role).toBe('admin');
  });
});

describe('sessão', () => {
  it('GET /me devolve a pessoa com token e 401 sem ele', async () => {
    const api = client();
    const account = await api.signUp('Ana');

    expect((await api.request('GET', '/me', { token: account.token })).body.user.id).toBe(account.user.id);

    const anonymous = await api.request('GET', '/me');
    expect(anonymous.status).toBe(401);
    expect(anonymous.body.error.message).toBe('Sua sessão expirou. Entre de novo.');
    expect((await api.request('GET', '/me', { token: 'token-inventado' })).status).toBe(401);
  });

  it('sair invalida só aquele token', async () => {
    const api = client();
    const account = await api.signUp('Ana', 'ana@gynflow.test');
    const other = await api.request('POST', '/auth/sign-in', {
      body: { email: account.email, password: account.password },
    });

    expect((await api.request('POST', '/auth/sign-out', { token: account.token })).status).toBe(204);
    expect((await api.request('GET', '/me', { token: account.token })).status).toBe(401);
    expect((await api.request('GET', '/me', { token: other.body.token })).status).toBe(200);
  });

  it('não aceita sessão vencida', async () => {
    const api = client();
    const account = await api.signUp('Ana');
    await prisma.authSession.updateMany({
      data: { expiresAt: new Date(Date.now() - 1000) },
      where: { userId: account.user.id },
    });

    expect((await api.request('GET', '/me', { token: account.token })).status).toBe(401);
  });
});

describe('apagar conta', () => {
  it('pede a senha e apaga a pessoa com os treinos', async () => {
    const api = client();
    const account = await api.signUp('Ana', 'ana@gynflow.test');
    await api.request('POST', '/sync/workouts', { body: { workouts: [workoutPayload()] }, token: account.token });

    const wrong = await api.request('DELETE', '/me', { body: { password: 'errada123' }, token: account.token });
    expect(wrong.status).toBe(401);
    expect(await prisma.user.count()).toBe(1);

    const deleted = await api.request('DELETE', '/me', { body: { password: account.password }, token: account.token });
    expect(deleted.status).toBe(204);
    expect(await prisma.user.count()).toBe(0);
    expect(await prisma.workout.count()).toBe(0);
    expect(await prisma.authSession.count()).toBe(0);

    const signIn = await api.request('POST', '/auth/sign-in', {
      body: { email: 'ana@gynflow.test', password: account.password },
    });
    expect(signIn.status).toBe(401);
  });
});

describe('infraestrutura', () => {
  it('responde /health com o banco no ar', async () => {
    const response = await client().request('GET', '/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });

  it('rota inexistente devolve 404 em JSON', async () => {
    const response = await client().request('GET', '/nada-aqui');

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });
});
