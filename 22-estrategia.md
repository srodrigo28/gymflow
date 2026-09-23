# 22 de setembro: estratégia do Gyn Flow

Como transformar o Gyn Flow em um app **evolutivo e viral** de treino, corpo e bem-estar: registro de atividades, evolução corporal com fotos, histórico que mostra o que está faltando, ranking justo, premiação e recomendações.

Este documento tem quatro partes:

1. **Análise da concorrência** e o que dá para fazer diferente.
2. **O produto**: registro, evolução, fotos, personal e recomendações.
3. **A viralização**: ligas, categorias de ranking, premiação e os laços de convite.
4. **O plano de execução**, em fases, com status e prompts prontos.

---

## Legenda de status

| Ícone | Significado |
| --- | --- |
| ⬜ | A fazer |
| 🟨 | Parcial |
| ✅ | Concluído |
| ⏸️ | Aguardando decisão |

## Resumo em uma página

- **O buraco no mercado**: os apps fortes de registro (Hevy, Strong, Fitbod) são excelentes em musculação e fracos em **corpo + bem-estar + academia local + personal**. Os apps sociais de desafio (GymRats) não guardam evolução. As plataformas brasileiras (Wellhub, Tecnofit) resolvem acesso e gestão, não a **evolução pessoal**. O Gyn Flow pode ser o app que junta **registro sério + evolução visível + comunidade da academia**.
- **O coração do produto**: cada treino registrado vira **evolução visível** (pontuação diária, gráfico, foto do mês) e **evidência do que está faltando** (volume por grupo muscular, frequência, equilíbrio).
- **O motor viral**: nada de ranking global de "quem é mais forte". Três laços: **desafio entre amigos por link**, **ranking da sua academia** e **o personal que traz os alunos**. Somados a cards compartilháveis de conquista e ao resumo mensal.
- **Ranking justo é regra de produto**: ligas por nível, força relativa (DOTS) em vez de carga bruta, e uma categoria de **evolução relativa** para que iniciante também possa ganhar.
- **Recomendação em três estágios**: regras → heurísticas com seus dados → IA (Claude) gerando o plano semanal e a explicação. O custo de infraestrutura fica em torno de **US$ 0,08 a 0,16 por usuário ativo por mês**, e cai com cache e processamento em lote.
- **100% grátis até 200 usuários (22/09)**: nenhum preço, plano pago, cupom ou campanha no app. Ao bater 200 cadastros, revisamos e abrimos campanhas de valor simbólico (R$ 1,00 ou R$ 5,00) em documento próprio (seção 5).
- **O que nunca entra**: ranking de menor peso, de percentual de gordura, feed público de fotos corporais e comparação entre corpos. Isso protege as pessoas e protege o app.

---

## 1. Análise da concorrência

### 1.1 Registro de treino (o padrão de qualidade)

| App | Forte | Fraco | O que copiar |
| --- | --- | --- | --- |
| **Hevy** | Registro de séries rápido, timer de descanso, supersets, gráficos, PRs e **camada social** (perfil, seguir, feed de treinos, comemoração de recorde). Plano gratuito realmente utilizável, Pro barato. | Pouco sobre corpo, sono e hábitos. Nada de academia local ou personal. | A **comemoração de recorde** e o feed leve de treinos como prova social. |
| **Strong** | Registro simples e querido pelos usuários. | Social quase inexistente. | A simplicidade da tela de série. |
| **Fitbod** | **Gera o treino** conforme equipamento, recuperação e histórico. 1.600+ exercícios. | É um gerador, não um diário social. | A lógica de sugerir o treino do dia com base no histórico. |
| **Jefit / SensAI** | Biblioteca e planos. | Interface pesada. | Nada essencial. |

> Os links de referência que você reuniu estão em `image/concorrencia/link-concorrencia.md` (Strava e Runna). Eles entraram nas tabelas abaixo.

### 1.2 Social e desafio

| App | Mecânica central | Lição |
| --- | --- | --- |
| **Strava** | Segmentos com **leaderboards**, Local Legend (quem mais repete um trecho em 90 dias), kudos, clubes e desafios. Clubes dão contexto de grupo sem precisar combinar nada na vida real. | Competição **local e por trecho** vale mais que ranking global. Clube é o que segura a pessoa. |
| **GymRats** | Você cria um desafio, convida o grupo, **posta foto do treino** e compete em um placar com pontuação configurável. | O **convite por link para um grupo fechado** é o laço viral mais fácil de copiar. A foto vira prova social e moderação natural. |
| **Runna** (`com.runbuddy.prod`, link que você mandou) | **Plano personalizado por objetivo** (5K, 10K, meia, maratona), com ritmo calculado para cada tipo de treino, parte de força e sincronia com Garmin, COROS, Apple Watch e Fitbit. Modelo de assinatura. | É a prova de que **plano personalizado é o que a pessoa valoriza**, mais que o registro em si. Nossa fase 6 (recomendação) precisa entregar isso para musculação, que é onde ninguém fez bem ainda. |
| **Duolingo** (fora do fitness) | Streak com proteção, XP, **ligas semanais** com promoção e rebaixamento. Ligas aumentaram muito o uso diário e a conclusão de tarefas. | Liga por nível, não ranking global. Streak com rede de proteção, senão a quebra vira desistência. |

### 1.3 Personal e academia

| Plataforma | O que faz | Lição |
| --- | --- | --- |
| **ABC Trainerize** | Padrão mundial para personal: prescrição, hábitos, mensagens, **fotos de progresso**, agenda, pagamentos e **indicação de novos alunos**. Mais de 400 mil profissionais. | O personal é um **canal de aquisição**: ele traz os alunos. Nosso diferencial é o aluno também querer ficar sozinho. |
| **Wellhub (ex-Gympass)** | Acesso a mais de 42 mil academias no Brasil via benefício corporativo. | Não competimos com acesso. Podemos **conviver**: o aluno usa o Wellhub para entrar e o Gyn Flow para evoluir. |
| **Tecnofit** | Gestão de academia, check-in que libera a catraca. | Integração de **check-in verificado** resolve nosso problema de fraude no ranking. |

### 1.4 Onde o Gyn Flow entra

Ninguém junta bem estas quatro coisas:

1. **Registro sério de treino** (Hevy faz).
2. **Evolução do corpo com fotos e medidas em linha do tempo** (Trainerize faz, mas só dentro da consultoria).
3. **Comunidade da academia com ranking justo** (Strava faz para corrida, ninguém faz bem para musculação no Brasil).
4. **Personal valorizado** (Trainerize faz, sem o lado social do aluno).

> **Posicionamento:** o Gyn Flow é o app onde **seu esforço vira evolução visível** e onde a **sua academia** e o **seu personal** aparecem junto.

---

## 2. O produto

### 2.1 Registro de atividades: o fluxo moderno

O registro precisa caber entre duas séries, com a mão suada. Regras de desenho:

- **Dois toques para começar**: a home mostra o treino do dia; "Começar" abre o cronômetro.
- **Uma série por linha**, com teclado numérico grande, botão **"repetir última série"** e marcação de concluída com um toque.
- **Timer de descanso automático** ao concluir a série, com aviso e som opcional.
- **Recorde detectado sozinho** (carga, repetições ou volume) com comemoração e card compartilhável.
- **RPE opcional** (o quanto foi difícil, 1 a 10): entra como sinal para a recomendação.
- **Funciona sem internet**, e sincroniza depois. Academia tem sinal ruim.
- **Modalidades além da musculação**: corrida/esteira, bike, funcional, luta, natação, yoga. Cada uma com os campos que importam (tempo, distância, séries).
- **Importa do relógio**: Apple Health e Health Connect para cardio, passos e peso.

### 2.2 Histórico que mostra o que está faltando

Não basta guardar. O histórico precisa responder três perguntas:

| Pergunta | Resposta no app |
| --- | --- |
| Eu treinei o quanto? | **Semana e mês** em barras, com meta de frequência e sequência. |
| Eu treinei o quê? | **Mapa do corpo**: volume por grupo muscular, com destaque para o que ficou de fora. |
| Está equilibrado? | Empurrar × puxar × pernas × core, e força × cardio × mobilidade. |

Disso saem os avisos úteis: "faz 12 dias que você não treina costas", "seu volume de pernas caiu 40% neste mês", "você treinou 4× por semana no mês passado e 2× neste".

### 2.3 Evolução do corpo: medidas e fotos

Esse é o coração emocional do app.

- **Medidas**: peso, percentual de gordura e massa magra (quando houver balança), circunferências (cintura, quadril, braço, coxa, peito) e IMC como contexto, nunca como nota.
- **Fotos por mês**: a pessoa envia **uma ou mais fotos**, escolhe o **mês de referência** (o que você pediu) e a pose (frente, lado, costas). O app monta a **linha do tempo** e o **comparador lado a lado** (mês A × mês B).
- **Privacidade por padrão**: foto de corpo é dado sensível. Nasce **privada**, só sua. Compartilhar é uma decisão ativa, com opções de tarja no rosto e recorte.
- **Lembrete mensal** no mesmo dia e com a mesma pose (guia de contorno na câmera), porque foto comparável é foto tirada igual.

> **Regra de ouro da evolução**: a comparação é **você contra você**. Nunca contra outra pessoa.

### 2.4 Personal: valorizar quem treina gente

Quando o aluno tem personal, o app tem que **fazer o nome do profissional**:

- **Vínculo por convite**: o personal manda um link, o aluno aceita e escolhe o que compartilha (treinos, medidas, fotos ou nada).
- **Painel do personal**: lista de alunos, aderência da semana, quem sumiu, quem evoluiu, quem reclamou de dor.
- **Prescrição**: monta o treino, o aluno vê no celular, registra, e o personal enxerga o que aconteceu de verdade (carga, RPE, o que pulou).
- **Selo e página do profissional**: "Personal do Rodrigo", com conquistas dos alunos (com permissão deles) e depoimentos. Isso é o que "faz o moral do cara".
- **Ranking de personais**: **nunca** por peso perdido. Por **aderência dos alunos** e **evolução relativa média**, que é o que um bom profissional entrega.

### 2.5 Recomendações: três estágios

| Estágio | O que é | Quando |
| --- | --- | --- |
| **V1: regras** | Progressão de carga (se completou todas as séries no topo da faixa, sobe 2,5 kg), rodízio de grupos musculares, descanso, alerta de ausência, treino do dia dentro do plano. Sem IA, barato e previsível. | Fase 1 a 3 |
| **V2: heurísticas com seus dados** | Ajusta pelo histórico real: aderência, RPE, sono, sequência. Sugere semana leve (deload) a cada 5 a 6 semanas, e "hoje é dia de perna, você não treina há 10 dias". | Fase 4 |
| **V3: IA (Claude)** | Gera o **plano da semana** com explicação em linguagem humana, escreve o **resumo mensal**, interpreta a evolução das medidas e responde "por que esse treino?". A IA explica; as regras continuam garantindo segurança. | Fase 5 |

**Como rodar a IA sem quebrar o caixa** (números de referência da API da Anthropic):

- Modelo padrão: **`claude-opus-5`** (US$ 5 por milhão de tokens de entrada, US$ 25 de saída). Se o custo apertar, meça antes de trocar: `claude-sonnet-5` (US$ 2 / US$ 10) e `claude-haiku-4-5` (US$ 1 / US$ 5) existem, mas a escolha é sua e precisa de comparação de qualidade.
- **Cache de prompt**: a parte fixa (instruções, biblioteca de exercícios, regras de segurança) fica em cache e a leitura sai por cerca de um décimo do preço.
- **Processamento em lote**: planos semanais gerados de madrugada pela Batch API custam **metade**.
- **Estimativa por usuário** (isto é **custo de infraestrutura**, não preço; os valores cobrados estão zerados, ver seção 5): um plano semanal com ~3 mil tokens de entrada e ~1 mil de saída dá cerca de **US$ 0,04 por semana**. Com cache e lote, algo perto de **US$ 0,02**. Ou seja, da ordem de **US$ 0,08 a 0,16 por usuário ativo por mês** — o teto que o desenho da feature precisa respeitar.
- **Nunca** deixe a IA definir carga sozinha sem os limites das regras. Ela sugere e explica; a regra impede o absurdo.

---

## 3. A estratégia viral

### 3.1 Os quatro laços (em ordem de força)

| # | Laço | Como funciona | Por que funciona |
| --- | --- | --- | --- |
| 1 | **Desafio entre amigos** | Crie um desafio de 30 dias, convide por **link no WhatsApp**, cada treino vira ponto, placar do grupo. | É o laço do GymRats: grupo fechado, cobrança amigável, entrada sem fricção. |
| 2 | **Personal traz os alunos** | O personal convida os alunos para acompanhar o treino. Cada aluno convida amigos. | Um profissional traz de 10 a 40 pessoas. É o laço com maior multiplicação. |
| 3 | **Ranking da academia** | Quem treina na mesma academia aparece num ranking local, com pódio semanal. | Pertencimento local vale mais que ranking global, como os clubes do Strava. |
| 4 | **Card de conquista** | Recorde, sequência, resumo da semana e **retrospectiva mensal** viram imagem bonita com a marca, pronta para o story. | A imagem circula onde estão os amigos que ainda não usam o app. |

**Convite reconhecido**: quem convida e quem entra ganham **XP em dobro por uma semana** e um selo de "trouxe gente para treinar". Sem prêmio em dinheiro, cupom ou mês grátis: valores e campanhas estão zerados nesta fase (seção 5).

### 3.2 Ligas, pontos e temporada

- **Pontuação (XP)**: treino concluído, séries registradas, check-in verificado, meta semanal batida, foto do mês, medidas atualizadas. Peso levantado **não** vira XP direto, para não incentivar exagero.
- **Ligas semanais** (Bronze, Prata, Ouro, Elite), com 20 a 30 pessoas por grupo, promoção e rebaixamento. Você compete com gente do seu nível, não com o topo do país.
- **Temporada mensal**: no fim do mês, premiação, zera o placar e começa de novo. Quem entrou tarde não fica para sempre atrás.
- **Sequência (streak)** com **proteção**: dois "escudos" por mês, um dia de folga planejada não quebra. Sequência sem rede de proteção vira motivo de abandono.

### 3.3 Categorias de ranking (o que você pediu, com justiça embutida)

| Categoria | Como mede | Regra de justiça |
| --- | --- | --- |
| **Constância** | Treinos concluídos na semana/mês | Igual para todos. É a categoria principal. |
| **Pontualidade** | % de treinos feitos no horário agendado | Só conta se a pessoa agendou. Sem agenda, não entra. |
| **Tonelagem** (quem mais pega peso) | Volume total: carga × repetições | Faixas por **peso corporal** e **nível**. Volume bruto favorece quem é maior. |
| **Força relativa** (quem levanta mais peso) | **DOTS** sobre os três básicos | O DOTS normaliza pelo peso corporal e é o padrão adotado hoje no lugar do Wilks. É o que torna a comparação honesta entre pessoas de tamanhos diferentes. |
| **Esteira / cardio** | Distância, tempo ou elevação | Rankings separados por modalidade. Correr 5 km não é o mesmo que pedalar 5 km. |
| **Modalidade** | Mais treinos de funcional, luta, natação, yoga… | Um pódio por modalidade, para não existir só um tipo de campeão. |
| **Em evolução** | Maior progresso **relativo** no mês | Protege quem está começando: quem sai de 20 kg para 26 kg evolui 30%, e isso vale tanto quanto o avançado que sobe 3%. |
| **Equilíbrio** | Sono, água e humor registrados + treino | Recompensa cuidado, não só esforço. |

**Premiação (só reconhecimento, sem valor financeiro)**: troféu da temporada no perfil, selo permanente ("Campeão de Constância, março"), destaque no mural da academia e card de campeão para compartilhar. Prêmio físico, cupom e parceria com marca ficam para quando houver campanha (seção 5).

### 3.4 Antifraude

Ranking só vale se o dado for confiável:

- **Check-in verificado** por geolocalização da academia, QR na recepção ou integração com a catraca (ex.: Tecnofit). Rankings mostram **"verificado"** e **"declarado"** separados.
- **Teto diário de pontos**, para maratona de registro não ganhar de treino real.
- **Cargas fora da curva** entram como "a confirmar" e não pontuam até validação (vídeo, testemunha do grupo ou aval do personal).
- Desafios entre amigos usam **foto de check-in**, como no GymRats: o próprio grupo faz a moderação.

### 3.5 O que fica fora, de propósito

- Ranking de **menor peso**, de **percentual de gordura** ou de "melhor corpo".
- Feed público com fotos corporais.
- Comparação entre corpos de pessoas diferentes.
- Linguagem de culpa ("você falhou", "você está atrasado"). O tom é o do Gentler Streak: acolhedor, sem comparação.

Isso não é só ética: é o que evita processo, denúncia nas lojas e desgaste de marca.

---

## 4. Privacidade e LGPD (obrigatório, não opcional)

Peso, medidas, percentual de gordura e **foto corporal com finalidade de saúde** são **dados sensíveis** pela LGPD. Isso muda o que precisa ser feito:

- **Base legal**: consentimento **específico e destacado** para dados de saúde e fotos, separado do aceite geral dos termos.
- **Privado por padrão**: nada de foto ou medida aparecendo para terceiros sem ação explícita.
- **Compartilhamento granular** com o personal: treinos, medidas e fotos são três chaves diferentes, e o aluno pode revogar a qualquer momento.
- **Armazenamento**: fotos em bucket privado com URL assinada e expiração curta, nunca URL pública adivinhável. Miniaturas geradas no servidor.
- **Direitos**: exportar tudo e **apagar a conta com as fotos** em até 15 dias, com confirmação por escrito.
- **Menores**: 16 anos como mínimo, com consentimento do responsável abaixo disso.
- **Retenção**: foto apagada sai também do backup no prazo definido na política.

---

## 5. Planos e valores — 100% grátis até 200 usuários

**Regra de hoje (22/09): o app é 100% gratuito, sem exceção.** Nenhum recurso trancado, nenhum preço em tela, nenhuma campanha.

| Plano | Valor | O que entrega |
| --- | --- | --- |
| **Grátis** | **R$ 0,00** | Tudo o que existir no app. |
| **Premium** | **R$ 0,00** (a definir) | Sem diferença enquanto o app for gratuito. |
| **Personal** | **R$ 0,00** (a definir) | Painel de alunos, prescrição, relatórios e página do profissional, liberados. |
| **Academia** | **R$ 0,00** (a definir) | Ranking da unidade, mural, check-in integrado e relatórios, liberados. |

### 5.1 O gatilho: 200 usuários

**Enquanto não houver 200 usuários cadastrados, nada é cobrado.** Ao bater essa marca, paramos e decidimos as campanhas em um documento próprio (`22-campanhas.md`). Até lá, o assunto não volta.

- **A conta é de usuários cadastrados**, porque é o número mais simples de medir e de conferir. Vale acompanhar também quantos estão ativos por semana: 200 cadastros com 20 ativos não significa a mesma coisa que 200 com 120.
- O app precisa **mostrar esse número para você** (um painel simples de administração já na fase 1), senão o gatilho não é verificável.

### 5.2 Depois dos 200: campanhas de valor simbólico

A ideia é **R$ 1,00 ou R$ 5,00**, valores de apoio, não de assinatura cara. Três formatos que combinam com isso:

| Formato | Como seria | Cuidado |
| --- | --- | --- |
| **Apoiador** | R$ 5,00 uma vez, com selo de apoiador no perfil. Não desbloqueia nada. | É o mais simples e o que menos mexe no produto. |
| **Campanha pontual** | R$ 1,00 numa temporada específica (ex.: "Desafio de verão"), revertido em prêmio da própria temporada. | Precisa de regra clara de destino do dinheiro. |
| **Extra cosmético** | R$ 1,00 por tema extra ou moldura de card. | Nunca cobrar por tema que já existe de graça hoje. |

**Princípio que não muda**: registro, histórico, evolução, fotos e ranking continuam gratuitos. O valor simbólico é apoio ou enfeite, nunca pedágio no que a pessoa já usava.

### 5.3 O que a loja exige (para não travar na hora de cobrar)

- **Play Store**: o preço mínimo no Brasil é **R$ 0,99**, então R$ 1,00 é viável. Antes de publicar, confirme a faixa vigente no Play Console.
- **App Store**: use a faixa mais baixa disponível em reais no momento; a Apple trabalha com faixas de preço próprias.
- **Conteúdo digital passa pela compra da loja.** Se o valor desbloqueia qualquer coisa dentro do app (selo, tema, temporada), tem que ser compra no app, com a comissão da loja. Pix direto no app para liberar recurso digital é o caminho mais rápido para a remoção.
- **Pix faz sentido para serviço fora do app** (a consultoria do personal, por exemplo), e aí entram regras fiscais próprias.
- **Cobrança exige base legal e nota**: CNPJ, política de reembolso e termos atualizados. Isso entra no `22-campanhas.md`, não aqui.

**Por que essa ordem**: o gratuito é o que alimenta ranking, desafio e convite. É ele que gera os 200 primeiros usuários, que por sua vez dão sentido a qualquer valor depois. O Hevy mostra que dá para crescer com plano grátis realmente utilizável.

---

## 6. Métricas que importam

| Métrica | Alvo inicial | Por que |
| --- | --- | --- |
| **Treinos por usuário/semana** | 3+ | É o hábito. Sem ele, nada mais acontece. |
| **D7 / D30** | 40% / 20% | Retenção é o termômetro do produto. |
| **Fator K** (convites aceitos por usuário) | 0,4+ | Abaixo disso, crescer só com anúncio. |
| **% com foto do mês** | 30% | É o que gera o "uau" do antes e depois. |
| **% em desafio ativo** | 35% | Desafio é o que mais puxa retorno. |
| **Alunos por personal** | 12+ | Mede o laço B2B2C. |
| **Usuários cadastrados** | **200** | É o gatilho combinado: até lá, 100% grátis (seção 5). Precisa estar visível num painel. |
| **Custo de infraestrutura de IA por usuário ativo** | < US$ 0,20/mês | É gasto nosso, não preço para o usuário. Com 200 usuários, isso é da ordem de US$ 40/mês no pior caso. |

---

## 7. Plano de execução

### Fase 1 — Fundação do registro 🟨 (em 22/09)

**Objetivo:** registrar treino bem feito e ver o histórico. Sem isso, nada de social.

**Entregas**
- Modelo de dados: `exercicio`, `treino`, `serie`, `sessao`, `checkin`.
- Tela de treino: séries, timer de descanso, repetir série, concluir.
- Biblioteca de exercícios com grupo muscular e equipamento.
- Funciona offline com fila de sincronização.
- Histórico semanal e mensal, com volume por grupo muscular.
- Detecção automática de recorde.
- **Contador de usuários cadastrados e ativos na semana**, visível só para você. É o que mede o gatilho dos 200 (seção 5.1).

**Situação em 22/09:** feito tudo, menos o contador de usuários (depende da API real) e o check-in.
Detalhes em **Registro da Fase 1** no fim do documento.

**Critérios de aceite**: registrar um treino de 6 exercícios em menos de 90 segundos de interação; funcionar em modo avião; o histórico bate com o que foi registrado.

```txt
Leia 22-estrategia.md (Fase 1) e siga o padrão de temas e componentes do
22-setembro-fluxo-inicial.md. Implemente o registro de treino: modelo de dados
local (expo-sqlite) com fila de sincronização, tela de sessão com séries, timer
de descanso, repetir última série e detecção de recorde, além do histórico
semanal e mensal com volume por grupo muscular. Use os tokens do tema e as
cores de domínio. Rode typecheck e lint.
```

### Fase 2 — Corpo e fotos 🟨 (em 22/09)

**Objetivo:** a evolução ficar visível.

**Entregas**
- Medidas (peso, circunferências, gordura quando houver) com gráfico.
- Foto do mês: upload de uma ou mais, escolha do mês e da pose, guia de contorno na câmera.
- Linha do tempo e comparador lado a lado.
- Privacidade: privado por padrão, tarja opcional, consentimento específico.
- Integração com Apple Health e Health Connect para peso e cardio.

**Situação em 22/09:** medidas com gráfico, fotos por mês e pose, linha do tempo e comparador
lado a lado estão prontos e rodando offline. Falta o que depende de servidor (URL assinada,
tarja, revogação de compartilhamento) e a integração com Health Connect/Apple Health.
Detalhes em **Registro da Fase 2** no fim do documento.

**Critérios de aceite**: enviar duas fotos de meses diferentes e ver a comparação; revogar o compartilhamento e a foto sumir para o outro lado na hora.

```txt
Leia 22-estrategia.md (Fase 2 e a seção de privacidade). Implemente o perfil de
evolução: medidas com gráfico, upload de fotos com mês de referência e pose,
linha do tempo, comparador lado a lado e controles de privacidade (privado por
padrão, consentimento específico para dados de saúde, revogação imediata).
Fotos em armazenamento privado com URL assinada. Rode typecheck e lint.
```

### Fase 3 — Social e desafios 🟨 (em 23/09)

**Objetivo:** ligar o primeiro laço viral.

**Entregas**: amigos, desafio com link de convite, check-in com foto, placar do desafio, card compartilhável de recorde e de resumo semanal.

**Situação em 23/09:** o card compartilhável de recorde e de resumo semanal está pronto e roda sem
servidor. Amigos, desafio por link, check-in com foto e placar dependem da API.
Detalhes em **Registro da Fase 3** no fim do documento.

**Critérios de aceite**: criar um desafio e entrar por link em menos de 30 segundos, sem cadastro prévio obrigatório até o momento de pontuar.

### Fase 4 — Ranking, ligas e premiação ⬜

**Entregas**: XP, ligas semanais, temporada mensal, as oito categorias da seção 3.3, DOTS para força relativa, check-in verificado, troféus e selos.

**Critérios de aceite**: dois usuários de pesos diferentes com o mesmo DOTS aparecem lado a lado; ranking separa verificado de declarado.

### Fase 5 — Personal e academia ⬜

**Entregas**: vínculo por convite com permissões granulares, painel do personal, prescrição, página do profissional, mural da academia.

### Fase 6 — Recomendação com IA ⬜

**Entregas**: plano semanal gerado por IA com explicação, resumo mensal, leitura das medidas; regras de segurança por cima; execução em lote de madrugada com cache de prompt; medição de custo por usuário.

**Critérios de aceite**: custo medido por usuário ativo abaixo de US$ 0,20/mês; nenhuma sugestão fora dos limites das regras.

---

## 8. Prompt melhorado

O prompt abaixo substitui o pedido original. Ele diz **o que**, **para quem**, **com quais limites** e **o que entregar** — que é o que faltava.

```txt
Você é meu parceiro de produto e engenharia no Gyn Flow, um app de treino,
corpo e bem-estar feito em Expo/React Native, com temas e design já definidos
em 22-setembro-fluxo-inicial.md.

Contexto: o app já tem splash, hero, login, cadastro, onboarding e sistema de
temas. Agora quero o núcleo do produto: registro de atividades, evolução
corporal e a camada social que faz o app crescer sozinho.

Objetivo: transformar cada treino registrado em evolução visível, e transformar
evolução visível em convite para outras pessoas.

Faça, nesta ordem:
1. Analise a concorrência (Hevy, Strong, Fitbod, Strava, GymRats, Trainerize e
   o mercado brasileiro: Wellhub, Tecnofit, Smart Fit) e diga onde há espaço.
2. Proponha o fluxo de registro de treino que funcione entre duas séries, com
   a mão suada, sem internet.
3. Proponha o histórico que responda "o que está faltando no meu treino".
4. Proponha a evolução corporal: medidas e fotos por mês, com comparação e
   privacidade por padrão (LGPD: foto e medida são dados sensíveis).
5. Proponha a camada do personal, que valorize o profissional e traga alunos.
6. Desenhe a estratégia viral: laços de convite, ligas, temporadas, categorias
   de ranking e premiação. O ranking precisa ser justo entre pessoas de
   tamanhos e níveis diferentes, e não pode incentivar exagero ou comparação
   de corpos.
7. Desenhe a recomendação em estágios: regras primeiro, IA depois, com custo
   estimado por usuário.

Limites que não podem ser quebrados:
- Nada de ranking de peso corporal, gordura ou "melhor corpo".
- Fotos nascem privadas; compartilhar é decisão ativa e revogável.
- Linguagem sem culpa e sem comparação entre pessoas.
- Nenhum número inventado de usuários ou de resultado.

Entregue: um documento com resumo, análise, funcionalidades priorizadas por
impacto e esforço, métricas de sucesso, riscos e um plano em fases com status
e prompts prontos para executar cada fase.
```

---

## 9. Riscos e como tratar

| Risco | Tratamento |
| --- | --- |
| **Vazamento de foto corporal** | Bucket privado, URL assinada curta, sem CDN pública, log de acesso, exclusão real no prazo. |
| **Comparação de corpos e gatilho de transtorno alimentar** | Sem ranking de peso ou gordura, sem feed público de fotos, comparação só com você mesmo, linguagem acolhedora. |
| **Incentivo a carga perigosa** | XP não premia peso bruto; força relativa por DOTS; alerta de salto de carga; validação de recorde. |
| **Ranking falso** | Check-in verificado, teto diário, separação entre verificado e declarado. |
| **Custo de IA sair do controle** | Regras primeiro, IA em lote com cache, teto por usuário, medição contínua. |
| **Ficar só mais um app de registro** | A evolução visível (foto + pontuação + retrospectiva) e a academia local são o diferencial; priorize as fases 2 e 3 antes de qualquer refinamento do registro. |
| **Dependência do personal** | O app precisa ser bom sozinho: o aluno que perde o personal continua tendo motivo para abrir. |

---

## Registro da Fase 1 (22/09)

**O que foi construído**

- **Banco local** (`src/db/`): `expo-sqlite` com migrações versionadas (`PRAGMA user_version`), tabelas `exercises`, `sessions`, `session_exercises`, `sets` e a fila `outbox`, que guarda o que ainda não subiu para a API. A semente traz 37 exercícios em português, com grupo muscular, padrão de movimento e equipamento.
- **Serviço** (`src/services/training.ts`): começar/retomar/descartar/finalizar sessão, adicionar exercício e série, concluir série, resumo por período e "dias desde o último treino de cada grupo". Recorde usa a carga máxima **ou** a carga estimada para 1 repetição (fórmula de Epley), então 60 kg × 10 conta como evolução mesmo sem bater o peso máximo.
- **Telas** (`app/(app)/treino/`): o *hub* (começar/continuar, resumo da semana, "o que está faltando", últimos treinos), a sessão (cronômetro, séries, descanso de 90 s com +15 s e pular, recorde na hora, tela sempre acesa), a busca de exercícios e o histórico (semana/mês com barras de volume por grupo).
- **Repetir a última série**: ao adicionar uma série, o app copia a anterior do mesmo exercício; se for o primeiro do dia, copia a última vez que a pessoa fez aquele exercício. Registrar vira confirmar, não digitar.

**Bug encontrado no teste e corrigido**

As cargas eram gravadas só quando o campo perdia o foco (`onEndEditing`). Quem digita a carga, digita as repetições e toca no check em seguida — o gesto real — marcava a série **sem carga**, e o treino ia para o histórico com 0 kg. Agora cada tecla grava, e as escritas do serviço entram em **fila**, de modo que o valor já está no banco quando o recorde é calculado.

**Como foi validado** (emulador Android 16, Expo Go, banco nativo)

| Verificação | Resultado |
| --- | --- |
| Criar sessão, escolher exercício, registrar série | Supino reto, 60 kg × 10 |
| Recorde detectado e marcado com troféu | ✅ |
| Descanso de 90 s aparece ao concluir a série | ✅ |
| Volume do treino | Agachamento 80 kg × 5 = **400 kg** |
| Resumo da semana soma os treinos | 66,0 t + 400 kg = **66,4 t** |
| Histórico por grupo muscular | Peito 66,0 t · Pernas 400 kg |
| **Modo avião** | Remada curvada 50 kg × 12 = **600 kg**, registrada sem rede |

**Web**: o `expo-sqlite` no navegador precisa de `SharedArrayBuffer` e de um *worker*, que não sobe no servidor de desenvolvimento do Metro. O registro de treino, por enquanto, é testado no Android e no iOS. Para o site não quebrar no empacotamento, `web.output` passou de `static` para `single` (o `.wasm` do banco não sobrevive à renderização no servidor).

**Fora desta fase**: contador de usuários cadastrados (depende da API real), check-in na academia e a sincronização de verdade — a fila `outbox` já grava o que precisará subir.

## Registro da Fase 2 (22/09)

**O que foi construído**

- **Medidas** (`src/services/body.ts`, `app/(app)/corpo/medidas.tsx`): peso, gordura, cintura, quadril, peito, braço e coxa. Todos os campos são opcionais menos a data — ninguém mede sete circunferências toda semana, e exigir isso faria a pessoa desistir na segunda vez. Uma pesagem sozinha já salva.
- **Gráfico de peso** (`src/components/body/WeightChart.tsx`): linha com área, ponto destacado no valor mais recente e a variação desde a primeira pesagem. A escala tem faixa mínima de 2 kg, senão uma variação de 200 g viraria um pico dramático.
- **Fotos** (`app/(app)/corpo/fotos.tsx`): câmera ou galeria, com **mês de referência** (últimos seis meses) e **pose** (frente, lado, costas). A última foto da mesma pose aparece ao lado dos botões como referência de enquadramento — é o substituto barato do guia de contorno na câmera, que ficou para depois.
- **Comparador** (`app/(app)/corpo/comparar.tsx`): antes e depois lado a lado, com seletor de mês em cada lado. Ao abrir, já vem o mais antigo contra o mais novo, que é a comparação que a pessoa quer ver primeiro.
- **Privacidade**: a foto escolhida é **copiada para a área privada do app**, e não apenas referenciada — o arquivo da galeria pode sumir. Nada sai do aparelho: as duas telas dizem isso em texto, em vez de deixar implícito.

**Bug de acessibilidade corrigido no caminho**

Os campos do `Input` não tinham nome para o leitor de tela: com sete campos usando o mesmo placeholder (`—`), o TalkBack anunciava sete vezes a mesma coisa. Agora o rótulo visível vira o nome acessível ("Peso em kg", "Cintura em cm"). Isso vale para todas as telas do app, não só para as medidas.

**Como foi validado** (emulador Android 16, Expo Go)

| Verificação | Resultado |
| --- | --- |
| Salvar medidas | 82 kg e 88 cm de cintura, no histórico como "22 set · peso 82 kg · cintura 88 cm" |
| Segunda pesagem desenha a linha | 82 → 80,6 kg, com "−1,4 kg desde o início" |
| Foto pela câmera, com permissão | salva em setembro, pose frente |
| Foto em outro mês | agosto, pela mesma tela |
| Comparador | Antes agosto · Depois setembro, com troca de mês nos dois lados |
| Nomes para leitor de tela | "Peso em kg", "Gordura corporal em %", "Cintura em cm" |

**Fora desta fase**: guia de contorno na câmera (precisa de câmera própria, não do seletor do sistema), tarja e revogação de compartilhamento (só fazem sentido quando existir o outro lado, na Fase 3), armazenamento com URL assinada (depende da API) e Health Connect/Apple Health.

## Registro da Fase 3 (23/09, parcial)

Por enquanto, só o card compartilhável: é a parte da fase que não depende de servidor.

**O que foi construído**

- **Tela Compartilhar** (`app/(app)/compartilhar.tsx`), aberta pelo botão de compartilhar no topo do hub de Treino. Tem duas abas: **Recorde**, com o recorde mais recente (`listPersonalRecords`), e **Semana**, com treinos, volume e cardio desde segunda-feira. A rota aceita `?tipo=semana` para abrir direto na segunda aba.
- **Card** (`src/components/share/ShareCard.tsx`) em 4:5 (360 × 450), com a aurora do tema, a marca, o nome da pessoa e o lema "disciplina hoje, resultados sempre". Número zerado não entra na imagem: numa semana sem cardio, o card mostra só o volume.
- **A imagem é gerada no aparelho** (`react-native-view-shot`) e vai para a folha de compartilhamento do sistema (`expo-sharing`). Nada é publicado sozinho, e a tela diz isso em texto.
- **Tamanho da imagem**: 360 × 450 vezes a densidade da tela. Num aparelho de densidade 3 isso dá 1080 × 1350, o tamanho que o Instagram recomenda para 4:5.

**Corrigido antes do primeiro commit**

- O card tinha largura fixa de 360 e saía das margens em quase todo celular: sobram 320 dp num Android de 360 dp e 350 pt num iPhone de 390 pt. Agora a **prévia encolhe** para caber, e a imagem exportada continua com o tamanho cheio, porque a captura desenha o card sem a escala aplicada por fora.
- A imagem saía com **cantos arredondados transparentes**, que viram preto ou branco quando o app de destino converte o arquivo. O arredondamento passou para a moldura da prévia, e a imagem sai como um retângulo cheio.
- A aba Semana **nunca mostrava o aviso de vazio**: numa semana sem treino, o card aparecia com "0 treinos".
- O aviso de vazio **piscava** enquanto os dados carregavam, e uma falha na captura virava erro sem tratamento. O botão passou a ser o `Button` do app, que mostra o carregamento e não aceita um segundo toque enquanto a folha abre.

**Como foi validado** (emulador Android `lume_test`, Expo Go)

| Verificação | Resultado |
| --- | --- |
| Botão no hub de Treino abre a tela | ✅ |
| Aba Recorde | Remada curvada, 50 kg × 12 |
| Aba Semana bate com o hub | 4 treinos e 67,0 t; o cardio (0 min) fica fora da imagem |
| `?tipo=semana` abre na aba certa | ✅ |
| Tela de 411 dp | card em tamanho real; imagem de 945 × 1181 |
| Tela de 360 dp (densidade 480) | prévia com 320 dp, dentro das margens; imagem inteira, 1080 × 1350 |
| Cantos da imagem exportada | opacos nos quatro cantos |
| Semana sem treinos (relógio adiantado 7 dias) | "Ainda não há treinos nesta semana." |
| Folha de compartilhamento do Android | abre com a imagem |

O tamanho e os cantos foram medidos no PNG gerado: durante o teste, um trecho temporário enviou uma cópia da captura para o computador. O trecho foi removido antes do commit.

**Ainda não feito**: comemoração com card logo na tela da sessão, ao bater o recorde; cards de sequência e de retrospectiva mensal; teste em iPhone. Amigos, desafio por link, check-in com foto e placar dependem da API.

## Fontes da pesquisa

- [Hevy vs Strong vs Fitbod vs Jefit (SensAI, 2026)](https://www.sensai.fit/blog/hevy-vs-strong-vs-fitbod-vs-jefit)
- [Best Workout Tracker Apps for 2026 (Fitbod)](https://fitbod.me/blog/best-workout-tracker-apps-for-2026/)
- [Strava Gamification Strategy (Trophy, 2026)](https://trophy.so/blog/strava-gamification-case-study)
- [How Strava drives app engagement (StriveCloud)](https://www.strivecloud.io/blog/app-engagement-strava)
- [GymRats · fitness challenge](https://www.gymrats.app/features)
- [Duolingo gamification explained (StriveCloud)](https://www.strivecloud.io/blog/gamification-examples-boost-user-retention-duolingo)
- [Duolingo's gamification secrets (Orizon)](https://www.orizon.co/blog/duolingos-gamification-secrets)
- [ABC Trainerize: features](https://www.trainerize.com/features/) · [roadmap 2026](https://www.trainerize.com/blog/abc-trainerize-2026-product-roadmap/)
- [Wellhub (ex-Gympass): como funciona para academias (Tecnofit)](https://www.tecnofit.com.br/blog/como-funciona-o-gympass/)
- [Dados sensíveis na LGPD (Serpro)](https://www.serpro.gov.br/lgpd/menu/protecao-de-dados/dados-sensiveis-lgpd)
- [LGPD: fotos, inferências e a sensibilidade de dados pessoais](https://www.linkedin.com/pulse/lgpd-fotos-infer%C3%AAncias-e-sensibilidade-de-dados-cesar-ferreira-mcf)
- [DOTS: pontuação de força relativa (Lift Vault)](https://liftvault.com/resources/powerlifting-calculator/) · [Wilks coefficient (Wikipedia)](https://en.wikipedia.org/wiki/Wilks_coefficient)
- [Behind the Design: Gentler Streak (Apple)](https://developer.apple.com/news/?id=3m0ht22s)
- [Configurar os preços do app (Ajuda do Play Console)](https://support.google.com/googleplay/android-developer/answer/6334373?hl=pt-BR) · [Google reduz o preço mínimo de apps em 17 países](https://baixarplaystore.com.br/google-reduz-o-preco-minimo-de-apps-099-em-17-paises/)
- [Runna: Running Plans & Coach (Play Store)](https://play.google.com/store/apps/details?id=com.runbuddy.prod) e [Strava (Play Store)](https://play.google.com/store/apps/details?id=com.strava) — links enviados por você
