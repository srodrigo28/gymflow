import { Hono } from 'hono';

import { env } from '../env.js';
import { findInvite } from '../lib/challenges.js';
import { HttpError } from '../lib/http.js';
import type { AppEnv } from '../types.js';

const MINUTE = 60 * 1000;

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

type PageContent = { action?: { href: string; label: string }; body: string; code?: string; title: string };

function page({ action, body, code, title }: PageContent) {
  const safeTitle = escapeHtml(title);
  const safeBody = escapeHtml(body);

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${safeTitle} · Gyn Flow</title>
<meta property="og:title" content="${safeTitle}">
<meta property="og:description" content="${safeBody}">
<meta property="og:site_name" content="Gyn Flow">
<style>
  :root { color-scheme: dark; }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #151a23;
         color: #f3f6fb; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }
  main { max-width: 420px; padding: 32px 24px; text-align: center; }
  .brand { color: #34e0a1; font-weight: 800; letter-spacing: .02em; }
  h1 { font-size: 28px; line-height: 1.2; margin: 16px 0 12px; }
  p { color: #aab4c3; line-height: 1.5; margin: 0 0 24px; }
  a.button { display: inline-block; background: #34e0a1; color: #0d1219; font-weight: 700;
             text-decoration: none; padding: 16px 28px; border-radius: 14px; }
  .code { margin-top: 24px; font-size: 14px; color: #aab4c3; }
  .code strong { color: #f3f6fb; letter-spacing: .12em; }
</style>
</head>
<body>
<main>
  <div class="brand">Gyn Flow</div>
  <h1>${safeTitle}</h1>
  <p>${safeBody}</p>
  ${action ? `<a class="button" href="${escapeHtml(action.href)}">${escapeHtml(action.label)}</a>` : ''}
  ${code ? `<div class="code">Código do convite: <strong>${escapeHtml(code)}</strong></div>` : ''}
</main>
</body>
</html>`;
}

// Prévia em JSON, para a tela de convite do app. Pública: quem ainda não tem conta vê o
// desafio antes de decidir se cadastrar.
export const inviteRoutes = new Hono<AppEnv>().get('/:code', async (c) => {
  c.get('limit')(`invite:${c.get('ip')}`, 60, MINUTE);
  const invite = await findInvite(c.req.param('code'));

  if (!invite) {
    throw new HttpError(404, 'INVITE_NOT_FOUND', 'Convite não encontrado.');
  }

  return c.json({ invite });
});

// Página do link enviado pelo WhatsApp: título e descrição viram a prévia da conversa, e o
// botão abre o app direto no convite.
export const landingRoutes = new Hono<AppEnv>().get('/c/:code', async (c) => {
  c.get('limit')(`landing:${c.get('ip')}`, 60, MINUTE);
  const invite = await findInvite(c.req.param('code'));

  if (!invite) {
    return c.html(
      page({
        body: 'Confira se o link chegou inteiro ou peça um novo para quem te convidou.',
        title: 'Convite não encontrado',
      }),
      404,
    );
  }

  const who = invite.ownerFirstName ? `${invite.ownerFirstName} te chamou` : 'Você foi chamado';
  const body =
    invite.status === 'ended'
      ? 'Este desafio já terminou. Crie o seu no app e chame a turma.'
      : `${who} para treinar ${invite.days} dias no Gyn Flow. Cada dia com treino vale um ponto.`;

  return c.html(
    page({
      action:
        invite.status === 'ended'
          ? undefined
          : { href: `${env.APP_LINK_BASE}convite/${invite.code}`, label: 'Abrir no Gyn Flow' },
      body,
      code: invite.status === 'ended' ? undefined : invite.code,
      title: `Desafio: ${invite.name}`,
    }),
  );
});
