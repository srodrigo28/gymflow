# Manual do projeto Gyn Flow

Atualizado em 25/09/2026. Versão interativa, com filtros e busca: [manual.html](../manual.html), na raiz do workspace (abra no navegador).

Onde o app e a API estão hoje: o que já funciona, o que está pela metade e o que falta, agrupado do jeito que o app se organiza.

## Resumo

| Área | Prontas | Parciais | A fazer | Andamento |
| --- | ---: | ---: | ---: | ---: |
| **App** (frontend em Expo) | 85 | 2 | 4 | **95%** |
| **API** (gymflow-api) | 59 | 0 | 2 | **97%** |
| **Geral** (Fases 1 a 6, app e API) | 144 | 2 | 6 | **95%** |

**Como ler:** cada função vale 1 ponto quando está pronta, meio ponto quando está parcial e zero quando falta; a porcentagem é a soma dividida pelo total listado. O número conta funções, não esforço: a Frase do dia pesa o mesmo que o registro de treino.

Legenda: ✅ pronto · 🟨 parcial · ⬜ a fazer.

## Linha do projeto

1. 🟨 **Fluxo inicial**: Etapas 0 a 12 prontas, app validado contra a API publicada, tema claro Dia, recuperação de senha e Termos no cadastro. A 13 (acessibilidade e desempenho) falta no iPhone.
2. ✅ **Fase 1 · Registro de treino**: Registro, histórico, recordes com card na hora, sincronização com a conta, restauração num aparelho novo e check-in na academia pelo GPS do aparelho.
3. 🟨 **Fase 2 · Corpo e fotos**: Medidas, fotos, comparador, câmera com guia de contorno e compartilhar com tarja prontos; medidas e fotos ficam na conta com consentimentos separados, e as fotos só abrem por links de 10 minutos. Falta o Health Connect, que depende do build nativo.
4. ✅ **Fase 3 · Social e desafios**: Card, desafios, convite, placar, amigos, notificações de lembrete e de placar, cards de sequência e do mês e o check-in com foto no desafio, com mural do dia e moderação do grupo.
5. 🟨 **API · gymflow-api**: No ar em 99dev.pro/gymflow-api, com as rotas documentadas em /doc e a publicação em um comando (salvek99). Em 25/09 saíram as oito categorias da temporada, os escudos, o diário, a agenda, as fotos com URL assinada, o check-in com foto, personal e academia e a IA, com 138 testes. Falta configurar na VPS o SMTP, o volume das fotos e a chave da Anthropic.
6. ✅ **Fase 4 · Ranking e ligas**: XP, ligas semanais, temporada entre amigos com as oito categorias (pontualidade, modalidades e equilíbrio incluídos), escudos da sequência, força relativa por DOTS, check-in verificado, ranking da academia, troféus e selos.
7. ✅ **Fase 5 · Personal e academia**: Perfil de personal com página pública, vínculo por convite com três permissões que o aluno controla, painel do personal, prescrição com o feito contra o prescrito, ranking de personais e mural da academia.
8. ✅ **Fase 6 · Recomendação com IA**: Plano da semana com o porquê de cada dia, resumo do mês, leitura das medidas e o treino de hoje pelo plano, com consentimento próprio, regras de segurança por cima, custo medido com teto e lote de madrugada. Validada com o provedor simulado; em produção liga com a chave da Anthropic, e o custo real por pessoa ainda não foi medido.

## Próximos passos, na ordem sugerida

1. **Configurar SMTP e SUPPORT_EMAIL na VPS** (Publicação): SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM e o e-mail de contato no .env.deploy. Ligam de uma vez a recuperação de senha, a confirmação de e-mail e o alerta da sonda, que já estão prontos e testados.
2. **Volume e segredo das fotos na VPS** (Publicação): Criar /var/lib/99dev/gymflow/fotos (dono 1000:1000), DEPLOY_VOLUMES no painel, STORAGE_DIR=/app/storage e STORAGE_SECRET gerado com openssl rand -hex 32. Liga as fotos na conta e o check-in com foto em produção. Passo a passo no guia de deploy.
3. **Chave da Anthropic na VPS** (Publicação): ANTHROPIC_API_KEY no .env.deploy, com limite de gasto na conta da Anthropic. Liga a Fase 6 em produção; na primeira semana, conferir no painel de administração o custo real por pessoa contra o teto de US$ 0,20.
4. **Fotos definitivas do hero e do login** (App): Duas fotos próprias ou licenciadas no lugar dos mockups gerados.
5. **Celular físico, iPhone e build de loja (EAS)** (Publicação): GPS e push só se exercitam num celular com development build; a etapa 13 (VoiceOver e fonte grande) no iPhone; depois, o build de loja, como decidido em 23/09.
6. **Health Connect e Apple Health** (App): Passos, batimentos e sono alimentando as recomendações. Só com o build nativo.

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

100% · 13 prontas, 0 parciais, 0 a fazer

- ✅ **Registro de treino sem internet** · Séries, cronômetro e descanso de 90 s. · `app/(app)/treino/sessao.tsx`
- ✅ **Repetir a última série** · Copia a anterior ou a da última vez naquele exercício.
- ✅ **Biblioteca de 55 exercícios em nove modalidades** · Musculação, corrida, bike, natação, funcional, luta, yoga, mobilidade e cardio, com chips de modalidade e busca em todas. Validado no emulador: a modalidade Yoga lista os dois exercícios dela. · `app/(app)/treino/exercicios.tsx`
- ✅ **Séries só de tempo** · Yoga, luta, mobilidade e circuito registram só os minutos, sem recorde de carga. Validado no emulador: 30 min de yoga subiram para a conta como tempo e yoga. · `app/(app)/treino/sessao.tsx`
- ✅ **Recorde automático** · Pela carga ou pela estimativa de uma repetição máxima.
- ✅ **Resumo da semana e "o que está faltando"** · `app/(app)/treino/index.tsx`
- ✅ **Histórico semanal e mensal por grupo muscular** · `app/(app)/treino/historico.tsx`
- ✅ **Limites de digitação** · Carga acima de 1000 kg fica vermelha e não é salva.
- ✅ **Treinos sobem sozinhos para a conta** · Ao entrar, ao voltar para o app e segundos depois de terminar. · `src/services/sync.ts`
- ✅ **Check-in na academia** · A pessoa marca a academia uma vez pelo GPS; depois, um check-in por dia, valendo como no local quando está a até 150 m. Tudo fica no aparelho; o check-in verificado por servidor é a Fase 4. Validado no emulador até a permissão de localização; a leitura do GPS falhou no emulador sem janela e a tela mostrou o erro certo. O caminho feliz precisa de um celular. · `app/(app)/treino/checkin.tsx`
- ✅ **Restaurar os treinos num aparelho novo** · Na primeira entrada da conta no aparelho, os treinos dela descem sozinhos, depois de a fila subir. · `src/services/sync.ts`
- ✅ **Comemoração de recorde com card na hora** · O aviso de recorde na sessão ganhou o botão Ver card, que abre o card daquele recorde para compartilhar. · `app/(app)/treino/sessao.tsx`
- ✅ **Agenda da semana na conta** · Nas Escolhas de treino: até 7 compromissos, gravados na conta, para a pontualidade. Validado no emulador: carregou da conta e salvou o sábado sem refazer os outros horários. · `app/(app)/treino/preferencias.tsx`

### Evolução do corpo · Fase 2

89% · 8 prontas, 0 parciais, 1 a fazer

- ✅ **Medidas com histórico** · Peso, gordura e cinco circunferências; só a data é obrigatória. · `app/(app)/corpo/medidas.tsx`
- ✅ **Gráfico de peso** · Com a variação desde a primeira pesagem. · `app/(app)/corpo/index.tsx`
- ✅ **Foto do mês por pose** · Copiada para a área privada do app. · `app/(app)/corpo/fotos.tsx`
- ✅ **Comparador antes e depois** · `app/(app)/corpo/comparar.tsx`
- ✅ **Guia de contorno na câmera** · Câmera própria com o contorno da pose (frente, lado, costas) por cima da imagem, para a foto do mês sair sempre igual. Validado no emulador: contorno da pose por cima da câmera, troca de pose e botão de captura. · `app/(app)/corpo/camera.tsx`
- ✅ **Medidas guardadas na conta, com consentimento específico** · Cartão na Evolução pede o consentimento (LGPD) e explica o que sobe e como voltar atrás. Aceitou: as medidas sobem e voltam num aparelho novo. Retirou: o servidor apaga tudo na hora e as do aparelho ficam. Validado no emulador em 24/09. · `src/components/body/MeasurementsBackupCard.tsx · src/services/body-sync.ts`
- ✅ **Fotos na conta, com consentimento próprio** · Consentimento próprio, separado do das medidas. Validado no emulador contra a API local: 2 fotos subiram e a retirada apagou tudo do servidor, com as fotos mantidas no aparelho. A restauração num aparelho novo não foi exercitada na tela. Em produção, liga quando o volume e o segredo das fotos forem configurados na VPS. · `src/services/photo-sync.ts`
- ✅ **Tarja ao compartilhar fotos** · No Comparar, o antes e depois sai como imagem com uma tarja preta gravada sobre o rosto, ajustável por toque. Revogar só faz sentido com fotos na conta, que ainda não existem. Validado no emulador: tarja posicionada por toque nas duas fotos, ligar e desligar, setas, e o botão Compartilhar abrindo a folha de compartilhamento do Android. · `app/(app)/corpo/compartilhar-foto.tsx`
- ⬜ **Health Connect e Apple Health**

### Social e desafios · Fase 3

100% · 8 prontas, 0 parciais, 0 a fazer

- ✅ **Card compartilhável de recorde e da semana** · `app/(app)/compartilhar.tsx`
- ✅ **Criar desafio e convidar pelo WhatsApp** · 7, 14 ou 30 dias. · `app/(app)/desafios/novo.tsx`
- ✅ **Placar do desafio** · Um ponto por dia com treino concluído. · `app/(app)/desafios/[id].tsx`
- ✅ **Entrar pelo link ou pelo código, mesmo sem conta** · O cadastro pelo convite volta direto para ele. · `app/convite/[code].tsx`
- ✅ **Sair do desafio**
- ✅ **Amigos** · Convite pelo e-mail, pedidos recebidos e enviados, lista com dias de treino na semana e quem treinou hoje. Entrada pelo cabeçalho dos Desafios. · `app/(app)/amigos/index.tsx`
- ✅ **Check-in com foto no desafio** · Um por dia, visível só para o grupo; o dia conta no placar. Validado no emulador: envio pela câmera virtual, mural com o check-in de outra pessoa e ocultar como quem criou (o ponto dela voltou a 0). Em produção, liga com o volume das fotos. · `app/(app)/desafios/checkin.tsx`
- ✅ **Cards de sequência e retrospectiva do mês** · Duas abas novas no Compartilhar: semanas seguidas com treino e o resumo do mês (treinos, volume, recordes, grupo mais treinado). Validado no emulador. · `app/(app)/compartilhar.tsx`

### Ranking, ligas e premiação · Fase 4

100% · 6 prontas, 0 parciais, 0 a fazer

- ✅ **XP e pontuação** · Tela Liga: nível, XP da semana por origem (treinos, séries, check-in, meta, convite), meta de 2 a 6 dias por semana e as regras. Validado no emulador: 443 XP no total e 158 na semana, batendo com os treinos; escolher a meta de 4 dias gravou na conta. · `app/(app)/liga/index.tsx`
- ✅ **Ligas semanais e temporada mensal** · Grupo da semana com zonas de subida e descida e o resultado da semana passada; Temporada do mês entre amigos, com troca de mês. Validado no emulador com um grupo de 5 na Prata e a subida da Bronze. · `app/(app)/liga/temporada.tsx`
- ✅ **As oito categorias da temporada, com força relativa (DOTS)** · Pontos, constância declarada e verificada, pontualidade com a agenda, força por DOTS, evolução, tonelagem, equilíbrio e treinos por modalidade. Validado no emulador: pontualidade de 60%, equilíbrio 4 × 2 e pódio de yoga 3, 2 e 1, conferidos contra os dados semeados. · `app/(app)/liga/temporada.tsx`
- ✅ **Check-in verificado** · A tela marca a academia na conta, manda o check-in ao servidor e mostra se ficou verificado ou declarado; a leitura do GPS espera no máximo 15 s e usa uma posição de até 2 minutos. No emulador sem janela o GPS não entrega posição ao Expo Go, então marcar e fazer check-in não foram exercitados na tela; o servidor está coberto por testes e o painel mostra a academia confirmada. · `app/(app)/treino/checkin.tsx`
- ✅ **Troféus e selos** · Troféus (1º da semana na liga, 1º da temporada entre amigos) e selos (liga nova, 4 semanas de meta, trouxe gente, 10 check-ins) no Conquistas, com card de troféu para compartilhar. Validado no emulador. · `app/(app)/conquistas.tsx`
- ✅ **Sequência com escudos** · Semanas seguidas com a meta; uma semana a um dia da meta usa um escudo (2 por mês). Selo de 8 semanas. Validado no emulador: 2 semanas, com a de 7/09 segurada por um escudo. · `app/(app)/liga/index.tsx`

### Personal e academia · Fase 5

100% · 6 prontas, 0 parciais, 0 a fazer

- ✅ **Perfil de personal e página pública** · No Perfil, o cartão Sou personal: endereço da página, CREF como o profissional informou (a página avisa que não é verificado), apresentação, cidade e os convites. Validado no emulador: o cartão com o perfil. A página pública, aberta na API local, mostrou o CREF como informado e o depoimento aprovado no app. · `src/components/coaching/ProfessionalCard.tsx`
- ✅ **Vínculo por convite, com três permissões** · Convite de 8 letras, por link ou código, de uso único e válido por 7 dias. No cartão Meu personal o aluno liga e desliga treinos, medidas e fotos, deixa depoimento e desfaz o vínculo. Validado no emulador: o cartão do aluno com as três chaves e, contra a produção, o aceite pelo link com só os treinos ligados. · `src/components/coaching/CoachLinksCard.tsx · app/personal/convite/[code].tsx`
- ✅ **Painel do personal** · Aderência da semana e do mês, quem está há 7 dias sem treinar, evolução do mês, prescrição ativa e depoimento pendente; o aluno em detalhe só com o que liberou. Validado no emulador: painel com dois alunos, detalhe do aluno e depoimento aprovado. · `app/(app)/alunos/index.tsx`
- ✅ **Prescrição de treino** · Até 7 dias com exercícios do catálogo, séries, repetições alvo, descanso e observação. O aluno começa o treino pela prescrição e o personal vê o feito contra o prescrito. Validado no emulador: a sessão abriu com as metas e o personal viu 3 × 8-12 feito com 50 kg × 10 e o exercício que faltou; contra a produção, o treino pela prescrição chegou ao personal com o plano e o dia. O formulário de prescrever foi testado só pela API. · `app/(app)/alunos/prescrever.tsx · app/(app)/treino/sessao.tsx`
- ✅ **Ranking de personais** · Por aderência e evolução média, só com alunos que compartilham os treinos e com pelo menos 3 deles. No emulador, só o estado vazio (nenhum personal com 3 alunos que compartilham) e as regras; a lista com posições foi testada pela API. · `app/(app)/alunos/ranking.tsx`
- ✅ **Mural da academia** · No check-in: avisos do responsável e o ranking do mês por constância verificada, com a opção de não aparecer. Validado no emulador: aviso com o botão de apagar do responsável, ranking de três pessoas com a própria marcada e a chave de não aparecer. Publicar aviso foi testado só pela API. · `src/components/coaching/GymBoard.tsx`

### Recomendação com IA · Fase 6

100% · 5 prontas, 0 parciais, 0 a fazer

- ✅ **Consentimento próprio para a IA** · Cartão em Recomendações: o que vai e o que nunca vai para a IA, a Anthropic como operadora, as regras, o teto do mês e o uso do mês. Validado no emulador contra a API local com o provedor simulado: aceitar ligou a IA; retirar apagou os 3 documentos e as escolhas no servidor e manteve só os 3 registros de custo. Contra a produção, sem a chave, a tela mostra uma linha discreta e segue com as regras. · `src/components/ai/AiConsentCard.tsx`
- ✅ **Plano da semana com o porquê de cada dia** · Dias com exercícios, séries, repetições, carga sugerida e descanso, "Por que esse treino?" e um plano novo por dia. Validado no emulador com o provedor simulado: o plano saiu na primeira abertura, com a sexta marcada como hoje. O Claude de verdade só roda com a chave. · `app/(app)/recomendacoes.tsx`
- ✅ **Resumo do mês** · Título, texto, destaques e o próximo foco do mês fechado. Validado no emulador com o provedor simulado (o resumo de agosto). · `app/(app)/recomendacoes.tsx`
- ✅ **Leitura das medidas** · Na Evolução, com a tendência num chip neutro e o atalho para o consentimento que falta. Validado no emulador com o provedor simulado. · `src/components/body/MeasurementsReadingCard.tsx`
- ✅ **Treino de hoje pelo plano** · No Treino, depois da prescrição do personal: começa a sessão com os exercícios do dia. Validado no emulador: a sessão abriu com 3 exercícios e 9 séries. A carga e as repetições sugeridas pela IA ainda não aparecem dentro da sessão. · `src/components/training/AiPlanToday.tsx`

### Home e menu do perfil · Perfil

100% · 13 prontas, 0 parciais, 0 a fazer

- ✅ **Nome e resumo reais de quem entrou** · `app/(app)/home.tsx`
- ✅ **Menu com Treino, Evolução, Desafios e Aparência**
- ✅ **Painel de administração** · Só para quem está em ADMIN_EMAILS: cadastros contra a meta de 200. · `app/(app)/admin.tsx`
- ✅ **Sincronizar dispositivos** · Tela com o que já está na conta, o que falta subir, Sincronizar agora e Baixar de novo da conta. Relógios e apps de saúde ficam para o build nativo. Validado no emulador. · `app/(app)/sincronizar.tsx`
- ✅ **Alimentações diárias** · Diário local de refeições e água, com Repetir ontem e histórico de 7 dias. Sem calorias. · `app/(app)/alimentacao/index.tsx`
- ✅ **Alimentação ideal para escolher** · Seis estilos com trocas práticas e um dia de exemplo, com sugestão a partir do questionário. Orientação geral, não substitui nutricionista. · `app/(app)/alimentacao/ideal.tsx`
- ✅ **Diário do dia** · Sono, água (os copos da Alimentação) e humor, com consentimento próprio para ficar na conta. Validado no emulador: o dia subiu para a conta e um dia da conta voltou para o aparelho. · `app/(app)/diario.tsx`
- ✅ **Escolhas de treinos** · Onde treina, tipos, grupos em foco, equipamentos e exercícios favoritos, que aparecem primeiro na escolha de exercícios. · `app/(app)/treino/preferencias.tsx`
- ✅ **Recomendações** · Estágio 1 da estratégia: regras sobre treinos, medidas e questionário, calculadas no aparelho, sem IA e sem rede. Com o consentimento da IA, a tela ganha o plano da semana e o resumo do mês por cima das regras (Fase 6). · `src/services/recommendations.ts`
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

100% · 10 prontas, 0 parciais, 0 a fazer

- ✅ **Receber os treinos da fila do app** · Lotes de até 50. · `POST /sync/workouts`
- ✅ **Versão mais nova vence; id de outra conta é recusado**
- ✅ **Validação treino a treino** · Um registro ruim volta como inválido e não trava os outros.
- ✅ **Devolver os treinos da conta** · Em páginas de até 50, no formato do envio. Os apagados não voltam. · `GET /sync/workouts`
- ✅ **Consentimento para medidas na conta** · Liga e desliga; sem ele, as rotas de medidas respondem 403 CONSENT_REQUIRED. Retirar apaga todas as medidas da conta na hora, e um novo aceite grava um instante novo. · `PUT /me/consents/body-data`
- ✅ **Receber as medidas da fila do app** · Lotes de até 50, validação medida a medida, versão mais nova vence; medida apagada vira só uma marca, sem valores. · `POST /sync/measurements`
- ✅ **Devolver as medidas da conta** · Em páginas de até 50, para restaurar num aparelho novo. · `GET /sync/measurements`
- ✅ **Fotos de evolução com consentimento próprio** · Armazenamento privado, imagem refeita sem metadados (até 1600 px) e miniatura, URL assinada de 10 minutos que confere o consentimento na hora. Coberto por 7 testes. Em produção responde 503 até o volume e o segredo serem configurados. · `POST, GET e DELETE /sync/photos · GET /files/:token`
- ✅ **Modalidade de cada exercício no treino** · Opcional: o app antigo continua aceito. · `POST /sync/workouts`
- ✅ **Diário do dia na conta** · Consentimento próprio; retirar apaga tudo; a versão mais nova vence. · `POST e GET /sync/daily-logs`

### Desafios · API

100% · 8 prontas, 0 parciais, 0 a fazer

- ✅ **Criar, listar, detalhar e sair** · `/challenges`
- ✅ **Entrar pelo código do convite** · `POST /challenges/join`
- ✅ **Placar por dias com treino, no fuso do desafio** · Conta também o dia com check-in com foto visível.
- ✅ **Prévia pública do convite** · `GET /invites/:code`
- ✅ **Página do link do WhatsApp** · Prévia na conversa e botão que abre o app. · `GET /c/:code`
- ✅ **Amigos** · Convite por e-mail com resposta genérica, aceitar, recusar, cancelar e desfazer; a lista traz só nome, dias com treino na semana e se treinou hoje. · `/friends`
- ✅ **Check-in com foto** · Um por dia no fuso do desafio, só para participantes; o dia conta no placar e silencia o lembrete. Moderação: quem criou oculta, dois participantes também. · `/challenges/:id/checkins`
- ✅ **Notificações de lembrete e de placar** · Lembrete do dia (das 18h às 21h no fuso do desafio, só para quem ainda não treinou) e placar final, decididos pela API e enviados pelo Expo Push. A rotina roda de hora em hora na VPS e nunca repete um envio. O app registra o aparelho ao abrir um desafio e abre o desafio ao tocar no aviso. Coberto por 4 testes; o recebimento no celular precisa de um development build, porque o Expo Go não recebe push no Android. · `src/lib/notifications.ts`

### Ligas e temporada · API

100% · 7 prontas, 0 parciais, 0 a fazer

- ✅ **XP calculado dos treinos, com tetos** · Não fica guardado: sai dos treinos e check-ins, dia a dia no fuso de São Paulo. Carga, medidas e fotos não viram XP. · `GET /xp`
- ✅ **Ligas semanais com fechamento e aviso** · Grupos de até 30 formados com o primeiro XP da semana; a rotina de hora em hora fecha a semana, sobe e desce, entrega troféus e selos e avisa por push. · `GET /leagues/current`
- ✅ **Temporada entre amigos e categorias** · As oito categorias da seção 3.3: pontualidade, modalidades e equilíbrio entraram em 25/09. Coberto por 13 testes novos. · `GET /season`
- ✅ **Academia e check-in verificado** · Confirmação por duas contas ou pelo administrador; verificado no raio de 150 m com GPS de até 100 m de erro; a posição da pessoa não fica guardada. · `/me/gym, /checkins`
- ✅ **Convite reconhecido** · Conta nova (até 48 h) que entra por um desafio: XP em dobro por 7 dias para os dois e o selo de quem convidou. · `src/lib/referrals.ts`
- ✅ **Agenda e pontualidade** · Até 7 compromissos; cada dia conta com a agenda que valia nele. · `GET e PUT /me/schedule`
- ✅ **Sequência com escudos** · No GET /xp; selo de 8 semanas. · `src/lib/xp.ts`

### Personal e academia · API

100% · 6 prontas, 0 parciais, 0 a fazer

- ✅ **Perfil profissional e página pública** · CREF como informado, sem verificação. A página mostra as conquistas dos alunos que aceitaram aparecer e os depoimentos aprovados. · `/me/professional · GET /p/:slug`
- ✅ **Convite, vínculo e permissões conferidas a cada leitura** · Desligar uma permissão corta o acesso na hora; desfazer o vínculo apaga as prescrições entre os dois. Coberto pelos 6 testes de personal e academia. · `/coaching/invites · /coaching/join · /coaching/links/:id`
- ✅ **Painel do personal e dados do aluno** · Só medidas e fotos que o próprio aluno guarda na conta chegam ao personal, e só com a chave ligada. · `GET /coaching/students · GET /coaching/students/:studentId`
- ✅ **Prescrição e feito contra o prescrito** · Até 7 dias; o treino do aluno sobe com o plano e o dia, e o personal vê o que foi feito e o que faltou. · `/coaching/plans · POST /sync/workouts`
- ✅ **Ranking de personais** · Aderência e evolução média só de alunos que compartilham os treinos, com mínimo de 3. · `GET /coaching/ranking`
- ✅ **Mural e ranking da academia** · O responsável é quem marcou a academia primeiro e publica os avisos; o ranking do mês é por constância verificada, com a opção de sair. · `/gyms/:id/board · /gyms/:id/notices`

### Recomendação com IA · API

100% · 5 prontas, 0 parciais, 0 a fazer

- ✅ **Plano da semana, resumo do mês e leitura das medidas** · Claude (claude-opus-5) pela API da Anthropic, com saída estruturada validada, thinking adaptativo e a parte fixa do pedido em cache. Coberto por 7 testes com o provedor simulado. Em produção responde 503 até a chave ser configurada. · `/ai/weekly-plan · /ai/monthly-summary · /ai/measurements-reading`
- ✅ **Regras de segurança por cima da IA** · Cada resposta passa pelas regras antes de chegar à pessoa: exercícios só do catálogo, dias dentro da meta, carga só com histórico e no máximo o menor entre 10% e 5 kg acima da melhor marca de 8 semanas, nada de dieta nem remédio. A resposta recusada fica guardada com o motivo e nunca aparece. · `src/lib/ai.ts`
- ✅ **Consentimento próprio e apagar ao retirar** · Retirar apaga o que a IA gerou e as escolhas de treino mandadas; o registro de custo, sem conteúdo, fica. · `PUT /me/consents/ai · PUT /ai/preferences`
- ✅ **Custo medido por pessoa, com teto** · Cada chamada guarda tokens e custo pela tabela de preços; teto de US$ 0,20 por pessoa por mês e o custo por pessoa ativa no painel de administração. · `GET /ai/status · GET /admin/metrics`
- ✅ **Lote de madrugada (Batch API)** · Plano da semana no domingo à noite e resumo no dia 1, pela metade do preço, com coleta de hora em hora. Instalado no cron da VPS; sem a chave, ele pula. · `src/scripts/ai-batch.ts`

### Administração · API

100% · 2 prontas, 0 parciais, 0 a fazer

- ✅ **Métricas da semana** · Cadastros, ativos e treinos concluídos. · `GET /admin/metrics`
- ✅ **Transferir o responsável pela academia** · Só para alguém que marcou a mesma academia. · `PATCH /admin/gyms/:id/owner`

### Qualidade e publicação · API

82% · 9 prontas, 0 parciais, 2 a fazer

- ✅ **138 testes automáticos contra um Postgres de verdade** · Passaram em 25/09 com o Postgres local do Prisma (cerca de 3 minutos): Fase 4 completa, fotos e check-in, personal e academia, e a IA com o provedor simulado. · `npm test`
- ✅ **Docker Compose com Postgres, migrações e Caddy (HTTPS)** · Testado localmente; o certificado só sai com o domínio real.
- ✅ **CI no GitHub** · Conferido em 24/09: as 8 execuções da aba Actions passaram (typecheck, testes contra Postgres e build), inclusive a do último deploy. · `.github/workflows/ci.yml`
- ✅ **Publicar na VPS** · Painel 99dev, em https://99dev.pro/gymflow-api. A sonda do painel testa /healthz, que responde como o /health e confere o banco. Duas publicações em 24/09 pelo salvek99, as medidas (eccb80e) e o pacote da tarde (e8f9330), as duas com TUDO CONFERE.
- ✅ **Publicar em um comando (salvek99)** · No Claude Code, o token salvek99 roda typecheck, testes e build, faz commit e push, dispara o redeploy pelo vps-panel e confere a produção: commit, container, migrações, /health e /doc. · `.claude/skills/salvek99/SKILL.md`
- ✅ **Documentação das rotas (Swagger e OpenAPI)** · Em https://99dev.pro/gymflow-api/doc e /openapi.json. Um teste falha se uma rota nova ficar sem documentação. · `src/routes/docs.ts`
- ✅ **Backup automático do banco** · Cron às 03:15 na VPS, 14 dias guardados em /var/backups/99dev/gymflow; o primeiro backup foi feito em 24/09 ao instalar. · `scripts/vps/gymflow-backup.sh`
- ✅ **Monitoramento e alertas** · Sonda a cada 5 minutos na VPS: na segunda falha seguida reinicia o container e alerta por e-mail (o mesmo SMTP da API) ou webhook; sem os dois, o alerta fica no log em /var/log/99dev. · `scripts/vps/gymflow-health.sh`
- ✅ **Termos de Uso e Política de Privacidade publicados** · HTML público que descreve o que a API faz de verdade com os dados. O contato vem de SUPPORT_EMAIL. · `GET /termos · /privacidade`
- ⬜ **SMTP e e-mail de contato configurados na VPS** · SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM e SUPPORT_EMAIL no .env.deploy. Sem eles, recuperação de senha e confirmação de e-mail respondem 503 e o alerta da sonda fica só no log.
- ⬜ **Volume das fotos e chave da IA na VPS** · STORAGE_DIR e STORAGE_SECRET com o volume do painel (passo a passo no guia de deploy) e ANTHROPIC_API_KEY. Até lá, as rotas respondem 503 e o app segue sem elas.

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

Na primeira vez: npx prisma dev --name gynflow --detach, cp .env.example .env e npm run db:migrate. A documentação local fica em http://localhost:3333/doc. Publicar é o token salvek99 no Claude Code. E-mail sai por SMTP_* do .env; sem SMTP, o código aparece no terminal. Mudou o schema? Nesta máquina o prisma migrate dev não cria o shadow database (o banco local é o template1); a saída está na seção 4 do guia 23-setembro-guia-deploy-api.md. Fotos e IA locais: STORAGE_DIR, STORAGE_SECRET e AI_PROVIDER=fake no .env (o .env.example explica); com ANTHROPIC_API_KEY, a IA de verdade.

**Antes de salvar** (`nos dois projetos`)

```bash
npm run typecheck && npm run lint                  # app
npm run typecheck && npm test && npm run build     # API
```

Os quatro passaram em 25/09. Na API, os 138 testes precisam do Postgres local no ar (npx prisma dev start gynflow) e levam cerca de 3 minutos.

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
- **Plano e registro do dia da conclusão (25/09):** `gymflow-mobile/25-setembro-concluindo.md`
- **Fluxo de entrada, temas e marca:** `gymflow-mobile/22-setembro-fluxo-inicial.md`
- **API publicada:** <https://99dev.pro/gymflow-api>
- **Documentação da API (Swagger):** <https://99dev.pro/gymflow-api/doc>
- **Saúde da API e do banco:** <https://99dev.pro/gymflow-api/health>
- **Código do app:** <https://github.com/srodrigo28/gymflow>
- **Código da API:** <https://github.com/srodrigo28/gymflow-api>
- **Publicação no painel 99dev:** `gymflow-api/23-setembro-guia-deploy-api.md`
- **Publicar a API em um comando:** `gymflow-api/.claude/skills/salvek99/SKILL.md`
