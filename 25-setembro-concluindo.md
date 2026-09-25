# 25 de setembro: concluindo o projeto

25/09/2026 · o prompt do dia, com o que falta, na ordem, e o que fica pronto quando ele termina.

Ontem à noite o app estava em 90%, a API em 92% e o plano completo em 84%. O que falta se divide em dois grupos: o que **só depende de código** (o resto da Fase 4, fotos na conta, check-in com foto, a Fase 5 e a Fase 6) e o que **só você destrava** (SMTP, fotos definitivas, celular, iPhone, loja). Este documento fecha o primeiro grupo hoje e deixa o segundo numa lista curta, com o passo exato de cada item.

**"Concluído" aqui quer dizer:** todas as fases do plano construídas, testadas e publicadas; manual e estratégia em dia; os dois repositórios commitados e enviados; e a lista do que depende de você reduzida a configuração na VPS e aparelhos.

---

## Como usar

1. Leia **Decisões de hoje** e mude o que não concorda. É o único trecho para editar antes de rodar.
2. Cole o **Prompt do dia** no Claude Code, aberto em `D:\dev\gynflow`.
3. Enquanto ele roda, faça a sua parte: **O que só você destrava**.
4. No fim, confira **Como saber que terminou**.

## Legenda de status

| Ícone | Significado |
| --- | --- |
| ⬜ | A fazer |
| 🟨 | Parcial |
| ✅ | Concluído |
| ⏸️ | Aguardando você |

## Painel do dia

| # | Bloco | Status | Tempo previsto | Depende de |
| --- | --- | --- | --- | --- |
| 0 | Abertura: portões verdes, commit do que ficou de 24/09, emulador no ar | ✅ | 30 min | (nada) |
| 1 | Fase 4 completa: pontualidade, modalidade, equilíbrio, escudos | ✅ | 2 h | 0 |
| 2 | Fotos na conta e check-in com foto (fecha a Fase 3 e o que a Fase 2 pode fechar) | ✅ | 2 h | 0, D1 |
| 3 | Fase 5: personal e academia (inclui o ranking e o mural da academia) | ✅ | 3 h | 1 |
| 4 | Fase 6: recomendação com IA | ✅ | 2 h | 1, D2 |
| 5 | Fechamento: manual, estratégia, READMEs, publicação e conferência | ✅ | 1 h | todos |
| 6 | O que só você destrava | ⏸️ | (você) | (você) |

> O bloco 5 atualiza este painel com o que foi feito de verdade.

**Fechamento (25/09, tarde).** Os blocos 0 a 5 rodaram como estavam escritos, com as decisões D1 a D9.

| Área | Prontas | Parciais | A fazer | Andamento |
| --- | ---: | ---: | ---: | ---: |
| App | 85 | 2 | 4 | 95% |
| API | 59 | 0 | 2 | 97% |
| Geral (Fases 1 a 6) | 144 | 2 | 6 | 95% |

- **API**: 138 testes, publicada a cada bloco e marcada com a tag `v2026.09.25`. Fotos e IA respondem 503 em
  produção até os itens 2 e 3 da lista abaixo.
- **App**: commits por frente (catálogo e agenda, diário e escudos, fotos, check-in com foto, personal e
  academia, IA, documentação) e push para `srodrigo28/gymflow`.
- **Validação**: cada bloco no emulador contra a API local e uma rodada final do app contra a produção, com
  contas temporárias apagadas no fim. O que o emulador exercitou e o que não exercitou está em
  **Registro da conclusão (25/09)**, no fim de `22-estrategia.md`.
- **Tarde**: as quatro pontas de código do registro foram fechadas no app (alvos da IA na sessão, plano da IA
  sem internet, consentimento conferido de novo e academia da conta num aparelho novo), e o emulador passou
  pelo que faltava: fotos num aparelho novo, ocultar por dois participantes, prescrever e publicar aviso.
- **Fim da tarde**: revisão de segurança da API (duas falhas médias e quatro baixas, corrigidas e conferidas em
  produção), a carga sugerida pela IA limitada também pelas repetições e as métricas da seção 6 no painel, com
  o custo da IA. A API foi publicada com 142 testes e a tag `v2026.09.25-2`.
- **Noite**: a versão web passou a funcionar no navegador, no desenvolvimento e no build de produção: o banco local
  em WebAssembly, as confirmações, os compartilhamentos e as fotos guardadas no próprio navegador. Publicar o web é um
  passo seu (próximos passos do manual).
- **Tudo o que está "a fazer" no manual depende de você**: é a lista abaixo.

---

## Onde estamos (25/09, manhã)

| Área | Prontas | Parciais | A fazer | Andamento |
| --- | ---: | ---: | ---: | ---: |
| App | 67 | 3 | 6 | 90% |
| API | 40 | 1 | 3 | 92% |
| Plano completo (Fases 1 a 6) | 107 | 4 | 19 | 84% |

- **API** publicada até o commit `3965b1f` (Fase 4), com 105 testes. Rotina de hora em hora na VPS fecha ligas e temporada e manda os avisos. Backup às 03:15 e sonda a cada 5 minutos.
- **App** com o último commit `75a95cd`. Tudo de 24/09 está **sem commit**: Perfil, medidas na conta, aceleração (sincronizar, alimentação, preferências, recomendações, conquistas, frase), telas da Fase 4 e o manual movido para a raiz do workspace. O bloco 0 resolve isso antes de qualquer mudança nova.
- **Fase 4**: em `gymflow-api/src/lib/season.ts` as três categorias que faltam estão na lista `UNAVAILABLE`, cada uma com o motivo (agenda, modalidades no catálogo, diário de sono, água e humor). Escudos da sequência e ranking da academia também faltam.
- **Catálogo**: 37 exercícios, com `kind` `forca` (32) ou `cardio` (5). As preferências de treino já têm as categorias musculação, cardio, funcional, mobilidade e alongamento, mas o catálogo não tem exercícios delas.
- **Já existe e ajuda hoje**: a Alimentação registra água no aparelho; o questionário pergunta sono e humor uma vez; o consentimento por dado (medidas, questionário) e a fila de sincronização são o padrão a copiar; a câmera da Fase 2 serve para o check-in com foto; a página pública `/c/:code` é o modelo para a página do profissional.
- **Manual**: o item "84 testes automáticos" está desatualizado (são 105). O bloco 5 corrige.

---

## Decisões de hoje (edite antes de rodar)

O prompt assume estas decisões. Mude a coluna "Padrão adotado" onde discordar; o registro na estratégia vai marcá-las para você revisar de novo.

| # | Decisão | Padrão adotado | Por quê | Alternativa |
| --- | --- | --- | --- | --- |
| D1 | **Onde guardar fotos** | No disco da VPS, numa pasta montada como volume do painel (`DEPLOY_VOLUMES`), privada, servida só pela API com URL assinada de 10 minutos. Miniatura e reencode no servidor (sem EXIF, e portanto sem GPS). Módulo `storage` com driver `disk`, para trocar por S3 ou R2 depois sem mexer nas rotas. O backup diário passa a incluir a pasta. | Não cria conta nova nem custo hoje, e o painel já sabe montar volume. Trocar de driver depois é uma classe. | Cloudflare R2 (sem custo de saída) ou S3. Precisa de conta, chaves e mais uma variável. |
| D2 | **IA** | Claude pela API da Anthropic, SDK `@anthropic-ai/sdk`, modelo `claude-opus-5`. Chave em `ANTHROPIC_API_KEY` no `.env.deploy`. Sem chave, as rotas de IA respondem 503 e o app fica só com o Estágio 1 (regras), que já existe. Consentimento próprio "Recomendações com IA". Teto de US$ 0,20 por usuário ativo por mês, medido em tabela. | É o que a seção 2.5 da estratégia já previa, com o custo calculado. A chave é sua: sem ela nada quebra. | Trocar o modelo por `claude-sonnet-5` se a medição mostrar custo alto e qualidade parecida. Medir antes de trocar. |
| D3 | **Commit e publicação** | App: commit por frente ao fim de cada bloco e push para `srodrigo28/gymflow` no bloco 5. API: `salvek99` ao fim de cada bloco com API nova e `salvek99 release` no bloco 5 (tag `v2026.09.25`). | Rodar o prompt é a autorização. Sem isso, o dia termina com o app de novo sem commit. | Só commitar, sem push, até você revisar. |
| D4 | **Escudos da sequência** | Automáticos, 2 por mês. A sequência é de semanas com a meta batida. Uma semana que faltou **um** dia para a meta é coberta por um escudo, se houver. O escudo protege a sequência, não dá o XP da meta. | Folga planejada sem apertar nada: a proteção vale para quem tenta. Zero tela nova. | Escudo ativado pela pessoa, antes da semana. Mais controle, mais uma tela. |
| D5 | **Equilíbrio** | Diário do dia na conta (sono em horas, água em ml, humor de 1 a 5) com consentimento próprio (sono e humor são dado de saúde). A categoria mostra só a contagem de dias do mês com treino e os três registros, e só entre quem liga o compartilhamento da temporada (a mesma chave da evolução e tonelagem, com o rótulo atualizado). | Segue o padrão das medidas e do questionário. Ninguém vê horas de sono ou humor: só quantos dias a pessoa se cuidou. | Deixar o diário só no aparelho (sem categoria). |
| D6 | **Pontualidade** | Agenda na conta: até 7 compromissos (dia da semana e hora). A categoria é a porcentagem dos compromissos já passados no mês com treino concluído começando até 90 minutos antes ou depois da hora. Entra com 4 compromissos passados. | "Só conta se a pessoa agendou" (seção 3.3). A janela de 90 minutos aceita a vida real. | Janela de 60 minutos; lembrete push na hora (fica para depois, se sobrar tempo). |
| D7 | **Modalidade** | O catálogo ganha modalidades (corrida, bike, funcional, luta, natação, yoga, mobilidade), cada uma com os campos que importam (tempo, distância ou séries). Campo `modality` no exercício e no treino enviado. Um pódio por modalidade entre amigos: treinos do mês com pelo menos um exercício da modalidade, contados uma vez por treino. Aparece com 2 pessoas. | Seção 2.1 pedia as modalidades; a categoria só existe com elas. | Menos modalidades hoje (corrida, funcional, yoga) e o resto depois. |
| D8 | **Fase 5, limites** | "Sou personal" no Perfil, com CREF opcional marcado como "informado pelo profissional" (sem verificação hoje). Vínculo por convite com três permissões separadas e revogáveis (treinos, medidas, fotos). Responsável pela academia é quem a marcou primeiro; o administrador transfere. Ranking de personais por aderência e evolução relativa média, com mínimo de 3 alunos. Ranking da academia por constância verificada do mês, "Ana S." e dias, com opção de não aparecer. | É o que as seções 2.4, 3.3 e 4 pedem, sem inventar verificação de CREF que não temos como fazer. | Verificar CREF depois, por documento. |
| D9 | **Check-in com foto** | Um por dia no fuso do desafio, visível só para membros, com URL assinada. O dia do placar conta com treino concluído **ou** check-in com foto. Ocultar (moderação do grupo): quem criou o desafio, ou dois membros, escondem para todos e o dia deixa de contar. | Como no GymRats: o grupo modera (seção 3.4). Dois membros evitam que um rival esconda o outro sozinho. | Só quem criou modera. |

---

## Regras que não mudam

- Nada de ranking de peso, gordura ou "melhor corpo". Comparação de corpo é você contra você.
- Foto nasce privada. Compartilhar é decisão ativa e revogável. Medida, foto, sono e humor não viram XP.
- Linguagem sem culpa, sem "você falhou".
- Nenhum número inventado: de usuário, de resultado, de custo. O que não foi medido fica escrito como "não medido".
- Nada é marcado como pronto sem validação ou teste que sustente. O que o emulador não exercitou fica escrito no registro.
- Sem segredo em código, commit ou documento. Sem varrer `.env` na VPS.
- Decisão de produto que desvia da estratégia vai explícita no registro, para você revisar.

---

## Prompt do dia (cole no Claude Code)

```txt
Você é meu parceiro de produto e engenharia no Gyn Flow (workspace D:\dev\gynflow: o app
Expo em gymflow-mobile e a API Hono + Prisma em gymflow-api). Hoje é 25/09/2026 e o objetivo
é concluir o projeto: tudo o que só depende de código fica construído, testado, publicado e
documentado até o fim do dia.

Leia, nesta ordem: gymflow-mobile/25-setembro-concluindo.md (este documento, inteiro);
gymflow-mobile/manual.md (o estado por função); em gymflow-mobile/22-estrategia.md as seções
2.4, 2.5, 3.2 a 3.5 e 4 e o "Registro da Fase 4" no fim; gymflow-api/.claude/skills/salvek99/SKILL.md.

Execute os blocos 0 a 5 na ordem, com as "Decisões de hoje" exatamente como estão escritas:
não pergunte o que já está decidido ali. Cada bloco tem entregas, critérios de aceite e
validação. Só marque um bloco como feito quando a validação dele passou de verdade.

Jeito de trabalhar (o mesmo de 24/09):
- Contrato antes das telas: tipos e serviço no app (src/types, src/services) e schemas Zod
  com OpenAPI na API, escritos primeiro. Depois, dois agentes fazem as telas do app em
  paralelo enquanto a API é construída e testada.
- API: Postgres local no ar antes dos testes (npx prisma dev start gynflow). Migração nova
  com prisma migrate diff, não com migrate dev (não funciona nesta máquina). Poucas
  consultas por requisição (o Postgres local derruba a conexão com muitas em paralelo).
  Toda rota nova documentada no OpenAPI (o teste de docs falha se não estiver). Um teste
  para cada regra nova.
- App: typecheck e lint verdes. Validar no emulador lume_test (PowerShell: Start-Process
  emulator.exe -ArgumentList '-avd','lume_test','-no-window','-no-audio','-no-snapshot',
  '-gpu','swiftshader_indirect'), adb reverse das portas 3333 e 8097, Metro com CI=1 na
  porta 8097 (reiniciar depois de mudar código, tirando o reverse antes), telas por
  adb exec-out screencap. GPS não chega ao Expo Go no emulador: não gaste tempo com isso.
  Dados de teste: script .mts no scratchpad usando as libs da API, rodado com npx tsx.
- Publicação: salvek99 ao fim de cada bloco que mudou a API; salvek99 release no bloco 5.
  App: commit por frente ao fim de cada bloco (nunca git add -A), push no bloco 5.
- Manual e estratégia no bloco 5, com notas de validação honestas. Decisões de produto
  que desviam da estratégia vão explícitas no registro, para eu revisar.
- Sem segredo em código, commit ou documento. Sem varrer .env na VPS. Sem números inventados.

Não pare para perguntar o que este documento já responde. Pare só se: um portão (testes,
typecheck, build, CI) ficar vermelho sem correção em 20 minutos; uma migração exigir apagar
dados; ou surgir uma decisão de produto que as "Decisões de hoje" não cobrem.

Se o dia acabar no meio de um bloco: termine a frente em andamento com a validação dela,
deixe o resto do bloco escrito em "Ainda não feito" e faça o bloco 5 de qualquer jeito.

Ao terminar, me entregue numa mensagem só: o que foi construído por bloco, a tabela de
validação, os commits (app e API, com hash) e a lista "O que só você destrava" atualizada.
```

---

## Bloco 0: Abertura (30 min)

**Objetivo:** começar o dia com os portões verdes, o trabalho de ontem guardado e o ambiente no ar.

**Entregas**

- Postgres local no ar; `npm test` na API passando (105); `npm run typecheck && npm run lint` no app passando.
- Commit do app com o trabalho de 24/09, **por frente** e antes de qualquer mudança de hoje: Perfil e medidas na conta; aceleração (sincronizar, alimentação, preferências, recomendações, conquistas, frase); Fase 4 (liga, temporada, força, check-in verificado, conquistas); manual movido para a raiz (o `manual.html` do repositório sai, o `manual.md` e o gerador ficam).
- CI dos dois repositórios conferido (só leitura, com a credencial do git).
- Emulador, Metro e `adb reverse` prontos; conta de teste entrando contra a API local.
- Produção respondendo em `/health` e `/doc`.

**Critérios de aceite:** `git status` do app limpo depois dos commits; os quatro portões verdes; a home abrindo no emulador.

```txt
Leia 25-setembro-concluindo.md (Bloco 0 e D3). Suba o Postgres local (npx prisma dev start
gynflow), rode os portões dos dois projetos e confira o CI com a credencial do git (só
leitura). No app, faça os commits do trabalho de 24/09 por frente, na ordem: Perfil e medidas
na conta; aceleração; Fase 4; manual na raiz. Sem git add -A: liste os arquivos de cada frente.
Suba o emulador lume_test sem janela pelo PowerShell, faça os reverses das portas 3333 e 8097,
inicie o Metro com CI=1 e abra a home com a conta ana.api@gynflow.test. Confira
https://99dev.pro/gymflow-api/health. Me diga em uma linha o resultado de cada portão.
```

---

## Bloco 1: Fase 4 completa (2 h)

**Objetivo:** tirar as três categorias da lista de indisponíveis, dar os escudos à sequência e deixar a Fase 4 com ✅.

**Entregas na API**

- **Modalidade**: campo `modality` em `workout_exercises`, aceito pelo `POST /sync/workouts` e devolvido pelo `GET`. Categorias `modalidade:<id>` na temporada, com a regra da D7.
- **Agenda**: `PUT` e `GET /me/schedule` (até 7 compromissos: dia da semana e hora, no fuso da conta). Categoria `pontualidade` com a regra da D6.
- **Diário**: `PUT /me/consents/daily-log`, `POST` e `GET /sync/daily-logs` (data, sono em minutos, água em ml, humor 1 a 5, versão; lotes de 50; versão mais nova vence; retirar o consentimento apaga tudo). Categoria `equilibrio` com a regra da D5.
- **Escudos**: `GET /xp` passa a devolver a sequência de semanas com meta e os escudos do mês (D4). Selo "8 semanas seguidas".
- As três entradas saem de `UNAVAILABLE` em `src/lib/season.ts`; os troféus do mês cobrem as categorias novas. Termos e Privacidade citam o diário (dado de saúde) e a agenda.
- Migração, OpenAPI e testes: janela dos 90 minutos e mínimo de compromissos; um treino conta uma vez por modalidade; diário sem consentimento responde 403 e retirar apaga; escudo usado, escudo esgotado, sequência mantida e quebrada.

**Entregas no app**

- Catálogo com as modalidades novas em `src/db/exercises-seed.ts`, com os campos de cada uma, e `modality` na fila de sincronização. A escolha de exercícios agrupa por modalidade.
- **Agenda** dentro de Escolhas de treino: dias e horário, gravados na conta.
- **Diário do dia**: sono, água e humor, com cartão de consentimento no padrão do `MeasurementsBackupCard`. A água aproveita o registro da Alimentação (um lugar só).
- Liga mostra a sequência de semanas e os escudos do mês. Temporada mostra as três categorias novas.

**Critérios de aceite:** as oito categorias da seção 3.3 existem na temporada; uma semana com um dia a menos que a meta não quebra a sequência quando há escudo; um treino de yoga aparece no pódio de yoga e não no de musculação.

**Validação:** testes novos na API; no emulador, agenda gravada na conta, diário subindo e voltando num aparelho novo (apagar o app e entrar de novo), categorias aparecendo com dois amigos semeados, escudo cobrindo uma semana.

```txt
Leia 25-setembro-concluindo.md (Bloco 1 e as decisões D4 a D7) e 22-estrategia.md (3.2 e 3.3).
Escreva primeiro o contrato: src/types/league.ts e src/services/league.ts no app (agenda,
diário, escudos, categorias novas) e os schemas Zod com OpenAPI na API. Depois construa a
API (modality no treino, agenda, diário com consentimento, escudos, categorias) com migração
por prisma migrate diff e um teste por regra, enquanto dois agentes fazem no app: (1) catálogo
com modalidades, modality na fila e a Agenda nas Escolhas de treino; (2) Diário do dia com
consentimento e as mudanças na Liga e na Temporada. Tire as três entradas de UNAVAILABLE em
src/lib/season.ts. Valide no emulador com dados semeados pelas libs da API (dois amigos, um
treino de yoga, uma semana com um dia a menos que a meta). Feche com salvek99 e commit do app.
```

---

## Bloco 2: Fotos na conta e check-in com foto (2 h)

**Objetivo:** as fotos passam a poder ficar na conta com o mesmo consentimento das medidas, e o desafio ganha o check-in com foto. Fecha a Fase 3 e deixa na Fase 2 só o Health Connect.

**Entregas na API**

- `src/lib/storage.ts`: interface (`put`, `get`, `delete`, `signedUrl`) e driver `disk` (`STORAGE_DIR`, padrão `/app/storage`; `STORAGE_SECRET` para assinar). Sem as duas variáveis, as rotas de foto respondem 503 `FOTOS_NAO_CONFIGURADAS`, como o SMTP.
- `PUT /me/consents/body-photos`. `POST /sync/photos` (multipart: id, mês, pose, versão e JPEG de até 5 MB; o servidor reencoda com `sharp` para no máximo 1600 px, sem EXIF, e gera miniatura de 320 px). `GET /sync/photos` (páginas de 50, cada foto com URL assinada de 10 minutos da imagem e da miniatura). `DELETE /sync/photos/:id`. `GET /files/:token` serve o arquivo só com assinatura válida e `Cache-Control: private, no-store`. Retirar o consentimento e apagar a conta apagam os arquivos.
- Check-in com foto (D9): `POST /challenges/:id/checkins` (foto e texto curto), `GET /challenges/:id/checkins` (só membros), `DELETE` do próprio, `POST /challenges/:id/checkins/:cid/hide`. O placar conta o dia com treino concluído ou check-in com foto.
- `scripts/vps/gymflow-backup.sh` passa a incluir `STORAGE_DIR`. `.env.example` e o guia de deploy ganham `STORAGE_DIR`, `STORAGE_SECRET` e o `DEPLOY_VOLUMES`. O Dockerfile precisa trazer o binário do `sharp` (o `npm ci` traz; não usar `--omit=optional`).
- Testes: consentimento; reencode e limite de tamanho; URL expirada e adulterada; foto de outra conta não abre; apagar em cascata; um check-in por dia; ocultar por quem criou e por dois membros; 503 sem configuração.

**Entregas no app**

- Cartão de consentimento das fotos na Evolução, no padrão das medidas. As fotos já copiadas para a área privada entram na fila e sobem; num aparelho novo, descem (miniatura primeiro). Revogar apaga do servidor e mantém as do aparelho.
- No desafio: botão "Check-in com foto" (câmera da Fase 2, sem guia de contorno), mural do dia com as fotos dos membros e a opção de ocultar.

**Critérios de aceite (seção 2.3 e Fase 2):** enviar duas fotos de meses diferentes e vê-las voltar num aparelho novo; revogar e a URL antiga parar de abrir na hora; um membro do desafio ver o check-in do outro e o dia contar no placar.

**Validação:** testes novos na API; no emulador, duas contas: envio, restauração, revogação, check-in com foto e ocultar. Em produção, só depois do item 2 da sua lista (volume e segredo); até lá o registro diz "validado localmente".

```txt
Leia 25-setembro-concluindo.md (Bloco 2, D1 e D9) e 22-estrategia.md (2.3, 4 e 9). Contrato
primeiro (src/types e src/services/body-sync.ts e challenges.ts no app; Zod e OpenAPI na API).
Construa o módulo storage com driver disk, o consentimento das fotos, as rotas de fotos com
URL assinada, o check-in com foto no desafio e a inclusão da pasta no backup, com migração por
prisma migrate diff e testes para cada regra (inclusive URL adulterada e foto de outra conta).
Em paralelo, dois agentes no app: (1) consentimento, fila e restauração das fotos na Evolução;
(2) check-in com foto e mural do dia no desafio. Valide no emulador com duas contas. Não mexa
no .env.deploy da VPS: o STORAGE_SECRET e o DEPLOY_VOLUMES são passos meus (Bloco 6); deixe a
API respondendo 503 FOTOS_NAO_CONFIGURADAS enquanto faltam. Feche com salvek99 e commit do app.
```

---

## Bloco 3: Fase 5, personal e academia (3 h)

**Objetivo:** valorizar quem treina gente (seção 2.4) e abrir a academia como lugar (mural e ranking), com as permissões da seção 4.

**Entregas na API**

- **Perfil profissional**: `PUT /me/professional` (sou personal, CREF opcional, slug, apresentação). O papel de administrador não muda.
- **Vínculo**: `POST /coaching/invites` (código de 8 letras e link `/p/convite/:code`, válido por 7 dias); `POST /coaching/join` (o aluno aceita e liga ou desliga cada permissão: treinos, medidas, fotos); `PATCH /coaching/links/:id/permissions`; `DELETE /coaching/links/:id` (qualquer lado desfaz; o acesso some na hora).
- **Painel**: `GET /coaching/students` (por aluno: dias com treino na semana e no mês, último treino, "sumiu" com 7 dias sem treino, evolução relativa do mês, tudo só dentro da permissão); `GET /coaching/students/:id` (treinos com séries e cargas, medidas, fotos com URL assinada, cada um sob a própria permissão).
- **Prescrição**: `POST`, `GET` e `PUT /coaching/plans` (nome, dias, exercícios do catálogo com séries e repetições alvo, observação), atribuída a um aluno; `GET /me/plans` para o aluno; o treino concluído leva `plan_id`, e o personal vê feito contra prescrito.
- **Página do profissional**: `GET /p/:slug`, HTML público como `/c/:code` (nome, CREF se informado, quantos alunos, conquistas dos alunos que autorizaram, depoimentos aprovados); `POST /coaching/testimonials` (o aluno escreve, o personal aprova ou apaga); `PUT /me/coaching/showcase` (o aluno decide se aparece na página).
- **Ranking de personais**: `GET /coaching/ranking` por aderência média e evolução relativa média dos alunos, com mínimo de 3 alunos. Nunca por peso.
- **Mural da academia**: `GET /gyms/:id/board` (avisos e o ranking da academia: constância verificada do mês entre quem tem check-in verificado nela, "Ana S." e dias, com opção de não aparecer); `POST` e `DELETE /gyms/:id/notices` pelo responsável (D8); `PATCH /admin/gyms/:id/owner`.
- Termos e Privacidade descrevem o vínculo e as três permissões como consentimentos revogáveis. Migração, OpenAPI e testes: permissão desligada esconde o dado; revogar some na hora; prescrição só para aluno vinculado; ranking só com o mínimo de alunos; mural só para membros da academia; página pública sem dado de quem não autorizou.

**Entregas no app**

- Perfil: "Sou personal" (CREF, apresentação, link da página) e o cartão "Meu personal" (aceitar convite pelo código ou pelo link, permissões, desfazer).
- Tela **Alunos** (painel): lista com os sinais e o detalhe de cada aluno. Tela **Prescrever**: montar o treino do aluno a partir do catálogo.
- No Treino do aluno: "Treino prescrito por X", que abre a sessão já montada. Depoimento e "aparecer na página" no cartão do personal.
- Mural da academia dentro do check-in (avisos e ranking). Deep link `/p/convite/:code` como o do desafio.

**Critérios de aceite:** o personal só vê o que o aluno liberou, e perde na hora o que o aluno revogou; o aluno faz um treino prescrito e o personal vê feito contra prescrito; a página pública abre sem login e não mostra ninguém que não autorizou.

**Validação:** testes novos na API; no emulador, duas contas (personal e aluno): convite, permissões, prescrição vista e feita, painel mostrando o treino, revogação; `/p/:slug` e o mural abertos no navegador contra a API local; ranking da academia com duas contas com check-in verificado semeadas.

```txt
Leia 25-setembro-concluindo.md (Bloco 3 e D8) e 22-estrategia.md (1.3, 2.4, 4 e 5). Contrato
primeiro: src/types/coaching.ts e src/services/coaching.ts no app; Zod e OpenAPI na API.
Construa a API (perfil profissional, vínculo com três permissões, painel, prescrição, página
pública, depoimentos, ranking de personais, mural e ranking da academia) com migração por
prisma migrate diff e um teste por regra de permissão. Em paralelo, dois agentes no app:
(1) Perfil do personal, Alunos e Prescrever; (2) cartão "Meu personal", treino prescrito na
sessão, depoimento, deep link do convite e o mural da academia no check-in. Valide no emulador
com duas contas e no navegador (página pública e mural). Feche com salvek99 e commit do app.
```

---

## Bloco 4: Fase 6, recomendação com IA (2 h)

**Objetivo:** o Estágio 3 da seção 2.5: plano da semana com explicação, resumo do mês e leitura das medidas, com as regras de segurança por cima e o custo medido. Sem chave, nada muda para quem usa o app.

**Entregas na API**

- `src/lib/ai.ts`: cliente do SDK `@anthropic-ai/sdk`, bloco fixo (instruções, catálogo de exercícios, regras de segurança) com cache de prompt, modelo `claude-opus-5` com thinking adaptativo, saída estruturada validada com Zod. `ANTHROPIC_API_KEY`, `AI_MODEL` (padrão `claude-opus-5`), `AI_MONTHLY_CAP_USD` (padrão 0.20) e `AI_PROVIDER` (`anthropic` ou `fake`, o segundo só para testes) no `.env.example`. Sem chave, 503 `IA_NAO_CONFIGURADA`.
- `PUT /me/consents/ai`: o texto diz o que sai da conta (treinos com exercícios, séries e cargas; meta; preferências; agenda; medidas e questionário só se os dois consentimentos existirem; nunca nome, e-mail ou fotos). Sem ele, 403 `CONSENT_REQUIRED`.
- `GET /ai/weekly-plan` (dias conforme a meta, exercícios do catálogo, séries por repetições e carga sugerida, "por que esse treino" por dia; gerado na primeira abertura, guardado, regenerado no máximo uma vez por dia); `GET /ai/monthly-summary` (mês passado, linguagem humana e sem culpa); `GET /ai/measurements-reading` (só com os dois consentimentos; contexto, nunca nota).
- **Regras de segurança em código, antes e depois da IA**: só dado agregado entra; a saída só vale se cada exercício existe no catálogo, a carga sugerida fica até 10% ou 5 kg acima da melhor marca recente, os dias não passam da meta e não há dieta, remédio, jejum ou meta de peso. Reprovou: a resposta é descartada, fica registrada, e o app segue com o Estágio 1.
- **Lote**: `src/scripts/ai-batch.ts` pela Batch API (domingo 22h: planos da semana; dia 1 às 4h: resumos do mês), para quem consentiu e treinou nos últimos 14 dias. Duas linhas no cron do `install.sh`, log em `/var/log/99dev/gymflow-ai.log`.
- **Custo**: tabela `ai_usage` (usuário, rota, tokens de entrada, de cache e de saída, custo estimado pela tabela de preços do modelo, data). `GET /admin/metrics` ganha o custo do mês por usuário ativo. Quem passou do teto no mês recebe 429 `AI_CAP` até o mês virar.
- Política de Privacidade: a Anthropic como operadora (transferência internacional), o que é enviado, o prazo de guarda segundo a página oficial da Anthropic (citada com a data em que foi lida) e que a IA sugere enquanto as regras limitam. Migração, OpenAPI e testes com `AI_PROVIDER=fake` (a suíte nunca chama a Anthropic): consentimento; exercício fora do catálogo, carga acima do limite e palavra proibida reprovando; teto de custo; 503 sem chave.

**Entregas no app**

- Cartão de consentimento "Recomendações com IA", no padrão dos outros.
- Em Recomendações: "Plano da semana" (com "Por que esse treino?" por dia) e "Resumo do mês". No Treino: "Treino de hoje pelo plano", que abre a sessão montada. Na Evolução: "Leitura das medidas".
- Sem chave ou sem consentimento, nada disso aparece e o Estágio 1 continua igual.

**Critérios de aceite (Fase 6):** nenhuma sugestão fora dos limites das regras (coberto por teste); custo medido por usuário ativo, com o teto aplicado; a suíte de testes não gasta um token.

**Validação:** testes com o provedor simulado; no emulador contra a API local com uma chave de teste sua, se houver (senão, com `AI_PROVIDER=fake`, e o registro diz isso). Em produção, só depois do item 3 da sua lista.

```txt
Leia 25-setembro-concluindo.md (Bloco 4 e D2) e 22-estrategia.md (2.5, 4 e 9). Antes de
escrever qualquer chamada à API da Anthropic, carregue a skill claude-api e siga o que ela diz
(SDK @anthropic-ai/sdk, modelo claude-opus-5, thinking adaptativo, cache de prompt no bloco
fixo, structured outputs validados com Zod, Batch API para o lote, nunca prefill). Contrato
primeiro (src/types/ai.ts e src/services/ai.ts no app; Zod e OpenAPI na API). Construa
src/lib/ai.ts com o provedor anthropic e o fake, o consentimento, as três rotas, as regras de
segurança antes e depois, o lote no cron, a tabela ai_usage com o teto e o custo no
/admin/metrics, e a Política de Privacidade. Testes só com AI_PROVIDER=fake. Em paralelo, dois
agentes no app: (1) consentimento e as duas seções em Recomendações; (2) "Treino de hoje pelo
plano" na sessão e "Leitura das medidas" na Evolução. Valide no emulador; se eu não tiver
deixado uma chave de teste no .env local da API, valide com o fake e escreva isso. Feche com
salvek99 e commit do app.
```

---

## Bloco 5: Fechamento (1 h)

**Objetivo:** o projeto contado do jeito certo: manual, estratégia e READMEs em dia, tudo publicado e conferido, e o que depende de você numa lista só.

**Entregas**

1. **Manual** (`manual.html`, bloco `manual-data`): os grupos "Personal e academia" e "Recomendação com IA" saem de `future` e viram um grupo do app e um da API cada; os itens dos blocos 1 a 4 entram com status e nota de validação honesta; "84 testes" vira o número real; `phases` e `next` reescritos (`next` fica só com o que depende de você); `places` ganha este documento; `updated` = 25/09/2026. Depois, `node scripts/gerar-manual.mjs` em `gymflow-mobile`.
2. **Estratégia** (`22-estrategia.md`): "Situação em 25/09" nas Fases 2 a 6 e um "Registro da conclusão (25/09)" no fim, com as decisões D1 a D9 como foram aplicadas, a tabela "Como foi validado" e "Ainda não feito".
3. **READMEs** dos dois repositórios: telas e rotas novas, variáveis novas (`STORAGE_*`, `ANTHROPIC_API_KEY`, `AI_*`), cron novo. O guia `23-setembro-guia-deploy-api.md` ganha a seção do volume de fotos e das variáveis novas.
4. **API**: `salvek99 release` (tag `v2026.09.25`). Conferir CI (só leitura), `/health`, `/doc`, o cron instalado na VPS (rodar o `install.sh` pelo vps-panel) e, se o volume já existir, `docker inspect` mostrando a montagem.
5. **App**: commits por frente, push para `srodrigo28/gymflow`, CI conferido.
6. **Última rodada contra a produção** (`CI=1 EXPO_PUBLIC_API_URL=https://99dev.pro/gymflow-api npx expo start --port 8097`, sem o reverse da 3333): cadastro, treino, liga, temporada, agenda, diário, personal com duas contas, IA (503 esperado sem chave), fotos (503 esperado sem volume). Apagar as contas de teste pelo Perfil.
7. Este documento: painel do dia atualizado com o que foi feito e o que ficou.
8. **Relatório final** na mensagem: por bloco, validação, commits e "O que só você destrava".

```txt
Leia 25-setembro-concluindo.md (Bloco 5). Atualize o manual.html (grupos novos saindo de
future, itens dos blocos 1 a 4 com nota de validação honesta, "84 testes" corrigido, phases,
next só com o que depende do dono, places com este documento, updated 25/09/2026) e gere o
manual.md. Escreva na 22-estrategia.md a "Situação em 25/09" das Fases 2 a 6 e o "Registro da
conclusão (25/09)". Atualize os READMEs e o guia de deploy. Rode salvek99 release, confira CI,
/health, /doc e o cron. Faça os commits do app por frente e o push; confira o CI do app. Rode a
última rodada no emulador contra a produção e apague as contas de teste. Atualize o painel
deste documento. Me entregue o relatório final numa mensagem só.
```

---

## O que só você destrava (sua lista de hoje)

Nada aqui trava o código. Cada item liga uma função que já vai estar pronta e testada.

| # | Item | O que fazer | O que liga |
| --- | --- | --- | --- |
| 1 | **SMTP e e-mail de contato** | Na VPS, em `/var/www/apis/gymflow-api/.env.deploy`: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` (no formato `Gyn Flow <no-reply@seudominio>`) e `SUPPORT_EMAIL`. Depois, Deploy no painel. | Recuperação de senha, confirmação de e-mail e o alerta da sonda. |
| 2 | **Fotos na VPS** (D1) | Criar a pasta (`mkdir -p /var/lib/99dev/gymflow/fotos`); na engrenagem do painel, `DEPLOY_VOLUMES=/var/lib/99dev/gymflow/fotos:/app/storage`; no `.env.deploy`, `STORAGE_DIR=/app/storage` e `STORAGE_SECRET` gerado com `openssl rand -hex 32`. Deploy. | Fotos na conta e check-in com foto em produção. |
| 3 | **Chave da Anthropic** (D2) | Criar a chave em console.anthropic.com com limite de gasto na conta; `ANTHROPIC_API_KEY` no `.env.deploy`. Deploy. Para testar hoje no emulador, a mesma chave no `.env` local da API. | Fase 6 em produção. |
| 4 | **Fotos definitivas do hero e do login** | Duas fotos suas ou licenciadas, no lugar dos mockups gerados. | Fecha o último item do Fluxo inicial que depende de material. |
| 5 | **Celular físico Android** | Expo Go no celular, no mesmo wifi do computador. Push e check-in por GPS precisam de development build (`eas build --profile development`). | Valida GPS e push, que o emulador não exercita. |
| 6 | **iPhone** | Etapa 13 do fluxo inicial (VoiceOver e fonte grande). | Fecha o Fluxo inicial. |
| 7 | **Build de loja (EAS)** | Conta Expo e `eas build`; contas nas lojas (Play Console, taxa única; Apple Developer, anual; confira os valores vigentes). Decidido em 23/09: só depois das funções que faltam, ou seja, depois de hoje. | Publicação. |
| 8 | **Health Connect e Apple Health** | Só com o build nativo. | Passos, batimentos e sono nas recomendações. |

---

## Como saber que terminou

- [ ] No manual, as Fases 4, 5 e 6 estão ✅ e o que resta em "a fazer" está todo na tabela acima.
- [ ] `npm test` na API passa com todos os testes novos; `npm run typecheck && npm run lint` no app passa.
- [ ] CI verde nos dois repositórios; produção na tag `v2026.09.25` com `/health` respondendo.
- [ ] `git status` limpo no app e na API, com push feito.
- [ ] "Registro da conclusão (25/09)" no fim da estratégia, com as decisões D1 a D9 marcadas para revisão.
- [ ] O relatório final diz, para cada bloco, o que o emulador exercitou e o que não exercitou.

## Se o dia acabar antes

A ordem dos blocos já é a ordem de valor: cada um fecha uma fase inteira ou quase. Se faltar tempo, o que fica é o bloco em andamento, nunca o bloco 5. O prompt já sabe: termina a frente aberta com a validação dela, escreve o resto em "Ainda não feito" e fecha o dia com manual, estratégia e publicação do que ficou pronto. Amanhã o prompt é o mesmo documento, com o painel do dia dizendo de onde continuar.
