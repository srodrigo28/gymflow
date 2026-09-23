# API do Gyn Flow

Servidor do app: contas, sincronização de treinos, desafios entre amigos e o painel com o total de cadastros (o gatilho dos 200 usuários).

Node 20.19+ · [Hono](https://hono.dev) · Prisma 7 · PostgreSQL · Vitest

## Rodar em desenvolvimento

```bash
cd server
npm install                               # também gera o cliente do Prisma
npx prisma dev --name gynflow --detach    # Postgres local, sem Docker (porta TCP 51214)
cp .env.example .env                      # a URL do banco local já está no exemplo
npm run db:migrate                        # aplica as migrações
npm run dev                               # http://localhost:3333
```

No app, o `.env.local` da raiz aponta para a API (`EXPO_PUBLIC_API_URL`, veja `../.env.example`). No emulador Android, `adb reverse tcp:3333 tcp:3333` faz o `127.0.0.1` do emulador chegar ao computador. No celular, use o IP do computador na rede Wi-Fi.

Para o banco local voltar depois de reiniciar o computador: `npx prisma dev start gynflow`.

## Testes

```bash
npm test          # 36 testes, contra o mesmo Postgres, no schema "test"
npm run typecheck
```

O schema `test` recebe as migrações antes da suíte e é esvaziado a cada teste. `TEST_DATABASE_URL` aponta os testes para outro banco.

## Rotas

| Método | Rota | O que faz |
| --- | --- | --- |
| `POST` | `/auth/sign-up` | Cria a conta e devolve `{ token, user }`. |
| `POST` | `/auth/sign-in` | Entra e devolve `{ token, user }`. |
| `POST` | `/auth/sign-out` | Encerra a sessão do token. |
| `GET` | `/me` | A pessoa da sessão. |
| `DELETE` | `/me` | Apaga a conta e tudo dela. Pede a senha. |
| `POST` | `/sync/workouts` | Recebe treinos da fila do app (até 50 por vez). |
| `GET` / `POST` | `/challenges` | Meus desafios / cria um desafio. |
| `POST` | `/challenges/join` | Entra num desafio pelo código do convite. |
| `GET` | `/challenges/:id` | Desafio com o placar (só participantes). |
| `DELETE` | `/challenges/:id/membership` | Sai do desafio. |
| `GET` | `/invites/:code` | Prévia pública do convite, para quem ainda não tem conta. |
| `GET` | `/c/:code` | Página do link do WhatsApp, com prévia e botão que abre o app. |
| `GET` | `/admin/metrics` | Cadastros, ativos e treinos da semana. Só administradores. |
| `GET` | `/health` | Servidor e banco no ar. |

Rotas autenticadas usam `Authorization: Bearer <token>`. Erros vêm como `{ error: { code, message } }`, com a mensagem pronta para a tela.

## Decisões

- **Senha** com scrypt do próprio Node (sem dependência nativa). **Token** opaco de 60 dias: o banco guarda só o hash, então vazar o banco não abre sessões.
- **E-mail inexistente e senha errada** respondem igual, no mesmo tempo, para não denunciar quem tem conta.
- **Limite de tentativas** em memória: login com 10 por e-mail a cada 15 minutos, cadastro com 10 por IP por hora. Serve para uma instância; com várias, a contagem precisa ir para o Redis ou o Postgres. Atrás de proxy, ligue `TRUST_PROXY`.
- **Administrador** é quem está em `ADMIN_EMAILS`, no cadastro ou no próximo login.
- **Treinos** sobem inteiros (exercícios e séries). A versão com a data de mudança mais nova vence, e um id que já pertence a outra conta é recusado.
- **Medidas e fotos não sobem.** São dados sensíveis pela LGPD e só podem ir para o servidor com consentimento específico, que ainda não existe no app.
- **Placar do desafio**: um ponto por dia com treino concluído e ao menos uma série feita, contado no fuso do desafio. Dois treinos no mesmo dia valem um ponto.
- **Quem cria o desafio** pode apagar a conta sem apagar o desafio dos outros.

## Produção

```bash
npm ci && npm run build
npm run db:deploy     # aplica migrações pendentes
npm start             # node dist/src/index.js
```

Variáveis em `.env.example`. `PUBLIC_URL` precisa ser o endereço público (https) do servidor: é ele que vai nos links de convite.
