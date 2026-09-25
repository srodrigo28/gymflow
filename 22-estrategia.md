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

### Fase 1 — Fundação do registro ✅ (em 24/09)

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
**Em 23/09:** o contador existe (painel de administração) e a sincronização é de verdade: os treinos
concluídos sobem sozinhos para a conta e, num aparelho novo, descem sozinhos. Falta o check-in.
Detalhes em **Registro da Fase 1**, **Registro da API** e **Registro do Perfil e da restauração** no fim do documento.

**Critérios de aceite**: registrar um treino de 6 exercícios em menos de 90 segundos de interação; funcionar em modo avião; o histórico bate com o que foi registrado.

```txt
Leia 22-estrategia.md (Fase 1) e siga o padrão de temas e componentes do
22-setembro-fluxo-inicial.md. Implemente o registro de treino: modelo de dados
local (expo-sqlite) com fila de sincronização, tela de sessão com séries, timer
de descanso, repetir última série e detecção de recorde, além do histórico
semanal e mensal com volume por grupo muscular. Use os tokens do tema e as
cores de domínio. Rode typecheck e lint.
```

### Fase 2 — Corpo e fotos 🟨 (em 25/09)

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

**Situação em 24/09:** as medidas passaram a poder ficar na conta, com consentimento específico e
destacado (cartão na Evolução), e voltam num aparelho novo; retirar o consentimento apaga tudo do
servidor na hora. Fotos continuam só no aparelho. Detalhes em **Registro das medidas na conta**.

**Situação em 25/09:** as fotos também podem ficar na conta, com consentimento próprio, separado do das
medidas. O servidor refaz cada foto sem metadados, guarda numa pasta privada e só a entrega por links de 10
minutos que conferem o consentimento na hora; retirar apaga tudo do servidor. O personal só vê as fotos com
a permissão do aluno, e perde o acesso no instante em que ela é desligada (coberto por teste). Em produção,
liga quando o volume e o segredo das fotos forem configurados na VPS. Falta o Health Connect e o Apple
Health, que dependem do build nativo. Detalhes em **Registro da conclusão (25/09)**.

**Critérios de aceite**: enviar duas fotos de meses diferentes e ver a comparação; revogar o compartilhamento e a foto sumir para o outro lado na hora.

```txt
Leia 22-estrategia.md (Fase 2 e a seção de privacidade). Implemente o perfil de
evolução: medidas com gráfico, upload de fotos com mês de referência e pose,
linha do tempo, comparador lado a lado e controles de privacidade (privado por
padrão, consentimento específico para dados de saúde, revogação imediata).
Fotos em armazenamento privado com URL assinada. Rode typecheck e lint.
```

### Fase 3 — Social e desafios ✅ (em 25/09)

**Objetivo:** ligar o primeiro laço viral.

**Entregas**: amigos, desafio com link de convite, check-in com foto, placar do desafio, card compartilhável de recorde e de resumo semanal.

**Situação em 23/09:** card compartilhável, desafio com link de convite e placar prontos, com a API.
Quem não tem conta vê o convite, se cadastra por ele e entra no desafio. Faltam amigos e o check-in
com foto, que pede armazenamento de fotos no servidor.
Detalhes em **Registro da Fase 3** e **Registro da API** no fim do documento.

**Situação em 25/09:** com os amigos (24/09) e o check-in com foto no desafio, a fase fechou. O check-in é um
por dia, visível só para quem participa, com mural do dia e moderação do grupo (quem criou oculta na hora;
dois participantes também), e o dia com check-in conta no placar. Em produção, liga com o volume das fotos.

**Critérios de aceite**: criar um desafio e entrar por link em menos de 30 segundos, sem cadastro prévio obrigatório até o momento de pontuar.

### Fase 4 — Ranking, ligas e premiação ✅ (em 25/09)

**Entregas**: XP, ligas semanais, temporada mensal, as oito categorias da seção 3.3, DOTS para força relativa, check-in verificado, troféus e selos.

**Critérios de aceite**: dois usuários de pesos diferentes com o mesmo DOTS aparecem lado a lado; ranking separa verificado de declarado.

**Situação em 24/09:** XP, ligas semanais, temporada entre amigos, DOTS, check-in verificado, troféus e
selos prontos no app e na API, e os dois critérios de aceite cobertos por teste. Das oito categorias, faltam
três (pontualidade, modalidade e equilíbrio), e faltam os escudos da sequência. Detalhes em **Registro da
Fase 4** no fim do documento.

**Situação em 25/09:** as três categorias que faltavam entraram: pontualidade (com a agenda da semana),
modalidades (com o catálogo de nove modalidades) e equilíbrio (com o diário de sono, água e humor). Entraram
também os escudos da sequência e o ranking da academia, no mural da Fase 5. As oito categorias da seção 3.3
existem.

### Fase 5 — Personal e academia ✅ (em 25/09)

**Entregas**: vínculo por convite com permissões granulares, painel do personal, prescrição, página do profissional, mural da academia.

**Situação em 25/09:** pronta no app e na API. Perfil de personal com página pública (CREF como informado,
sem verificação), vínculo por convite com três permissões que o aluno liga e desliga, painel com aderência e
quem está parado, prescrição com o feito contra o prescrito, ranking de personais e mural da academia com
avisos e o ranking do mês por constância verificada.

### Fase 6 — Recomendação com IA ✅ (em 25/09)

**Entregas**: plano semanal gerado por IA com explicação, resumo mensal, leitura das medidas; regras de segurança por cima; execução em lote de madrugada com cache de prompt; medição de custo por usuário.

**Critérios de aceite**: custo medido por usuário ativo abaixo de US$ 0,20/mês; nenhuma sugestão fora dos limites das regras.

**Situação em 25/09:** pronta no app e na API, com o Claude (`claude-opus-5`) pela API da Anthropic: plano
da semana com o porquê de cada dia, resumo do mês, leitura das medidas e o treino de hoje pelo plano, com
consentimento próprio. O critério "nenhuma sugestão fora dos limites das regras" está coberto por teste: a
resposta que quebra uma regra é descartada e o app segue com as recomendações por regras. O custo é medido a
cada chamada, com teto de US$ 0,20 por pessoa por mês, mas o valor real só se conhece com a chave: até aqui
rodou só o provedor simulado. Em produção, as rotas respondem 503 até a chave ser configurada. Detalhes em
**Registro da conclusão (25/09)**.

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

**Ainda não feito**: comemoração com card logo na tela da sessão, ao bater o recorde; cards de sequência e de retrospectiva mensal; teste em iPhone. Desafio por link e placar saíram com a API (veja **Registro da API**); amigos e check-in com foto continuam pendentes.

## Registro da API (23/09)

**O que foi construído**

- **Servidor** (Node, Hono, Prisma 7, PostgreSQL), com 37 testes contra um Postgres de verdade. Nasceu em `server/` e, ainda em 23/09, passou para o repositório próprio `gymflow-api`, pronto para a VPS (Docker Compose com Postgres, migrações e Caddy com HTTPS). Como rodar, publicar e as decisões estão no README de lá.
- **Contas de verdade**: cadastro, login, saída e apagar a conta (a API apaga em cascata; o botão no app ainda não existe). O mock de autenticação saiu. A sessão é conferida ao abrir o app; sem rede, o app segue com a sessão salva.
- **Banco local por conta**: cada pessoa tem o próprio arquivo no aparelho. Quem entra depois no mesmo celular não vê nem sincroniza os treinos de outra.
- **Sincronização**: os treinos concluídos sobem sozinhos (ao entrar, ao voltar para o app e segundos depois de terminar). Medidas, fotos e as respostas do onboarding **não sobem**: são dados sensíveis e pedem consentimento específico antes (seção 4).
- **Desafios** (Fase 3): criar com 7, 14 ou 30 dias, convidar pelo compartilhar (o link http abre a página do convite, e ela abre o app), entrar pelo link ou pelo código, ver o placar e sair. Um ponto por dia com treino concluído e ao menos uma série feita, no fuso do desafio.
- **Painel de administração** (Fase 1): cadastros contra a meta de 200, novos, ativos e treinos da semana. Administrador é quem está em `ADMIN_EMAILS` na API.

**Bugs encontrados no teste e corrigidos**

- Um treino antigo com uma série de mais de 2000 kg fazia a API recusar o lote inteiro, e a fila travava para sempre. A API passou a validar treino a treino, e o app a recusar carga acima de 1000 kg na digitação.
- Repetição aceitava vírgula ("10,5"), e o servidor só aceita número inteiro. O teclado das repetições agora não tem vírgula.
- Os campos de carga e repetições perdiam o texto digitado quando o estilo deles mudava (Android, campo não controlado).
- Sair e entrar de novo sem fechar o app derrubava o banco local (NullPointerException do expo-sqlite ao reabrir o mesmo arquivo).
- A home mostrava nome, objetivo, nível e rotina fixos no código ("Rodrigo Gonçalves", "Ganho de massa"), e as respostas do onboarding não eram guardadas.
- Na busca de exercícios, os chips de filtro saíam cortados ao meio.

**Como foi validado** (emulador Android `lume_test`, Expo Go, API local)

| Verificação | Resultado |
| --- | --- |
| Cadastro e login pela API | conta criada; senha errada mostra a mensagem do servidor; login leva à home |
| Sessão revogada no servidor | o app volta para a tela inicial |
| Treinos antigos ao entrar | 3 subiram; o de mais de 2000 kg ficou só no aparelho, sem travar a fila |
| Treino novo | no servidor segundos depois de finalizado (82,5 kg × 5, com recorde) |
| Desafio | criado, convite compartilhado, placar já com o treino do dia |
| Convite sem conta | prévia do desafio, cadastro pelo convite e entrada no desafio |
| Duas contas no mesmo aparelho | cada uma vê só os próprios treinos, sem erro na troca |
| Painel | 2 de 200 cadastros, batendo com o banco |

**Ainda não feito**: publicar a API (hospedagem, banco e o domínio do link de convite); baixar os treinos da conta num aparelho novo; consentimento e envio de medidas e fotos (com URL assinada, tarja e revogação); amigos e check-in com foto; o botão de apagar a conta e a recuperação de senha no app; teste em iPhone.

## Registro do Perfil e da restauração (23/09, noite)

A API foi publicada em https://99dev.pro/gymflow-api (documentação em `/doc`), e o botão de apagar a conta já existe. O build de loja ficou para depois das funções que faltam.

**O que foi construído**

- **Corpo e objetivo no Perfil** (`app/(app)/perfil.tsx`): peso, altura e objetivo, com os limites do questionário. O objetivo é a meta da escala da jornada (Início, Constância, Evolução ou Performance). O peso mostrado é o atual, o da última pesagem na Evolução ou, sem nenhuma, o do questionário. Mudar o peso registra a pesagem do dia na Evolução, então o gráfico e o cartão da home acompanham. Tudo fica só no aparelho, como as outras respostas.
- **A meta do onboarding é salva.** Antes, a escolha na escala do resumo ficava só na tela e se perdia ao finalizar. Sem nenhum toque, vale a meta que a escala mostrava.
- **Restauração dos treinos**: a API ganhou `GET /sync/workouts`, com páginas de até 50 no formato do envio e sem os treinos apagados. No app (`src/services/sync.ts`), a primeira entrada da conta em cada aparelho baixa os treinos dela, depois de a fila subir: assim, um treino apagado aqui e ainda não enviado não volta. O que já está no aparelho, ou na fila, fica com a versão daqui. Um exercício que saiu do catálogo volta com o nome e o grupo do servidor. A tela de Treino aberta recarrega quando os treinos chegam.

**Corrigido antes do commit**

- Quem salvava peso ou altura pelo Perfil sem ter feito o questionário neste aparelho passava a ver "Fase: Início" na home e uma fase sem base no Perfil. A fase agora só aparece com as respostas sobre a experiência de treino.
- A tela de Treino aberta durante o download continuava vazia até sair e voltar.

**Como foi validado** (emulador Android `lume_test`, Expo Go, API local)

| Verificação | Resultado |
| --- | --- |
| Perfil de quem não fez o questionário | peso de 80,6 kg da última pesagem; altura vazia pede um valor de 100 a 250 cm |
| Peso mudado para 79,8 kg | pesagem de hoje na Evolução; "−2,2 kg desde o início" na Evolução e na home |
| Perfil reaberto | 79,8 kg, 172 cm e Performance continuam lá |
| Onboarding sem tocar na escala | Perfil com a meta padrão (Evolução) e "hoje você está em Constância" |
| Onboarding com Performance na escala | Perfil com Performance |
| Conta nova com treinos só no servidor | os 2 treinos descem; o exercício fora do catálogo aparece como Costas; o recorde continua marcado; o apagado não volta |
| Conta com 60 treinos | duas páginas (`after=`) |
| Download atrasado 6 s por um proxy, com o Treino aberto | a tela recarrega sozinha: 3 treinos e 1,7 t na semana |
| Conta que já tinha os treinos no aparelho | nada duplicado; o banco antigo recebeu a migração nova sem erro |
| API | 51 testes, typecheck e build; em produção desde o commit `5a8f063` |

**Ainda não feito**: testar o app contra a produção; sincronizar dois aparelhos em uso ao mesmo tempo (a restauração roda uma vez por aparelho); consentimento e envio de medidas e fotos; recuperação de senha; amigos e check-in com foto; teste em iPhone.

## Registro das medidas na conta (24/09)

Primeira parte do que a seção 4 pede para dado de saúde: as **medidas** do corpo passam a poder
ficar na conta, com consentimento específico e destacado. As fotos continuam só no aparelho.

**O que foi construído**

- **API** (`gymflow-api`, commit `eccb80e`): `PUT /me/consents/body-data` liga e desliga o consentimento;
  `POST /sync/measurements` recebe a fila do aparelho (até 50 por vez, validação medida a medida, a
  versão mais nova vence, medida apagada vira só uma marca sem valores) e `GET /sync/measurements`
  devolve as da conta em páginas, para restaurar num aparelho novo. Sem consentimento, as duas
  respondem 403 `CONSENT_REQUIRED`. **Retirar o consentimento apaga na hora todas as medidas da
  conta no servidor**; um novo aceite grava um instante novo. Tabela `body_measurements` e coluna
  `body_data_consent_at` em `users` (migração `20260924070240_body_measurements_consent`, só
  acréscimos). O `user` que a API devolve ganhou `bodyDataConsentAt`. Dez testes novos (61 no
  total), documentação em `/doc` e tabela de rotas do README.
- **App**: cartão "Medidas na conta" na Evolução (`src/components/body/MeasurementsBackupCard.tsx`).
  O botão abre o texto do consentimento (o que sobe, para quê, quem vê e como voltar atrás) e só
  então chama a API. Com consentimento, `src/services/body-sync.ts` sobe a fila de medidas (que já
  existia no outbox desde a Fase 2, sem nunca ter sido enviada), baixa as da conta e repete tudo a
  cada consentimento novo: o instante do aceite funciona como época, guardada em `sync_state`. A
  tela recarrega o gráfico quando medidas chegam, e o peso salvo pelo Perfil passa pelo mesmo
  caminho. Os gatilhos (entrar, voltar para o app, mudança na fila) ficaram num hook comum,
  `useSyncTriggers`, usado também pelos treinos.

**Decisões**

- Consentimento separado do aceite geral dos termos, com texto próprio, como a LGPD pede para dado
  de saúde. Fica no servidor, não no aparelho: vale para todos os aparelhos da conta.
- Retirar apaga tudo no servidor imediatamente, sem prazo. As medidas do aparelho ficam com a pessoa.
- A medida apagada no aparelho vira uma marca sem nenhum valor no servidor, para não voltar num
  download e para não guardar um dado que a pessoa quis apagar.
- Fotos ficam de fora até existir armazenamento privado com URL assinada (seção 4).

**Como foi validado** (emulador Android `lume_test`, Expo Go, API local)

| Verificação | Resultado |
| --- | --- |
| Cartão na Evolução sem consentimento | "Medidas só neste aparelho · 3 medidas guardadas só aqui" |
| Aceitar no diálogo | `PUT` do consentimento, `POST` das 3 medidas e `GET` de restauração em sequência; 3 no banco; cartão "Tudo em dia com a conta" |
| Medida nova (79,2 kg, cintura 83 cm) | no servidor segundos depois de salvar |
| Apagar a medida nova | no servidor fica só a marca: valores nulos e `deleted_at` |
| Retirar o consentimento | 0 medidas no servidor e consentimento nulo; as 3 do aparelho continuam |
| Aceitar de novo | instante novo e as 3 medidas sobem de novo; a apagada não volta |
| API | 61 testes, typecheck e build; publicada em produção pelo `salvek99` |

**Ainda não feito**: fotos na conta; sincronizar dois aparelhos em uso ao mesmo tempo (a
restauração roda uma vez por consentimento em cada aparelho); teste em iPhone. O teste contra a API
publicada está no registro seguinte.

## Registro do teste contra a produção (24/09)

Primeira vez que o app rodou contra `https://99dev.pro/gymflow-api` de ponta a ponta. Emulador Android
`lume_test` com o Expo Go, Metro iniciado com `EXPO_PUBLIC_API_URL=https://99dev.pro/gymflow-api`
(a variável de ambiente vence o `.env.local`), sem `adb reverse` para a porta 3333. Conta de teste
criada pelo próprio app e apagada por ele no fim.

| Verificação | Resultado |
| --- | --- |
| Sessão antiga (token da API local) ao abrir | a produção respondeu 401 e o app voltou para o início, sem travar |
| Cadastro pela tela do app | conta criada na produção; o app seguiu para o onboarding |
| Consentimento na Evolução | `bodyDataConsentAt` gravado na conta |
| Medida (81,4 kg) | em `GET /sync/measurements` segundos depois de salvar |
| Treino (agachamento 60 kg × 8, recorde) | em `GET /sync/workouts`, finalizado, com `isPr` |
| Desafio de 7 dias | criado, já com 1 ponto pelo treino do dia; folha de compartilhar com o link `https://99dev.pro/gymflow-api/c/<código>`; a página do link responde com título, prévia e `gymflow://convite/<código>` |
| Apagar a conta pelo Perfil | login e token antigo passam a responder 401; o app volta para o início com o aviso |

**Sobra conhecida**: o desafio de teste (código `CQRHRERK`) fica no servidor sem participantes até
01/10, porque a API não apaga desafios (quem cria pode sair sem apagar o dos outros).

**Ainda não feito**: celular físico e iPhone; o fluxo do onboarding contra a produção (as telas do
app foram abertas por deep link, sem passar pelas 23 etapas).

## Registro da aceleração (24/09, tarde)

Meta do dono: pelo menos 90% em cada área do manual, acelerando. A rodada juntou três agentes em
paralelo (telas isoladas do app) com o trabalho de API, sincronização e infraestrutura, e terminou
com o app em 90% (64 de 71 itens) e a API em 92% (36 de 39), dois deploys da API (`e8f9330` e
`edc9c2c`, os dois com TUDO CONFERE) e o app validado no emulador.

**O que foi construído**

- **Menu do perfil inteiro**: Sincronizar (o que está na conta, o que falta, sincronizar agora e
  baixar de novo), Alimentações diárias (diário local de refeições e água), Alimentação ideal (seis
  estilos com trocas práticas, sugestão a partir do questionário, sem calorias), Escolhas de treinos
  (local, tipos, grupos, equipamentos e favoritos, que aparecem primeiro na escolha de exercícios),
  Recomendações (estágio 1 da seção 2.5: regras sobre treinos, medidas e questionário, no aparelho),
  Conquistas (16, calculadas dos dados locais) e Frase do dia (48 frases originais e a frase pessoal).
- **Treino e evolução**: recorde com o botão "Ver card" na hora; abas Sequência e Mês no
  Compartilhar; check-in na academia pelo GPS (um por dia, no local até 150 m, tudo no aparelho);
  câmera própria com guia de contorno por pose; compartilhar o antes e depois com tarja gravada na
  imagem.
- **Conta e LGPD**: recuperação de senha e confirmação de e-mail com código de 6 números por e-mail
  (SMTP configurável; sem SMTP, terminal em desenvolvimento e 503 em produção); respostas do
  questionário na conta com consentimento próprio, que descem num aparelho novo antes de decidir
  entre onboarding e home; Termos de Uso e Política de Privacidade em `/termos` e `/privacidade`,
  ligados no cadastro e no Perfil; tema claro "Dia".
- **Social**: amigos por e-mail (resposta genérica, aceitar, recusar, desfazer), com nome, dias de
  treino na semana e quem treinou hoje. Nada de medidas, cargas ou treinos de outra pessoa.
  Notificações dos desafios decididas pela API e enviadas pelo Expo Push: lembrete do dia (das 18h
  às 21h no fuso do desafio, só para quem ainda não treinou) e placar final; o app registra o
  aparelho ao abrir um desafio, esquece ao sair da conta e abre o desafio ao tocar no aviso.
- **Operação**: backup diário do banco na VPS (03:15, 14 dias, primeiro feito ao instalar), sonda a
  cada 5 minutos que reinicia o container na segunda falha e alerta por e-mail (o mesmo SMTP) ou
  webhook, e a rotina das notificações de hora em hora dentro do container. CI do GitHub conferida:
  todas as execuções verdes. 88 testes na API.

**Como foi validado** (emulador Android `lume_test`, Expo Go, API local)

| Verificação | Resultado |
| --- | --- |
| Recuperar senha pela tela Nova senha | código pedido pelo app, senha trocada, login com a nova |
| Confirmar e-mail pelo Perfil | "Confirmado em 24 set"; `email_verified_at` no banco |
| Home com os sete cartões | todos abrem as telas novas |
| Recomendações, Sincronizar, Conquistas, Frase, Alimentação, Escolhas | telas renderizadas com os dados da conta de teste |
| Compartilhar: abas Sequência e Mês | "1 semana seguida" e "Meu setembro: 5 treinos, 67,4 t, 4 recordes, Peito" |
| Tema Dia | home, Treino e Evolução legíveis em fundo claro |
| Amigos | tela e estado vazio; API coberta por 10 testes |
| Check-in | cartão no hub e tela de marcar a academia; permissão concedida; a leitura do GPS falhou no emulador sem janela e a tela mostrou o erro certo |
| Câmera com guia | contorno da pose por cima da câmera, troca de pose e botão de captura |
| Tarja | tarja posicionada por toque nas duas fotos, ligar e desligar, setas, e o Compartilhar abrindo a folha do Android |
| Notificações | 4 testes na API (token do aparelho, lembrete, placar, empate); rotina no cron da VPS; no Expo Go o app só pula o registro, porque push não roda nele no Android |
| Produção | `edc9c2c` publicado, TUDO CONFERE, `/termos` e `/privacidade` 200, backup, sonda e notificações no cron |

**Ainda não feito**: configurar o SMTP e o e-mail de contato na VPS (libera três funções de uma
vez); fotos na conta e check-in com foto (dependem da decisão sobre o armazenamento); celular
físico, iPhone e build de loja (que também é o que faz as notificações chegarem de verdade); Health
Connect e Apple Health.

## Registro da Fase 4 (24/09, noite)

Pedido do dono: continuar o projeto. Com o app em 90% e a API em 92%, o que faltava nas duas áreas dependia
de decisões dele (SMTP, onde guardar fotos, build de loja). A Fase 4 era o próximo bloco do plano que só
dependia de código. Dois agentes fizeram as telas do app em paralelo, sobre um contrato escrito antes
(`src/types/league.ts` e `src/services/league.ts`), enquanto a API era feita, testada e publicada
(commit `3965b1f`).

**Decisões (para o dono revisar)**

- **O XP não fica guardado**: é calculado dos treinos e check-ins, dia a dia no fuso de São Paulo. Treino
  concluído vale 50 (até 2 por dia), série feita vale 2 (até 40 por dia; é o teto contra maratona de registro)
  e check-in verificado vale 20. A meta da semana batida vale 25 por dia da meta, e a meta só muda da semana
  seguinte em diante, para ninguém baixar a meta no meio da semana. O convite reconhecido dá 7 dias de XP em
  dobro para os dois (conta nova, até 48 h, que entra por um desafio) e o selo "Trouxe gente para treinar".
- **Medidas e fotos não viram XP**, ao contrário do que a seção 3.2 sugeria: dado sensível não pode virar
  moeda de troca pelo consentimento (LGPD). Carga levantada também não, como a seção já dizia.
- **Ligas**: grupos de até 30 pessoas da mesma liga, formados com o primeiro XP da semana, então quem não
  treinou não entra e não perde nada. Na segunda, os 20% do topo sobem (com pelo menos 150 XP) e os 20% de
  baixo descem, só em grupos a partir de 5 pessoas; empate divide a posição e fica com o resultado melhor. No
  grupo aparece só "Ana S." e o XP. Dá para sair das ligas.
- **Temporada é o mês, entre amigos**, sem ranking global. As categorias da seção 3.3 que dá para medir hoje:
  pontos, constância declarada e verificada (separadas), força relativa por DOTS, evolução, tonelagem (só
  entre gente da mesma liga, que é a faixa de nível) e cardio por modalidade. Quem fica em 1º numa categoria,
  com ao menos um amigo disputando, ganha o troféu do mês; empate vale para todos.
- **Privacidade da temporada**: a API já prometia que amigo vê só nome e dias com treino. Por isso evolução,
  tonelagem e cardio só aparecem entre quem liga "Mostrar volume, evolução e cardio", nos dois sentidos, e
  nunca aparecem as cargas de cada série ou os treinos. O DOTS pede o próprio consentimento (peso e fórmula,
  apagados ao sair), e ninguém vê o peso.
- **Antifraude**: marca a confirmar não conta (salto de mais de 30% sobre a melhor marca de 6 meses nos três
  básicos, DOTS acima de 600, evolução acima de 50% num exercício). A academia só vale depois de confirmada,
  por duas contas diferentes ou pelo administrador, porque senão qualquer um marcaria a própria casa. O
  check-in verificado exige estar a até 150 m, com leitura de GPS de até 100 m de erro. A posição da pessoa
  não fica guardada.
- **Rotina**: o cron de hora em hora da VPS fecha a semana das ligas e o mês da temporada (uma vez só) e avisa
  por push. A Política de Privacidade e os Termos cobrem tudo isso, e o Expo aparece como operador das
  notificações.

**Como foi validado**

| Verificação | Resultado |
| --- | --- |
| API | 105 testes (17 novos): tetos do XP e fuso, meta, convite, ligas (vaga de 30, zonas, fechamento, empate, mínimo de 150, selo de 4 semanas), temporada (DOTS igual com pesos diferentes lado a lado, verificado separado de declarado, compartilhamento, liga na tonelagem, a confirmar, troféus do mês), academia e check-in |
| Produção | `3965b1f` publicado, migração aplicada, rotina de hora em hora rodando o fechamento |
| Liga no emulador | nível 2, 443 XP no total e 158 na semana, conferidos contra os treinos; grupo de 5 na Prata com zonas; resultado "subiu para a Prata"; meta de 4 dias gravada na conta |
| Temporada no emulador | pontos, constância declarada (5, 4, 4 com empate) e verificada (3 e 1), DOTS de 277,2 conferido à mão, compartilhamento ligado mostrando tonelagem só da mesma liga e esteira |
| Força no emulador | entrada com o peso sugerido da última pesagem (79,8 kg) e a fórmula; o perfil gravado na conta |
| Conquistas, card e painel | troféu e selo da conta, card de troféu no Compartilhar, academia confirmada por duas contas no painel |
| Check-in na tela | não exercitado: no emulador sem janela o GPS não entrega posição ao Expo Go. A leitura passou a esperar no máximo 15 s e a aceitar uma posição de até 2 minutos |

**Ainda não feito**: pontualidade (precisa de agenda de treinos), modalidade (precisa de modalidades como
funcional, luta, natação e yoga no catálogo) e equilíbrio (precisa de registro diário de sono, água e humor
na conta); os escudos da sequência (seção 3.2); o ranking e o mural da academia (Fase 5); o check-in na tela
num celular de verdade.

## Registro da conclusão (25/09)

Pedido do dono: rodar o prompt de 25-setembro-concluindo.md ("perfeito continue"). O dia seguiu os blocos
do documento, com as decisões D1 a D9 como estavam escritas. Em cada bloco, o contrato do app (tipos e
serviços) veio primeiro; dois agentes fizeram as telas em paralelo enquanto a API era construída, testada
e publicada; depois, a validação no emulador contra a API local e os commits do app por frente.

### Bloco 0: abertura

Os portões estavam verdes (105 testes na API, typecheck e lint no app). O trabalho de 24/09, que estava sem
commit no app, virou oito commits por frente (contas, medidas, tema Dia, social, corpo, aceleração, Fase 4 e
documentação). O `deploy-api-success.png` solto na raiz do app ficou de fora, sem commit. O painel 99dev
mudou de pasta (agora `D:\dev\vps-panel`); a skill salvek99 e o script de conferência foram corrigidos.

### Bloco 1: a Fase 4 completa

**O que foi construído**

- **Modalidades**: o catálogo passou de 37 para 55 exercícios, em nove modalidades (musculação, corrida e
  caminhada, bike, natação, funcional, luta, yoga, mobilidade, cardio na academia). Exercício de yoga, luta,
  mobilidade e circuito registra só o tempo (kind `tempo`). O treino sobe com a modalidade de cada exercício.
- **Agenda e pontualidade**: até 7 compromissos por semana, gravados na conta pelas Escolhas de treino. A
  pontualidade é a parte dos compromissos passados no mês com treino começando até 1 h 30 antes ou depois.
- **Diário do dia**: sono, água (os mesmos copos da Alimentação) e humor, com consentimento próprio; sobe e
  desce da conta. O Equilíbrio conta os dias com treino e diário completo.
- **Escudos**: a Liga mostra a sequência de semanas com a meta e os 2 escudos do mês. Selo de 8 semanas.
- **Temporada**: as oito categorias da seção 3.3 existem; a lista de indisponíveis veio vazia.

**Decisões (para o dono revisar)**

- **Modalidades e equilíbrio só entre quem mostra detalhes aos amigos**, como tonelagem e cardio: contam o
  tipo de treino e a saúde, que a promessa de "amigo vê só nome e dias com treino" não cobria. O interruptor
  virou "Mostrar detalhes aos amigos". Pontualidade aparece para todos os amigos, como a constância (é uma
  porcentagem, sem horários).
- **Musculação fica fora do pódio de modalidades**: ela já tem constância, força, evolução e tonelagem.
- **Pontualidade conta cada dia com a agenda que valia nele**: um horário que sai da agenda não apaga o
  passado, e só entra quem tem 4 compromissos passados no mês.
- **O escudo só é gasto quando há sequência para proteger**, e segura a semana sem somar.
- **Um treino recusado pela API agora volta com o motivo do formato completo**, e não mais "Entrada inválida".

### Bloco 2: fotos na conta e check-in com foto

**O que foi construído**

- **Armazenamento privado** no disco da VPS (driver de disco, trocável por S3 ou R2), com URLs assinadas de
  10 minutos que conferem, na hora de abrir, se a foto ainda pode ser vista.
- **Toda foto é refeita pelo servidor**: até 1600 px, JPEG, sem metadados (sem a posição do GPS), com
  miniatura de 320 px.
- **Fotos de evolução na conta** com consentimento próprio, separado do das medidas: fila, restauração num
  aparelho novo (miniatura primeiro) e retirada que apaga tudo na hora.
- **Check-in com foto nos desafios**: um por dia, visível só para quem participa; o dia com check-in conta no
  placar e silencia o lembrete. Moderação do grupo: quem criou oculta na hora; dois participantes também.
- **Backup diário** passa a incluir a pasta de fotos, quando ela existir.

**Decisões (para o dono revisar)**

- **Um check-in oculto só aparece para o autor, sem a foto**, com a linha "Ocultado pelo grupo".
- **Sair do desafio apaga os check-ins da pessoa nele.**
- **A câmera frontal do check-in não espelha**: a foto sai como o grupo vê a pessoa.
- **Foto HEIC ou acima de 5 MB fica no aparelho** com uma linha no cartão (o app não tem conversor).
- **Uma foto que ainda subia quando o consentimento foi retirado é apagada no servidor** (correção feita
  depois de um agente apontar a janela).

### Bloco 3: a Fase 5, personal e academia

**O que foi construído**

- **Perfil de personal** no Perfil: endereço da página pública, CREF como o profissional informou (sem
  verificação, e a página diz isso), apresentação e cidade.
- **Vínculo por convite** de 8 letras (7 dias, uso único), pelo link `/p/convite/<código>` ou pelo código,
  com três permissões separadas (treinos, medidas, fotos) que o aluno liga, desliga e revoga no cartão "Meu
  personal"; cada leitura do personal confere a permissão na hora.
- **Painel do personal**: aderência da semana e do mês, quem está há 7 dias sem treinar, evolução do mês,
  prescrição ativa e depoimento pendente; o aluno em detalhe só com o que liberou.
- **Prescrição**: até 7 dias com exercícios do catálogo, séries, repetições alvo, descanso e observação. O
  aluno começa o treino pela prescrição e o personal vê o feito contra o prescrito.
- **Página pública do profissional**, com as conquistas dos alunos que aceitaram aparecer e os depoimentos
  aprovados; **ranking de personais** por aderência e evolução média.
- **Mural da academia** no check-in: avisos do responsável e o ranking do mês por constância verificada.

**Decisões (para o dono revisar)**

- **Só medidas e fotos que o aluno guarda na conta chegam ao personal**, mesmo com a chave ligada: o
  personal não abre nada que o próprio aluno não guardou.
- **O ranking de personais só conta alunos que compartilham os treinos**, com mínimo de 3: a média de quem
  não liberou os treinos não entra nem de forma agregada.
- **Desfazer o vínculo apaga as prescrições entre os dois**; os treinos continuam com o aluno.
- **Deixar de ser personal leva convites, vínculos e prescrições.**
- **O responsável pelo mural é quem marcou a academia primeiro**; o administrador transfere pelo painel
  (`PATCH /admin/gyms/:id/owner`), só para alguém que marcou a mesma academia.

### Bloco 4: a Fase 6, recomendação com IA

**O que foi construído**

- **Claude pela API da Anthropic** (`claude-opus-5`), com saída estruturada validada por Zod, thinking
  adaptativo, a parte fixa do pedido em cache e `fallbacks: "default"` contra recusas.
- **Plano da semana** com o porquê de cada dia, **resumo do mês** e **leitura das medidas**, com consentimento
  próprio e as regras de segurança conferindo cada resposta antes de ela chegar à pessoa.
- **Custo medido** em cada chamada, pela tabela de preços, com teto de US$ 0,20 por pessoa por mês e o custo
  por pessoa ativa no painel de administração.
- **Lote de madrugada** pela Batch API (metade do preço): o plano da semana no domingo à noite e o resumo no
  dia 1, com coleta de hora em hora, já instalados no cron da VPS.
- **No app**: o cartão de consentimento, o plano da semana, o resumo do mês e o uso do mês em Recomendações;
  o "Treino de hoje pelo plano" no Treino, depois da prescrição do personal; e a leitura das medidas na
  Evolução. Sem a IA no servidor, as telas ficam com as recomendações por regras, sem erro.

**Decisões (para o dono revisar)**

- **Modelo `claude-opus-5` com esforço médio**: é o padrão da estratégia; o custo real só se mede com a
  chave. Se passar do teto com frequência, a troca para `claude-sonnet-5` é uma variável (`AI_MODEL`), mas
  vale comparar a qualidade antes.
- **Limite de carga: o menor entre 10% e 5 kg** acima da melhor marca das últimas 8 semanas, e nenhuma carga
  para exercício sem histórico.
- **Um plano novo por dia**, e o primeiro da semana sai na primeira abertura.
- **A resposta descartada fica guardada com o motivo** (para auditoria) e nunca chega à pessoa.
- **Retirar o consentimento apaga o que a IA gerou**; o registro de custo (sem conteúdo) fica.
- **Texto a aprovar**: o cartão da IA diz que o custo é do Gyn Flow, "sem cobrança para você". A estratégia
  pede nenhum preço em tela, e um valor em dólar sem esse contexto pode parecer cobrança. Se não quiser, é
  tirar uma frase.
- **Um pedido de IA em andamento não se repete** ao sair e voltar da tela: a API não trava pedidos
  simultâneos, e cada um contaria no teto.
- **O treino começado pelo plano da IA não leva o id do plano**: o id é o da prescrição do personal, e o
  personal veria um treino da IA como se fosse dele.

### As decisões D1 a D9, para revisar

Todas foram aplicadas como estavam no documento do dia. Onde o código precisou de um detalhe a mais, ou se
afastou do texto, a coluna da direita diz.

| # | Como ficou | O que revisar |
| --- | --- | --- |
| D1 | Fotos no disco da VPS, pasta privada, driver `disk`, links assinados de 10 minutos, foto refeita sem metadados (até 1600 px) com miniatura de 320 px, backup diário com a pasta. | Em produção as rotas respondem 503 até o volume e o `STORAGE_SECRET` existirem (item 2 da lista do dono). |
| D2 | `claude-opus-5` com esforço médio, thinking adaptativo, saída estruturada, a parte fixa do pedido em cache, 503 sem chave, consentimento próprio, teto de US$ 0,20 por pessoa por mês e o lote de madrugada. | O custo real por pessoa não foi medido: sem a chave, só o provedor simulado rodou. |
| D3 | Commits do app por frente, `salvek99` a cada bloco com API nova e a tag `v2026.09.25` no fechamento. | Nada. |
| D4 | Escudos automáticos, 2 por mês, para a semana a um dia da meta. | O escudo só é gasto quando há sequência para proteger. |
| D5 | Diário do dia com consentimento próprio; o Equilíbrio mostra só a contagem de dias. | O interruptor da temporada virou "Mostrar detalhes aos amigos" e passou a valer também para as modalidades. |
| D6 | Até 7 compromissos, janela de 90 minutos, entra com 4 compromissos passados no mês. | Cada dia conta com a agenda que valia nele: tirar um horário não apaga o passado. |
| D7 | Nove modalidades (entrou "cardio na academia"), séries só de tempo para yoga, luta, mobilidade e circuito, e um pódio por modalidade com 2 pessoas. | Desvio: o pódio aparece só entre quem mostra detalhes aos amigos, e a musculação fica fora dele (já tem força, evolução e tonelagem). |
| D8 | CREF informado e sem verificação, três permissões revogáveis, responsável da academia é quem marcou primeiro, transferência pelo administrador, ranking de personais com mínimo de 3 alunos, ranking da academia por constância verificada com a opção de sair. | O ranking de personais conta só alunos que compartilham os treinos; desfazer o vínculo apaga as prescrições entre os dois. |
| D9 | Um check-in por dia no fuso do desafio, só para quem participa, dia do placar com treino ou check-in, ocultar por quem criou ou por dois participantes. | O check-in oculto aparece só para o autor, sem a foto; sair do desafio apaga os check-ins da pessoa nele. |

### Bloco 5: fechamento

O manual saiu de 90% (app) e 92% (API) para 95% e 97%: os grupos das Fases 5 e 6 deixaram "Próximas fases" e
viraram um grupo do app e um da API cada, e o que ficou em "a fazer" depende só do dono (a lista está em
`25-setembro-concluindo.md` e nos próximos passos do manual). A API ganhou a tag `v2026.09.25` no commit que
está em produção, e os commits do app foram enviados para o repositório.

### Como foi validado

| Verificação | Resultado |
| --- | --- |
| API | 138 testes (33 novos: 13 da Fase 4 completa, 7 de fotos e check-in, 6 de personal e academia, 7 da IA com o provedor simulado), typecheck e build |
| App | typecheck e lint sem erros nem avisos antes de cada commit por frente |
| Produção | API publicada a cada bloco, até `59e9d65`, com as migrações aplicadas, 104 operações no /doc e a conferência do salvek99 batendo; o cron da VPS tem as três linhas do lote da IA; fotos e IA respondem 503, como esperado sem volume e sem chave |
| Rodada da API em produção | 20 verificações com uma conta temporária (agenda, diário, sequência, temporada, fotos, personal, página pública, convite, ranking, IA, privacidade), apagada no fim |
| Bloco 1 no emulador | a modalidade Yoga com os exercícios dela; 30 min de yoga subiram como tempo e yoga; agenda carregada da conta e o sábado salvo; diário subindo e descendo; temporada com pontualidade de 60%, equilíbrio 4 × 2 e pódio de yoga 3, 2 e 1; 2 semanas de sequência, a de 7/09 segurada por um escudo |
| Bloco 2 no emulador | 2 fotos subiram e a retirada apagou tudo do servidor, com as fotos mantidas no aparelho; check-in pela câmera virtual, mural com o check-in de outra pessoa e ocultar como quem criou (o ponto voltou a 0) |
| Bloco 3 no emulador | cartões do Perfil; painel com dois alunos e o detalhe de um; depoimento aprovado, que apareceu na página pública; treino pela prescrição, e o personal viu 3 × 8-12 feito com 50 kg × 10 e o exercício que faltou; mural com aviso, ranking do mês e a chave de sair; ranking de personais vazio, com as regras |
| Bloco 4 no emulador | com o provedor simulado: aceitar gerou o plano da semana na primeira abertura (a sexta marcada como hoje) e o resumo de agosto; o uso do mês subiu a cada chamada; o cartão do Treino abriu a sessão com 3 exercícios e 9 séries; a leitura das medidas apareceu na Evolução; retirar apagou os 3 documentos e as escolhas no servidor e manteve os 3 registros de custo |
| App contra a produção | login com uma conta temporária; convite de personal aceito pelo link; treino pela prescrição (40 kg × 10 e × 9), que chegou ao personal com o plano e o dia; liga com 54 XP e a temporada; agenda carregada da conta; diário com consentimento subindo para a conta; Recomendações com a linha de IA ainda não ligada; fotos com o aviso de servidor não pronto; as duas contas apagadas, a do aluno pelo Perfil |
| Tarde, no emulador | a sessão pelo plano da IA com banner e alvos (3 × 8-12, carga sugerida 60 kg, descanso de 1 min 30 s); sem rota para a API e com o Expo Go reaberto, o Treino e as Recomendações com o plano guardado, sem nenhum pedido chegar à API; consentimento da IA retirado por outra sessão, e o app recebeu 403, conferiu a conta e voltou ao convite; a academia da conta no check-in sem marcar de novo; "Trocar academia" sem conexão, e na volta da conexão a academia saiu da conta e não voltou; aviso publicado pelo formulário; prescrição salva pelo formulário (segunda, supino 3 × 8-12, 60 s); ocultar por dois participantes, e o dia saiu do placar de quem postou |
| Aparelho novo | com os dados do Expo Go apagados e a conta entrando de novo: treinos, medidas e as 2 fotos voltaram (as miniaturas antes das fotos inteiras), e a academia veio da conta com o mural |
| Não exercitado | o Claude de verdade (sem chave); GPS e push (só num celular) |

### Ainda não feito

- **O que depende do dono**: SMTP e e-mail de contato, o volume e o segredo das fotos, a chave da Anthropic,
  as fotos do hero e do login, celular físico, iPhone, build de loja e Health Connect com Apple Health.
- **Versão web** continua parcial: o treino usa SQLite, que não roda no servidor web de desenvolvimento.

As outras quatro pontas que estavam aqui foram fechadas na mesma tarde (seção seguinte).

### Depois do fechamento: as pontas abertas (25/09, tarde)

Pedido do dono: "continue". Tudo o que restava no manual dependia dele, então a tarde fechou as pontas de
código que o registro listava e as validações que o emulador ainda não tinha feito. Só o app mudou; a API
ficou como está em produção.

- **Alvos da IA na sessão**: a sessão começada pelo plano da IA guarda, só no aparelho, a semana e o dia do
  plano, e mostra o banner e os alvos de cada exercício, como a do personal.
- **Plano da IA sem internet**: o último plano da semana fica numa cópia no aparelho, usada pelo cartão do
  Treino e pela tela de Recomendações quando não há conexão. A cópia sai quando a sessão fica sem o
  consentimento da IA e ao apagar a conta.
- **Consentimento retirado em outro aparelho**: a primeira resposta 403 da IA faz o app conferir a conta de
  novo, e a tela troca o erro pelo convite.
- **Academia num aparelho novo**: o check-in passa a usar a academia da conta quando o aparelho não tem
  nenhuma. Uma troca feita sem conexão fica pendente e tira a academia da conta na próxima abertura com
  internet, para a antiga não voltar sozinha.

**Decisões (para o dono revisar)**

- **A carga sugerida pela IA aparece como alvo e não preenche as séries**, que seguem com a carga da última
  vez. A regra do servidor limita a sugestão pela melhor carga recente, mas não olha as repetições: uma melhor
  marca de poucas repetições permitiria sugerir a mesma carga para 8 a 12. Preencher a série com ela seria
  pedir que a pessoa confirme sem pensar.
- **Quem é responsável pelo mural e tira a academia continua responsável**: se voltar, volta a publicar;
  enquanto isso, ninguém publica, e o administrador pode transferir, como na decisão D8.

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
