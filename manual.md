# Manual do projeto Gyn Flow

Atualizado em 23/09/2026. Versão interativa, com filtros e busca: [manual.html](manual.html) (abra no navegador).

Onde o app e a API estão hoje: o que já funciona, o que está pela metade e o que falta, agrupado do jeito que o app se organiza.

## Resumo

| Área | Prontas | Parciais | A fazer | Andamento |
| --- | ---: | ---: | ---: | ---: |
| **App** (frontend em Expo) | 41 | 4 | 24 | **62%** |
| **API** (gymflow-api) | 20 | 1 | 9 | **68%** |
| **Geral**, escopo atual (Fases 1 a 3 e API) | 61 | 5 | 33 | **64%** |
| Plano completo, com as Fases 4 a 6 | 61 | 5 | 48 | 56% |

**Como ler:** cada função vale 1 ponto quando está pronta, meio ponto quando está parcial e zero quando falta; a porcentagem é a soma dividida pelo total listado. O número conta funções, não esforço: a Frase do dia pesa o mesmo que o registro de treino.

Legenda: ✅ pronto · 🟨 parcial · ⬜ a fazer.

## Linha do projeto

1. 🟨 **Fluxo inicial**: Etapas 0 a 12 prontas. A 13 (acessibilidade e desempenho) falta no iPhone.
2. 🟨 **Fase 1 · Registro de treino**: Pronta e sincronizando com a conta. Falta o check-in na academia.
3. 🟨 **Fase 2 · Corpo e fotos**: Medidas, fotos e comparador prontos. Falta o que pede consentimento e servidor.
4. 🟨 **Fase 3 · Social e desafios**: Card, desafios, convite e placar prontos. Faltam amigos e check-in com foto.
5. 🟨 **API · gymflow-api**: No ar em 99dev.pro/gymflow-api. Faltam backup agendado, monitoramento e envio de e-mail.
6. ⬜ **Fase 4 · Ranking e ligas**: XP, ligas semanais, categorias de ranking com DOTS e troféus.
7. ⬜ **Fase 5 · Personal e academia**: Vínculo por convite, painel do personal, prescrição e mural.
8. ⬜ **Fase 6 · Recomendação com IA**: Plano semanal com explicação, resumo do mês e custo por usuário.

## App (frontend)

### Primeiros passos · Fluxo inicial

63% · 7 prontas, 1 parcial, 4 a fazer

- ✅ **Splash animada com carregamento real** · Sessão, tema e fontes carregam enquanto a marca anima. · `app/(auth)/splash.tsx`
- ✅ **Boas-vindas com carrossel de três cenas** · `app/(auth)/welcome.tsx`
- ✅ **Login com foto no topo e formulário em folha** · `app/(auth)/login.tsx`
- ✅ **Cadastro no mesmo layout, com medidor de força da senha** · `app/(auth)/sign-up.tsx`
- ✅ **Teclado que acompanha a altura real** · O campo em foco fica sempre acima do teclado.
- ✅ **Rotas protegidas** · Sem sessão, a área logada não abre. · `app/_layout.tsx`
- ✅ **Quatro temas de cores e tela Aparência** · Flow, Meia-noite, Aurora e Brasa. · `app/(app)/appearance.tsx`
- 🟨 **Acessibilidade, movimento e desempenho** · Validado no Android e no web. Falta iPhone, VoiceOver e fonte grande.
- ⬜ **Tema claro "Dia"**
- ⬜ **Recuperação de senha** · O link avisa que chega em breve. Depende de a API mandar e-mail.
- ⬜ **Termos de Uso e Política de Privacidade** · O cadastro cita os dois, mas ainda não há link.
- ⬜ **Fotos definitivas do hero e do login** · As atuais vêm de mockups gerados.

### Conta e sessão · Conta

94% · 7 prontas, 1 parcial, 0 a fazer

- ✅ **Cadastro e login de verdade, pela API** · As mensagens de erro vêm do servidor. · `src/services/auth.ts`
- ✅ **Sessão conferida ao abrir, sem travar o app offline** · `src/contexts/session-context.tsx`
- ✅ **Sair da conta**
- ✅ **Banco local separado por conta** · Outra pessoa no mesmo celular não vê nem envia os treinos da anterior. · `src/db/client.ts`
- ✅ **Apagar a conta pelo app** · Pede a senha e confirma. Apaga também os treinos, medidas, fotos e respostas deste aparelho. · `app/(app)/perfil.tsx`
- 🟨 **Alterar perfil** · Nome, foto de capa e senha já mudam. Peso, altura e objetivo (as respostas do questionário) ainda não. · `app/(app)/perfil.tsx`
- ✅ **Trocar a senha** · Pede a senha atual; os outros aparelhos saem da conta. · `app/(app)/perfil.tsx`
- ✅ **Foto de capa salva** · Da galeria, recortada na proporção da capa. Fica só neste aparelho e sai junto quando a conta é apagada. · `src/services/profile-photo.ts`

### Onboarding · Pós-cadastro

80% · 4 prontas, 0 parciais, 1 a fazer

- ✅ **Onboarding de 23 etapas com validação** · `app/(onboarding)/start.tsx`
- ✅ **Painel do ponto de partida (peso, altura e IMC)**
- ✅ **Respostas guardadas no aparelho** · No SecureStore, porque há dados sensíveis (sono, humor, fumo).
- ✅ **Resumo da home a partir das respostas** · Fase da jornada, rotina e duração do treino.
- ⬜ **Levar o perfil para a conta, com consentimento** · Hoje fica só no aparelho, de propósito.

### Treino · Fase 1

73% · 8 prontas, 0 parciais, 3 a fazer

- ✅ **Registro de treino sem internet** · Séries, cronômetro e descanso de 90 s. · `app/(app)/treino/sessao.tsx`
- ✅ **Repetir a última série** · Copia a anterior ou a da última vez naquele exercício.
- ✅ **Biblioteca de 37 exercícios com busca por grupo** · `app/(app)/treino/exercicios.tsx`
- ✅ **Recorde automático** · Pela carga ou pela estimativa de uma repetição máxima.
- ✅ **Resumo da semana e "o que está faltando"** · `app/(app)/treino/index.tsx`
- ✅ **Histórico semanal e mensal por grupo muscular** · `app/(app)/treino/historico.tsx`
- ✅ **Limites de digitação** · Carga acima de 1000 kg fica vermelha e não é salva.
- ✅ **Treinos sobem sozinhos para a conta** · Ao entrar, ao voltar para o app e segundos depois de terminar. · `src/services/sync.ts`
- ⬜ **Check-in na academia**
- ⬜ **Restaurar os treinos num aparelho novo** · Precisa de a API devolver os treinos da conta.
- ⬜ **Comemoração de recorde com card na hora**

### Evolução do corpo · Fase 2

50% · 4 prontas, 0 parciais, 4 a fazer

- ✅ **Medidas com histórico** · Peso, gordura e cinco circunferências; só a data é obrigatória. · `app/(app)/corpo/medidas.tsx`
- ✅ **Gráfico de peso** · Com a variação desde a primeira pesagem. · `app/(app)/corpo/index.tsx`
- ✅ **Foto do mês por pose** · Copiada para a área privada do app. · `app/(app)/corpo/fotos.tsx`
- ✅ **Comparador antes e depois** · `app/(app)/corpo/comparar.tsx`
- ⬜ **Guia de contorno na câmera**
- ⬜ **Consentimento e backup de medidas e fotos na conta** · Dados sensíveis pela LGPD.
- ⬜ **Tarja e revogação ao compartilhar fotos**
- ⬜ **Health Connect e Apple Health**

### Social e desafios · Fase 3

63% · 5 prontas, 0 parciais, 3 a fazer

- ✅ **Card compartilhável de recorde e da semana** · `app/(app)/compartilhar.tsx`
- ✅ **Criar desafio e convidar pelo WhatsApp** · 7, 14 ou 30 dias. · `app/(app)/desafios/novo.tsx`
- ✅ **Placar do desafio** · Um ponto por dia com treino concluído. · `app/(app)/desafios/[id].tsx`
- ✅ **Entrar pelo link ou pelo código, mesmo sem conta** · O cadastro pelo convite volta direto para ele. · `app/convite/[code].tsx`
- ✅ **Sair do desafio**
- ⬜ **Amigos**
- ⬜ **Check-in com foto no desafio**
- ⬜ **Cards de sequência e retrospectiva do mês**

### Home e menu do perfil · Perfil

42% · 5 prontas, 0 parciais, 7 a fazer

- ✅ **Nome e resumo reais de quem entrou** · `app/(app)/home.tsx`
- ✅ **Menu com Treino, Evolução, Desafios e Aparência**
- ✅ **Painel de administração** · Só para quem está em ADMIN_EMAILS: cadastros contra a meta de 200. · `app/(app)/admin.tsx`
- ⬜ **Sincronizar dispositivos**
- ⬜ **Alimentações diárias**
- ⬜ **Alimentação ideal para escolher**
- ⬜ **Escolhas de treinos** · Local, categorias, grupos, equipamentos e exercícios preferidos (menu-profile.md).
- ⬜ **Recomendações**
- ⬜ **Conquistas**
- ⬜ **Frase do dia**
- ✅ **Atalho do topo leva ao Treino** · A tela "dashboard" com exercícios fixos no código saiu. · `app/(app)/home.tsx`
- ✅ **Cartão da Evolução com dado real** · Mostra quanto o peso mudou desde o início (ou quantas medições há) e abre a Evolução. · `app/(app)/home.tsx`

### Plataformas e loja · Publicação

40% · 1 pronta, 2 parciais, 2 a fazer

- ✅ **Android** · Testado no emulador com o Expo Go.
- 🟨 **Web** · As telas de entrada funcionam. O treino usa SQLite, que não roda no servidor web de desenvolvimento.
- ⬜ **iPhone**
- ⬜ **Build de loja (EAS)**
- 🟨 **App apontando para a API publicada** · expo.extra.apiUrl = https://99dev.pro/gymflow-api. Falta testar o app contra a produção. · `app.json`

## API (gymflow-api)

### Contas · API

80% · 8 prontas, 0 parciais, 2 a fazer

- ✅ **Cadastro, login e saída** · `POST /auth/sign-up · /auth/sign-in · /auth/sign-out`
- ✅ **Token de sessão de 60 dias, só o hash no banco**
- ✅ **Senha com scrypt e a mesma resposta para e-mail ou senha errados**
- ✅ **Limite de tentativas de login e cadastro**
- ✅ **Limite de chutes de senha para quem tem o token** · Troca de senha e exclusão da conta somam 10 tentativas a cada 15 minutos.
- ✅ **Apagar a conta com a senha, em cascata** · `DELETE /me`
- ✅ **Administrador por lista de e-mails** · `ADMIN_EMAILS`
- ⬜ **Recuperação de senha por e-mail** · Precisa de um serviço de envio de e-mail.
- ⬜ **Confirmação de e-mail**
- ✅ **Alterar nome e senha** · A troca de senha encerra as outras sessões da conta. · `PATCH /me · PUT /me/password`

### Sincronização · API

60% · 3 prontas, 0 parciais, 2 a fazer

- ✅ **Receber os treinos da fila do app** · Lotes de até 50. · `POST /sync/workouts`
- ✅ **Versão mais nova vence; id de outra conta é recusado**
- ✅ **Validação treino a treino** · Um registro ruim volta como inválido e não trava os outros.
- ⬜ **Devolver os treinos da conta** · Para restaurar num aparelho novo.
- ⬜ **Medidas e fotos com consentimento** · Fotos em armazenamento privado, com URL assinada.

### Desafios · API

63% · 5 prontas, 0 parciais, 3 a fazer

- ✅ **Criar, listar, detalhar e sair** · `/challenges`
- ✅ **Entrar pelo código do convite** · `POST /challenges/join`
- ✅ **Placar por dias com treino, no fuso do desafio**
- ✅ **Prévia pública do convite** · `GET /invites/:code`
- ✅ **Página do link do WhatsApp** · Prévia na conversa e botão que abre o app. · `GET /c/:code`
- ⬜ **Amigos**
- ⬜ **Check-in com foto**
- ⬜ **Notificações de lembrete e de placar** · Pede também o envio de notificações no app.

### Administração · API

100% · 1 pronta, 0 parciais, 0 a fazer

- ✅ **Métricas da semana** · Cadastros, ativos e treinos concluídos. · `GET /admin/metrics`

### Qualidade e publicação · API

58% · 3 prontas, 1 parcial, 2 a fazer

- ✅ **44 testes automáticos contra um Postgres de verdade** · `npm test`
- ✅ **Docker Compose com Postgres, migrações e Caddy (HTTPS)** · Testado localmente; o certificado só sai com o domínio real.
- 🟨 **CI no GitHub** · O repositório já está no GitHub (privado). Falta conferir as execuções na aba Actions. · `.github/workflows/ci.yml`
- ✅ **Publicar na VPS** · Painel 99dev, em https://99dev.pro/gymflow-api. Confira se o painel sonda /health (HEALTHCHECK_PATH), e não /healthz.
- ⬜ **Backup automático do banco** · O comando está no README; falta agendar.
- ⬜ **Monitoramento e alertas**

## Próximas fases

### Ranking, ligas e premiação · Fase 4

0% · 0 prontas, 0 parciais, 5 a fazer

- ⬜ **XP e pontuação**
- ⬜ **Ligas semanais e temporada mensal**
- ⬜ **Categorias de ranking com força relativa (DOTS)**
- ⬜ **Check-in verificado**
- ⬜ **Troféus e selos**

### Personal e academia · Fase 5

0% · 0 prontas, 0 parciais, 5 a fazer

- ⬜ **Vínculo por convite, com permissões**
- ⬜ **Painel do personal**
- ⬜ **Prescrição de treino**
- ⬜ **Página do profissional**
- ⬜ **Mural da academia**

### Recomendação com IA · Fase 6

0% · 0 prontas, 0 parciais, 5 a fazer

- ⬜ **Plano semanal gerado por IA, com explicação**
- ⬜ **Resumo do mês**
- ⬜ **Leitura das medidas**
- ⬜ **Regras de segurança por cima da IA**
- ⬜ **Custo medido por usuário**

## Como rodar

**App** (`D:\dev\gymflow`)

```bash
npm install
npx expo start --port 8097
```

A porta 8090 está ocupada neste computador. O .env.local aponta para a API (EXPO_PUBLIC_API_URL); no emulador, rode adb reverse tcp:3333 tcp:3333.

**API** (`D:\dev\gymflow-api`)

```bash
npm install
npx prisma dev start gynflow
npm run dev
npm test
```

Na primeira vez, o banco local sobe com npx prisma dev --name gynflow --detach. A produção sai pelo painel 99dev (guia 23-setembro-guia-deploy-api.md).

## Onde está cada coisa

- **App (Expo):** `D:\dev\gymflow`
- **API (repositório próprio):** `D:\dev\gymflow-api`
- **Estratégia e registro das fases:** `22-estrategia.md`
- **Fluxo de entrada, temas e marca:** `22-setembro-fluxo-inicial.md`
- **API publicada:** <https://99dev.pro/gymflow-api>
- **Saúde da API e do banco:** <https://99dev.pro/gymflow-api/health>
- **Código da API:** <https://github.com/srodrigo28/gymflow-api>
- **Publicação no painel 99dev:** `gymflow-api/23-setembro-guia-deploy-api.md`
