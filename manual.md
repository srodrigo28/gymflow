# Manual do projeto Gyn Flow

Atualizado em 24/09/2026. Versão interativa, com filtros e busca: [manual.html](../manual.html), na raiz do workspace (abra no navegador).

Onde o app e a API estão hoje: o que já funciona, o que está pela metade e o que falta, agrupado do jeito que o app se organiza.

## Resumo

| Área | Prontas | Parciais | A fazer | Andamento |
| --- | ---: | ---: | ---: | ---: |
| **App** (frontend em Expo) | 67 | 3 | 6 | **90%** |
| **API** (gymflow-api) | 40 | 1 | 3 | **92%** |
| **Geral**, escopo atual (Fases 1 a 3 e API) | 107 | 4 | 9 | **91%** |
| Plano completo, com as Fases 4 a 6 | 107 | 4 | 19 | 84% |

**Como ler:** cada função vale 1 ponto quando está pronta, meio ponto quando está parcial e zero quando falta; a porcentagem é a soma dividida pelo total listado. O número conta funções, não esforço: a Frase do dia pesa o mesmo que o registro de treino.

Legenda: ✅ pronto · 🟨 parcial · ⬜ a fazer.

## Linha do projeto

1. 🟨 **Fluxo inicial**: Etapas 0 a 12 prontas, app validado contra a API publicada, tema claro Dia, recuperação de senha e Termos no cadastro. A 13 (acessibilidade e desempenho) falta no iPhone.
2. ✅ **Fase 1 · Registro de treino**: Registro, histórico, recordes com card na hora, sincronização com a conta, restauração num aparelho novo e check-in na academia pelo GPS do aparelho.
3. 🟨 **Fase 2 · Corpo e fotos**: Medidas, fotos, comparador, câmera com guia de contorno e compartilhar com tarja prontos; as medidas ficam na conta com consentimento. Faltam as fotos na conta e o Health Connect.
4. 🟨 **Fase 3 · Social e desafios**: Card, desafios, convite, placar, amigos, notificações de lembrete e de placar e cards de sequência e do mês prontos. Falta o check-in com foto.
5. 🟨 **API · gymflow-api**: No ar em 99dev.pro/gymflow-api, com as rotas documentadas em /doc e a publicação em um comando (salvek99). Em 24/09 saíram medidas e questionário com consentimento, amigos, recuperação de senha, confirmação de e-mail, Termos e Privacidade, backup diário e sonda. Falta configurar o SMTP na VPS.
6. 🟨 **Fase 4 · Ranking e ligas**: XP, ligas semanais, temporada entre amigos, força relativa por DOTS, check-in verificado, troféus e selos prontos no app e na API. Faltam três categorias (pontualidade, modalidade e equilíbrio), os escudos da sequência e o ranking da academia.
7. ⬜ **Fase 5 · Personal e academia**: Vínculo por convite, painel do personal, prescrição e mural.
8. ⬜ **Fase 6 · Recomendação com IA**: Plano semanal com explicação, resumo do mês e custo por usuário.

## Próximos passos, na ordem sugerida

1. **Configurar SMTP e SUPPORT_EMAIL na VPS** (Publicação): Cinco variáveis no .env.deploy (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM) e o e-mail de contato. Ligam de uma vez a recuperação de senha, a confirmação de e-mail e o alerta da sonda, que já estão prontos e testados.
2. **Fotos de evolução na conta** (App + API): Medidas e questionário já sobem com consentimento. Falta o mesmo para as fotos: armazenamento privado com URL assinada, tarja e revogação. Precisa da decisão sobre onde guardar os arquivos.
3. **Check-in com foto no desafio** (App + API): Fecha a Fase 3. Depende da decisão sobre o armazenamento de fotos (privado, com URL assinada).
4. **Celular físico, iPhone e build de loja (EAS)** (Publicação): O app já passou contra a produção no emulador Android. Falta um celular físico, a etapa 13 no iPhone (VoiceOver e fonte grande) e só então o build de loja, como decidido em 23/09.
5. **Health Connect e Apple Health** (App): Passos, batimentos e sono alimentando as recomendações. Só com o build nativo.
6. **Fase 5 · Personal e academia** (App + API): Vínculo por convite com permissões granulares, painel do personal, prescrição, página do profissional e mural da academia, que também abre o ranking da academia. É o próximo bloco que não depende de decisão externa.

## App (frontend)

### Primeiros passos · Fluxo inicial

88% · 10 prontas, 1 parcial, 1 a fazer

- ✅ **Splash animada com carregamento real** · Sessão, tema e fontes carregam enquanto a marca anima. · `app/(auth)/splash.tsx`
- ✅ **Boas-vindas com carrossel de três cenas** · `app/(auth)/welcome.tsx`
- ✅ **Login com foto no topo e formulário em folha** · `app/(auth)/login.tsx`
- ✅ **Cadastro no mesmo layout, com medidor de força da senha** · `app/(auth)/sign-up.tsx`
- ✅ **Teclado que acompanha a altura real** · O campo em foco fica sempre acima do teclado.
- ✅ **Rotas protegidas** · Sem sessão, a área logada não abre. · `app/_layout.tsx`
- ✅ **Quatro temas de cores e tela Aparência** · Flow, Meia-noite, Aurora e Brasa. · `app/(app)/appearance.tsx`
- 🟨 **Acessibilidade, movimento e desempenho** · Validado no Android e no web. Falta iPhone, VoiceOver e fonte grande.
- ✅ **Tema claro "Dia"** · Quinto tema, claro, com as cores fechadas para ter contraste sobre branco. Validado no emulador na home, no Treino e na Evolução. · `src/theme/themes.ts`
- ✅ **Recuperação de senha** · Tela Nova senha em dois passos: o e-mail recebe um código de 6 números e o código libera a senha nova. Validado no emulador contra a API local. Em produção depende do SMTP configurado na VPS. · `app/(auth)/recuperar-senha.tsx`
- ✅ **Termos de Uso e Política de Privacidade** · Páginas públicas na API (/termos e /privacidade), abertas pelos links do cadastro e do Perfil. O contato vem de SUPPORT_EMAIL. · `src/services/legal.ts`
- ⬜ **Fotos definitivas do hero e do login** · As atuais vêm de mockups gerados.

### Conta e sessão · Conta

100% · 9 prontas, 0 parciais, 0 a fazer

- ✅ **Cadastro e login de verdade, pela API** · As mensagens de erro vêm do servidor. · `src/services/auth.ts`
- ✅ **Sessão conferida ao abrir, sem travar o app offline** · `src/contexts/session-context.tsx`
- ✅ **Sair da conta**
- ✅ **Banco local separado por conta** · Outra pessoa no mesmo celular não vê nem envia os treinos da anterior. · `src/db/client.ts`
- ✅ **Apagar a conta pelo app** · Pede a senha e confirma. Apaga também os treinos, medidas, fotos e respostas deste aparelho. · `app/(app)/perfil.tsx`
- ✅ **Alterar perfil** · Nome, foto de capa, senha, peso, altura e objetivo. Um peso novo entra também na Evolução, como a pesagem do dia. · `app/(app)/perfil.tsx`
- ✅ **Trocar a senha** · Pede a senha atual; os outros aparelhos saem da conta. · `app/(app)/perfil.tsx`
- ✅ **Foto de capa salva** · Da galeria, recortada na proporção da capa. Fica só neste aparelho e sai junto quando a conta é apagada. · `src/services/profile-photo.ts`
- ✅ **Confirmação de e-mail pelo Perfil** · Código de 6 números enviado por e-mail; o cartão mostra Confirmado em dd/mm. Validado no emulador contra a API local. · `app/(app)/perfil.tsx`

### Onboarding · Pós-cadastro

100% · 5 prontas, 0 parciais, 0 a fazer

- ✅ **Onboarding de até 26 telas, com validação** · As perguntas sobre refrigerante, tempo de treino anterior e foco profissional só aparecem quando a resposta anterior pede: de 22 a 26 telas. · `app/(onboarding)/start.tsx`
- ✅ **Painel do ponto de partida (peso, altura e IMC)**
- ✅ **Respostas guardadas no aparelho** · No SecureStore, porque há dados sensíveis (sono, humor, fumo). Inclui a meta escolhida na escala do resumo.
- ✅ **Resumo da home a partir das respostas** · Fase da jornada, rotina e duração do treino.
- ✅ **Levar o perfil para a conta, com consentimento** · Cartão Questionário na conta no Perfil, com consentimento próprio (sono, humor e fumo são dados de saúde). Sobe ao aceitar e a cada mudança; num aparelho novo, desce antes de decidir entre onboarding e home. · `src/services/questionnaire-sync.ts`

### Treino · Fase 1

100% · 11 prontas, 0 parciais, 0 a fazer

- ✅ **Registro de treino sem internet** · Séries, cronômetro e descanso de 90 s. · `app/(app)/treino/sessao.tsx`
- ✅ **Repetir a última série** · Copia a anterior ou a da última vez naquele exercício.
- ✅ **Biblioteca de 37 exercícios com busca por grupo** · `app/(app)/treino/exercicios.tsx`
- ✅ **Recorde automático** · Pela carga ou pela estimativa de uma repetição máxima.
- ✅ **Resumo da semana e "o que está faltando"** · `app/(app)/treino/index.tsx`
- ✅ **Histórico semanal e mensal por grupo muscular** · `app/(app)/treino/historico.tsx`
- ✅ **Limites de digitação** · Carga acima de 1000 kg fica vermelha e não é salva.
- ✅ **Treinos sobem sozinhos para a conta** · Ao entrar, ao voltar para o app e segundos depois de terminar. · `src/services/sync.ts`
- ✅ **Check-in na academia** · A pessoa marca a academia uma vez pelo GPS; depois, um check-in por dia, valendo como no local quando está a até 150 m. Tudo fica no aparelho; o check-in verificado por servidor é a Fase 4. Validado no emulador até a permissão de localização; a leitura do GPS falhou no emulador sem janela e a tela mostrou o erro certo. O caminho feliz precisa de um celular. · `app/(app)/treino/checkin.tsx`
- ✅ **Restaurar os treinos num aparelho novo** · Na primeira entrada da conta no aparelho, os treinos dela descem sozinhos, depois de a fila subir. · `src/services/sync.ts`
- ✅ **Comemoração de recorde com card na hora** · O aviso de recorde na sessão ganhou o botão Ver card, que abre o card daquele recorde para compartilhar. · `app/(app)/treino/sessao.tsx`

### Evolução do corpo · Fase 2

78% · 7 prontas, 0 parciais, 2 a fazer

- ✅ **Medidas com histórico** · Peso, gordura e cinco circunferências; só a data é obrigatória. · `app/(app)/corpo/medidas.tsx`
- ✅ **Gráfico de peso** · Com a variação desde a primeira pesagem. · `app/(app)/corpo/index.tsx`
- ✅ **Foto do mês por pose** · Copiada para a área privada do app. · `app/(app)/corpo/fotos.tsx`
- ✅ **Comparador antes e depois** · `app/(app)/corpo/comparar.tsx`
- ✅ **Guia de contorno na câmera** · Câmera própria com o contorno da pose (frente, lado, costas) por cima da imagem, para a foto do mês sair sempre igual. Validado no emulador: contorno da pose por cima da câmera, troca de pose e botão de captura. · `app/(app)/corpo/camera.tsx`
- ✅ **Medidas guardadas na conta, com consentimento específico** · Cartão na Evolução pede o consentimento (LGPD) e explica o que sobe e como voltar atrás. Aceitou: as medidas sobem e voltam num aparelho novo. Retirou: o servidor apaga tudo na hora e as do aparelho ficam. Validado no emulador em 24/09. · `src/components/body/MeasurementsBackupCard.tsx · src/services/body-sync.ts`
- ⬜ **Fotos na conta, com o mesmo consentimento** · Precisam de armazenamento privado com URL assinada.
- ✅ **Tarja ao compartilhar fotos** · No Comparar, o antes e depois sai como imagem com uma tarja preta gravada sobre o rosto, ajustável por toque. Revogar só faz sentido com fotos na conta, que ainda não existem. Validado no emulador: tarja posicionada por toque nas duas fotos, ligar e desligar, setas, e o botão Compartilhar abrindo a folha de compartilhamento do Android. · `app/(app)/corpo/compartilhar-foto.tsx`
- ⬜ **Health Connect e Apple Health**

### Social e desafios · Fase 3

88% · 7 prontas, 0 parciais, 1 a fazer

- ✅ **Card compartilhável de recorde e da semana** · `app/(app)/compartilhar.tsx`
- ✅ **Criar desafio e convidar pelo WhatsApp** · 7, 14 ou 30 dias. · `app/(app)/desafios/novo.tsx`
- ✅ **Placar do desafio** · Um ponto por dia com treino concluído. · `app/(app)/desafios/[id].tsx`
- ✅ **Entrar pelo link ou pelo código, mesmo sem conta** · O cadastro pelo convite volta direto para ele. · `app/convite/[code].tsx`
- ✅ **Sair do desafio**
- ✅ **Amigos** · Convite pelo e-mail, pedidos recebidos e enviados, lista com dias de treino na semana e quem treinou hoje. Entrada pelo cabeçalho dos Desafios. · `app/(app)/amigos/index.tsx`
- ⬜ **Check-in com foto no desafio**
- ✅ **Cards de sequência e retrospectiva do mês** · Duas abas novas no Compartilhar: semanas seguidas com treino e o resumo do mês (treinos, volume, recordes, grupo mais treinado). Validado no emulador. · `app/(app)/compartilhar.tsx`

### Ranking, ligas e premiação · Fase 4

90% · 4 prontas, 1 parcial, 0 a fazer

- ✅ **XP e pontuação** · Tela Liga: nível, XP da semana por origem (treinos, séries, check-in, meta, convite), meta de 2 a 6 dias por semana e as regras. Validado no emulador: 443 XP no total e 158 na semana, batendo com os treinos; escolher a meta de 4 dias gravou na conta. · `app/(app)/liga/index.tsx`
- ✅ **Ligas semanais e temporada mensal** · Grupo da semana com zonas de subida e descida e o resultado da semana passada; Temporada do mês entre amigos, com troca de mês. Validado no emulador com um grupo de 5 na Prata e a subida da Bronze. · `app/(app)/liga/temporada.tsx`
- 🟨 **Categorias de ranking com força relativa (DOTS)** · Pontos, constância declarada e verificada (separadas), força relativa por DOTS com entrada consentida, evolução, tonelagem por liga e cardio por modalidade, validados no emulador (DOTS de 277,2 conferido à mão). Evolução, tonelagem e cardio só entre quem escolhe mostrar. Faltam pontualidade (precisa de agenda), modalidade (precisa de modalidades no catálogo) e equilíbrio (precisa de registro diário de sono, água e humor). · `app/(app)/liga/forca.tsx`
- ✅ **Check-in verificado** · A tela marca a academia na conta, manda o check-in ao servidor e mostra se ficou verificado ou declarado; a leitura do GPS espera no máximo 15 s e usa uma posição de até 2 minutos. No emulador sem janela o GPS não entrega posição ao Expo Go, então marcar e fazer check-in não foram exercitados na tela; o servidor está coberto por testes e o painel mostra a academia confirmada. · `app/(app)/treino/checkin.tsx`
- ✅ **Troféus e selos** · Troféus (1º da semana na liga, 1º da temporada entre amigos) e selos (liga nova, 4 semanas de meta, trouxe gente, 10 check-ins) no Conquistas, com card de troféu para compartilhar. Validado no emulador. · `app/(app)/conquistas.tsx`

### Home e menu do perfil · Perfil

100% · 12 prontas, 0 parciais, 0 a fazer

- ✅ **Nome e resumo reais de quem entrou** · `app/(app)/home.tsx`
- ✅ **Menu com Treino, Evolução, Desafios e Aparência**
- ✅ **Painel de administração** · Só para quem está em ADMIN_EMAILS: cadastros contra a meta de 200. · `app/(app)/admin.tsx`
- ✅ **Sincronizar dispositivos** · Tela com o que já está na conta, o que falta subir, Sincronizar agora e Baixar de novo da conta. Relógios e apps de saúde ficam para o build nativo. Validado no emulador. · `app/(app)/sincronizar.tsx`
- ✅ **Alimentações diárias** · Diário local de refeições e água, com Repetir ontem e histórico de 7 dias. Sem calorias. · `app/(app)/alimentacao/index.tsx`
- ✅ **Alimentação ideal para escolher** · Seis estilos com trocas práticas e um dia de exemplo, com sugestão a partir do questionário. Orientação geral, não substitui nutricionista. · `app/(app)/alimentacao/ideal.tsx`
- ✅ **Escolhas de treinos** · Onde treina, tipos, grupos em foco, equipamentos e exercícios favoritos, que aparecem primeiro na escolha de exercícios. · `app/(app)/treino/preferencias.tsx`
- ✅ **Recomendações** · Estágio 1 da estratégia: regras sobre treinos, medidas e questionário, calculadas no aparelho, sem IA e sem rede. · `src/services/recommendations.ts`
- ✅ **Conquistas** · 16 conquistas calculadas dos dados locais, com a data do desbloqueio e o progresso das que faltam. · `app/(app)/conquistas.tsx`
- ✅ **Frase do dia** · Frase do dia determinística entre 48 frases originais, frase pessoal e compartilhar. · `app/(app)/frase.tsx`
- ✅ **Atalho do topo leva ao Treino** · A tela "dashboard" com exercícios fixos no código saiu. · `app/(app)/home.tsx`
- ✅ **Cartão da Evolução com dado real** · Mostra quanto o peso mudou desde o início (ou quantas medições há) e abre a Evolução. · `app/(app)/home.tsx`

### Plataformas e loja · Publicação

50% · 2 prontas, 1 parcial, 2 a fazer

- ✅ **Android** · Testado no emulador com o Expo Go.
- 🟨 **Web** · As telas de entrada funcionam. O treino usa SQLite, que não roda no servidor web de desenvolvimento.
- ⬜ **iPhone**
- ⬜ **Build de loja (EAS)** · Adiado em 23/09: primeiro as funções que faltam.
- ✅ **App apontando para a API publicada** · expo.extra.apiUrl = https://99dev.pro/gymflow-api; sem .env.local o app já usa a produção. Testado de ponta a ponta no emulador em 24/09: cadastro, consentimento e medida, treino com recorde, desafio com convite e exclusão da conta, tudo conferido na API publicada. · `app.json`

## API (gymflow-api)

### Contas · API

100% · 12 prontas, 0 parciais, 0 a fazer

- ✅ **Cadastro, login e saída** · `POST /auth/sign-up · /auth/sign-in · /auth/sign-out`
- ✅ **Token de sessão de 60 dias, só o hash no banco**
- ✅ **Senha com scrypt e a mesma resposta para e-mail ou senha errados**
- ✅ **Limite de tentativas de login e cadastro**
- ✅ **Limite por IP que não escapa por um X-Forwarded-For inventado** · Atrás do proxy vale o último IP da lista, o que o Nginx viu. Um teste cobre o caso. · `src/lib/rate-limit.ts`
- ✅ **Limite de chutes de senha para quem tem o token** · Troca de senha e exclusão da conta somam 10 tentativas a cada 15 minutos.
- ✅ **Apagar a conta com a senha, em cascata** · `DELETE /me`
- ✅ **Administrador por lista de e-mails** · `ADMIN_EMAILS`
- ✅ **Recuperação de senha por e-mail** · Código de 6 números, 15 minutos, 5 tentativas, só o hash no banco; a resposta é igual com ou sem conta, e a senha nova encerra todas as sessões. Em produção precisa do SMTP no .env.deploy. · `POST /auth/password-reset/request · /confirm`
- ✅ **Confirmação de e-mail** · O mesmo código por e-mail; emailVerifiedAt volta no user. · `POST /auth/email-verification/request · /confirm`
- ✅ **Alterar nome e senha** · A troca de senha encerra as outras sessões da conta. · `PATCH /me · PUT /me/password`
- ✅ **Respostas do questionário na conta, com consentimento próprio** · Objeto raso guardado sem interpretar; retirar o consentimento apaga. · `PUT /me/consents/questionnaire · GET e PUT /me/questionnaire`

### Sincronização · API

88% · 7 prontas, 0 parciais, 1 a fazer

- ✅ **Receber os treinos da fila do app** · Lotes de até 50. · `POST /sync/workouts`
- ✅ **Versão mais nova vence; id de outra conta é recusado**
- ✅ **Validação treino a treino** · Um registro ruim volta como inválido e não trava os outros.
- ✅ **Devolver os treinos da conta** · Em páginas de até 50, no formato do envio. Os apagados não voltam. · `GET /sync/workouts`
- ✅ **Consentimento para medidas na conta** · Liga e desliga; sem ele, as rotas de medidas respondem 403 CONSENT_REQUIRED. Retirar apaga todas as medidas da conta na hora, e um novo aceite grava um instante novo. · `PUT /me/consents/body-data`
- ✅ **Receber as medidas da fila do app** · Lotes de até 50, validação medida a medida, versão mais nova vence; medida apagada vira só uma marca, sem valores. · `POST /sync/measurements`
- ✅ **Devolver as medidas da conta** · Em páginas de até 50, para restaurar num aparelho novo. · `GET /sync/measurements`
- ⬜ **Fotos com consentimento** · Armazenamento privado, com URL assinada.

### Desafios · API

88% · 7 prontas, 0 parciais, 1 a fazer

- ✅ **Criar, listar, detalhar e sair** · `/challenges`
- ✅ **Entrar pelo código do convite** · `POST /challenges/join`
- ✅ **Placar por dias com treino, no fuso do desafio**
- ✅ **Prévia pública do convite** · `GET /invites/:code`
- ✅ **Página do link do WhatsApp** · Prévia na conversa e botão que abre o app. · `GET /c/:code`
- ✅ **Amigos** · Convite por e-mail com resposta genérica, aceitar, recusar, cancelar e desfazer; a lista traz só nome, dias com treino na semana e se treinou hoje. · `/friends`
- ⬜ **Check-in com foto**
- ✅ **Notificações de lembrete e de placar** · Lembrete do dia (das 18h às 21h no fuso do desafio, só para quem ainda não treinou) e placar final, decididos pela API e enviados pelo Expo Push. A rotina roda de hora em hora na VPS e nunca repete um envio. O app registra o aparelho ao abrir um desafio e abre o desafio ao tocar no aviso. Coberto por 4 testes; o recebimento no celular precisa de um development build, porque o Expo Go não recebe push no Android. · `src/lib/notifications.ts`

### Ligas e temporada · API

90% · 4 prontas, 1 parcial, 0 a fazer

- ✅ **XP calculado dos treinos, com tetos** · Não fica guardado: sai dos treinos e check-ins, dia a dia no fuso de São Paulo. Carga, medidas e fotos não viram XP. · `GET /xp`
- ✅ **Ligas semanais com fechamento e aviso** · Grupos de até 30 formados com o primeiro XP da semana; a rotina de hora em hora fecha a semana, sobe e desce, entrega troféus e selos e avisa por push. · `GET /leagues/current`
- 🟨 **Temporada entre amigos e categorias** · Seis categorias e as marcas a confirmar; o mês que fecha dá troféu a quem ficou em 1º entre amigos. Faltam pontualidade, modalidade e equilíbrio. · `GET /season`
- ✅ **Academia e check-in verificado** · Confirmação por duas contas ou pelo administrador; verificado no raio de 150 m com GPS de até 100 m de erro; a posição da pessoa não fica guardada. · `/me/gym, /checkins`
- ✅ **Convite reconhecido** · Conta nova (até 48 h) que entra por um desafio: XP em dobro por 7 dias para os dois e o selo de quem convidou. · `src/lib/referrals.ts`

### Administração · API

100% · 1 pronta, 0 parciais, 0 a fazer

- ✅ **Métricas da semana** · Cadastros, ativos e treinos concluídos. · `GET /admin/metrics`

### Qualidade e publicação · API

90% · 9 prontas, 0 parciais, 1 a fazer

- ✅ **84 testes automáticos contra um Postgres de verdade** · Passaram em 24/09 à tarde, com o Postgres local do Prisma: medidas, questionário, amigos, códigos por e-mail e páginas legais cobertos. · `npm test`
- ✅ **Docker Compose com Postgres, migrações e Caddy (HTTPS)** · Testado localmente; o certificado só sai com o domínio real.
- ✅ **CI no GitHub** · Conferido em 24/09: as 8 execuções da aba Actions passaram (typecheck, testes contra Postgres e build), inclusive a do último deploy. · `.github/workflows/ci.yml`
- ✅ **Publicar na VPS** · Painel 99dev, em https://99dev.pro/gymflow-api. A sonda do painel testa /healthz, que responde como o /health e confere o banco. Duas publicações em 24/09 pelo salvek99, as medidas (eccb80e) e o pacote da tarde (e8f9330), as duas com TUDO CONFERE.
- ✅ **Publicar em um comando (salvek99)** · No Claude Code, o token salvek99 roda typecheck, testes e build, faz commit e push, dispara o redeploy pelo vps-panel e confere a produção: commit, container, migrações, /health e /doc. · `.claude/skills/salvek99/SKILL.md`
- ✅ **Documentação das rotas (Swagger e OpenAPI)** · Em https://99dev.pro/gymflow-api/doc e /openapi.json. Um teste falha se uma rota nova ficar sem documentação. · `src/routes/docs.ts`
- ✅ **Backup automático do banco** · Cron às 03:15 na VPS, 14 dias guardados em /var/backups/99dev/gymflow; o primeiro backup foi feito em 24/09 ao instalar. · `scripts/vps/gymflow-backup.sh`
- ✅ **Monitoramento e alertas** · Sonda a cada 5 minutos na VPS: na segunda falha seguida reinicia o container e alerta por e-mail (o mesmo SMTP da API) ou webhook; sem os dois, o alerta fica no log em /var/log/99dev. · `scripts/vps/gymflow-health.sh`
- ✅ **Termos de Uso e Política de Privacidade publicados** · HTML público que descreve o que a API faz de verdade com os dados. O contato vem de SUPPORT_EMAIL. · `GET /termos · /privacidade`
- ⬜ **SMTP e e-mail de contato configurados na VPS** · SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM e SUPPORT_EMAIL no .env.deploy. Sem eles, recuperação de senha e confirmação de e-mail respondem 503 e o alerta da sonda fica só no log.

## Próximas fases

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

**App** (`D:\dev\gynflow\gymflow-mobile`)

```bash
npm install
npx expo start --port 8097
```

A porta 8090 está ocupada neste computador. Com .env.local, o app fala com a API local (EXPO_PUBLIC_API_URL); sem ele, com a publicada. No emulador Android, rode adb reverse tcp:3333 tcp:3333.

**API** (`D:\dev\gynflow\gymflow-api`)

```bash
npm install
npx prisma dev start gynflow
npm run dev
npm test
```

Na primeira vez: npx prisma dev --name gynflow --detach, cp .env.example .env e npm run db:migrate. A documentação local fica em http://localhost:3333/doc. Publicar é o token salvek99 no Claude Code. E-mail sai por SMTP_* do .env; sem SMTP, o código aparece no terminal. Mudou o schema? Nesta máquina o prisma migrate dev não cria o shadow database (o banco local é o template1); a saída está na seção 4 do guia 23-setembro-guia-deploy-api.md.

**Antes de salvar** (`nos dois projetos`)

```bash
npm run typecheck && npm run lint                  # app
npm run typecheck && npm test && npm run build     # API
```

Os quatro passaram em 24/09. Na API, os testes precisam do Postgres local no ar (npx prisma dev start gynflow) e levam cerca de 45 s.

**Este manual** (`D:\dev\gynflow`)

```bash
# edite o bloco manual-data no manual.html
cd gymflow-mobile
node scripts/gerar-manual.mjs
```

O script lê ../manual.html, recalcula as porcentagens e reescreve gymflow-mobile/manual.md, a versão em Markdown que fica no repositório do app.

## Onde está cada coisa

- **Workspace (os dois projetos e este manual):** `D:\dev\gynflow`
- **App (Expo):** `D:\dev\gynflow\gymflow-mobile`
- **API (repositório próprio):** `D:\dev\gynflow\gymflow-api`
- **Este manual em Markdown, gerado a partir daqui:** `gymflow-mobile/manual.md`
- **Estratégia e registro das fases:** `gymflow-mobile/22-estrategia.md`
- **Fluxo de entrada, temas e marca:** `gymflow-mobile/22-setembro-fluxo-inicial.md`
- **API publicada:** <https://99dev.pro/gymflow-api>
- **Documentação da API (Swagger):** <https://99dev.pro/gymflow-api/doc>
- **Saúde da API e do banco:** <https://99dev.pro/gymflow-api/health>
- **Código do app:** <https://github.com/srodrigo28/gymflow>
- **Código da API:** <https://github.com/srodrigo28/gymflow-api>
- **Publicação no painel 99dev:** `gymflow-api/23-setembro-guia-deploy-api.md`
- **Publicar a API em um comando:** `gymflow-api/.claude/skills/salvek99/SKILL.md`
