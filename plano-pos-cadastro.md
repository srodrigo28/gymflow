# Plano de excelência: Pós-cadastro e onboarding inteligente

## Visão

Após o usuário criar a conta, o app deve conduzir um onboarding em múltiplas etapas para coletar informações importantes sobre perfil, rotina, objetivos, saúde e interesse em acompanhamento.

A intenção não é fazer um formulário longo e cansativo. A experiência deve parecer uma conversa guiada, com telas simples, perguntas claras e progresso visível. Cada resposta alimenta o sistema para personalizar treinos, recomendações, lembretes e futuras análises.

## Objetivo

Criar um fluxo pós-cadastro que:

- Colete dados iniciais do aluno.
- Evite perda de progresso caso o usuário saia do app.
- Prepare os dados para salvar em banco via API no futuro.
- Permita personalização de treinos e recomendações.
- Seja intuitivo, mobile-first e parecido com apps modernos de saúde, treino e hábitos.

## Nome do fluxo

Onboarding pós-cadastro.

Rotas sugeridas:

```txt
app/
  (onboarding)/
    _layout.tsx
    index.tsx
    sex.tsx
    work.tsx
    training-routine.tsx
    body-metrics.tsx
    sleep.tsx
    gym-history.tsx
    nutrition.tsx
    progress-photos.tsx
    summary.tsx
```

Alternativa mais controlada:

```txt
app/
  (onboarding)/
    index.tsx
```

Com todas as etapas renderizadas dentro de uma única tela por estado interno. Essa abordagem é melhor para preservar contexto, animar transições e evitar perder dados entre rotas. A navegação visual troca o conteúdo, mas os dados ficam vivos no mesmo provider/store.

Recomendação inicial: usar uma única rota `app/(onboarding)/index.tsx` com componentes de etapa.

## Fluxo sugerido

### Etapa 1: Boas-vindas

Objetivo:

- Explicar rapidamente que as respostas ajudam a montar uma experiência mais útil.
- Dar sensação de controle.

Texto sugerido:

```txt
Vamos personalizar sua jornada.
Responda algumas perguntas rápidas para ajustarmos treinos, rotina e recomendações ao seu momento.
```

Ações:

- `Começar`
- `Responder depois` somente se isso fizer sentido no produto.

### Etapa 2: Sexo

Objetivo:

- Coletar informação básica de perfil.

Campo:

- Sexo.

Opções:

- Masculino
- Feminino
- Prefiro não informar

Observação:

- Evitar linguagem invasiva.
- Deixar claro que a informação ajuda em métricas e personalização.

### Etapa 3: Trabalho e rotina profissional

Objetivo:

- Entender o nível provável de atividade diária, desgaste e disponibilidade.

Campos:

- Tipo de rotina de trabalho.
- Profissão ou área de atuação.

Opções para tipo de rotina:

- Passo a maior parte do dia sentado
- Fico bastante tempo em pé
- Tenho trabalho físico moderado
- Tenho trabalho físico intenso
- Minha rotina varia muito

Campo livre:

- Profissão ou área.

Exemplos:

- Administrativo
- Motorista
- Professor
- Vendedor
- Desenvolvedor
- Profissional da saúde
- Construção/serviço físico
- Outro

### Etapa 4: Rotina desejada de treinos

Objetivo:

- Descobrir frequência semanal possível e não apenas desejada.

Campos:

- Quantos dias por semana deseja treinar?
- Quanto tempo por treino?
- Melhor período do dia.

Opções:

- 2 dias por semana
- 3 dias por semana
- 4 dias por semana
- 5 dias por semana
- 6 dias por semana

Tempo por treino:

- Até 30 minutos
- 30 a 45 minutos
- 45 a 60 minutos
- Mais de 60 minutos

Período:

- Manhã
- Tarde
- Noite
- Varia conforme o dia

### Etapa 5: Peso e altura

Objetivo:

- Coletar métricas iniciais para acompanhamento.

Campos:

- Peso atual.
- Altura.

Formato:

- Peso em kg.
- Altura em cm.

Cuidados:

- Validar faixas plausíveis.
- Permitir edição futura no perfil.

### Etapa 6: Sono

Objetivo:

- Entender recuperação e rotina de descanso.

Pergunta:

```txt
Quantas horas por dia você normalmente dorme?
```

Opções:

- Menos de 5 horas
- 5 a 6 horas
- 7 a 8 horas
- Mais de 8 horas
- Varia muito

Possível pergunta complementar:

```txt
Você costuma acordar descansado?
```

Opções:

- Sim
- Às vezes
- Não

### Etapa 7: Histórico de academia

Objetivo:

- Ajustar linguagem, dificuldade e progressão.

Pergunta:

```txt
Você já treinou em academia antes?
```

Opções:

- Nunca treinei
- Já treinei por pouco tempo
- Treinei por alguns meses
- Treinei por mais de 1 ano
- Já treino atualmente

Se responder que já treinou:

Pergunta complementar:

```txt
Por quanto tempo você treinou?
```

Opções:

- Menos de 3 meses
- 3 a 6 meses
- 6 a 12 meses
- 1 a 2 anos
- Mais de 2 anos

### Etapa 8: Alimentação e recomendações

Objetivo:

- Identificar se o usuário quer receber dicas e lembretes de hábitos.

Perguntas:

```txt
Você tem interesse em receber recomendações simples sobre boa alimentação?
```

Opções:

- Sim, quero receber
- Talvez, de forma moderada
- Não tenho interesse agora

```txt
Você gostaria de receber conselhos diários para melhorar sua rotina?
```

Opções:

- Sim
- Apenas quando fizer sentido
- Não

Observação importante:

- Não prometer prescrição nutricional.
- Usar linguagem de orientação geral.
- Se no futuro houver nutricionista/profissional, separar recomendações gerais de plano alimentar profissional.

### Etapa 9: Fotos de alimentação e evolução

Objetivo:

- Entender se o usuário aceita contribuir com fotos para diário alimentar e evolução física.

Perguntas:

```txt
Você gostaria de registrar fotos das suas refeições para acompanhar sua rotina alimentar?
```

Opções:

- Sim
- Talvez depois
- Não

```txt
Você gostaria de registrar fotos de evolução para acompanhar seu progresso?
```

Opções:

- Sim
- Talvez depois
- Não

Cuidados:

- Explicar privacidade.
- Garantir que é opcional.
- Deixar claro que o usuário poderá excluir fotos.
- Separar fotos de alimentação de fotos corporais.

### Etapa 10: Resumo e confirmação

Objetivo:

- Mostrar um resumo leve antes de finalizar.
- Permitir voltar e editar respostas.

Conteúdo:

- Frequência de treino.
- Peso/altura.
- Rotina de trabalho.
- Sono.
- Experiência com academia.
- Preferências de recomendações.

Ação principal:

- `Finalizar configuração`

Após finalizar:

- Salvar localmente.
- Enviar para API quando disponível.
- Redirecionar para `/(app)/home`.

## Estrutura de dados

Criar tipos em:

```txt
src/types/onboarding.ts
```

Modelo inicial:

```ts
export type BiologicalSex = 'male' | 'female' | 'prefer_not_to_say';

export type WorkRoutine =
  | 'mostly_sitting'
  | 'mostly_standing'
  | 'moderate_physical'
  | 'intense_physical'
  | 'varies';

export type TrainingDaysPerWeek = 2 | 3 | 4 | 5 | 6;

export type TrainingDuration = 'up_to_30' | '30_to_45' | '45_to_60' | 'over_60';

export type DayPeriod = 'morning' | 'afternoon' | 'night' | 'varies';

export type SleepHours = 'less_than_5' | '5_to_6' | '7_to_8' | 'more_than_8' | 'varies';

export type RestedWakeUp = 'yes' | 'sometimes' | 'no';

export type GymExperience =
  | 'never'
  | 'short_time'
  | 'few_months'
  | 'more_than_1_year'
  | 'currently_training';

export type PreviousTrainingTime =
  | 'less_than_3_months'
  | '3_to_6_months'
  | '6_to_12_months'
  | '1_to_2_years'
  | 'more_than_2_years';

export type InterestLevel = 'yes' | 'moderate' | 'no';

export type OptionalConsent = 'yes' | 'maybe_later' | 'no';

export type OnboardingProfile = {
  sex?: BiologicalSex;
  workRoutine?: WorkRoutine;
  profession?: string;
  trainingDaysPerWeek?: TrainingDaysPerWeek;
  trainingDuration?: TrainingDuration;
  preferredTrainingPeriod?: DayPeriod;
  weightKg?: number;
  heightCm?: number;
  sleepHours?: SleepHours;
  wakesUpRested?: RestedWakeUp;
  gymExperience?: GymExperience;
  previousTrainingTime?: PreviousTrainingTime;
  wantsNutritionTips?: InterestLevel;
  wantsDailyAdvice?: InterestLevel;
  wantsMealPhotoDiary?: OptionalConsent;
  wantsProgressPhotos?: OptionalConsent;
};
```

## Validação com Zod

Criar schemas em:

```txt
src/schemas/onboarding.ts
```

Validações:

- Sexo obrigatório.
- Rotina de trabalho obrigatória.
- Profissão opcional, mas se preenchida deve ter mínimo de 2 caracteres.
- Frequência de treino obrigatória.
- Peso entre 30 e 300 kg.
- Altura entre 100 e 250 cm.
- Sono obrigatório.
- Histórico de academia obrigatório.
- Se já treinou, tempo anterior obrigatório.
- Preferências de recomendações obrigatórias.
- Consentimentos de fotos obrigatórios.

## Persistência local

Para o usuário não perder os dados iniciais:

1. Criar um contexto/store de onboarding.
2. Salvar cada etapa localmente.
3. Reidratar o fluxo se o app for fechado.

Opções:

- Inicialmente: estado em Context API.
- Para persistência real: `AsyncStorage` ou `expo-secure-store`.

Recomendação:

- Usar `AsyncStorage` para dados de onboarding não sensíveis.
- Usar `expo-secure-store` apenas para token/sessão.

Dependência provável:

```powershell
npx expo install @react-native-async-storage/async-storage
```

Não instalar agora sem necessidade. Instalar quando formos implementar a persistência.

## Preparação para API

Criar serviço:

```txt
src/services/onboarding.ts
```

Funções:

```ts
export async function saveOnboardingProfile(profile: OnboardingProfile) {}
export async function getOnboardingProfile() {}
export async function clearOnboardingDraft() {}
```

Fluxo futuro:

1. Usuário responde etapa.
2. Dados são salvos localmente como rascunho.
3. Ao finalizar, app chama API.
4. Se API falhar, mantém rascunho local e tenta novamente depois.

## UX e UI

### Padrão visual

- Fundo escuro.
- Cards ou blocos simples.
- Verde para seleção/ação principal.
- Cinza para opções neutras.
- Texto curto, direto e humano.
- Progresso visível: `Etapa 3 de 10` ou barra de progresso.

### Componentes necessários

```txt
src/components/onboarding/
  OnboardingLayout.tsx
  OnboardingProgress.tsx
  OnboardingOption.tsx
  OnboardingStepTitle.tsx
  OnboardingFooter.tsx
  OnboardingNumberInput.tsx
```

### Interações esperadas

- Botão `Continuar` desabilitado até a etapa estar válida.
- Botão `Voltar`.
- Animação de entrada/saída entre etapas.
- Possibilidade de revisar no final.
- Evitar teclado cobrindo campos numéricos.

## Animações

Usar `react-native-reanimated`.

Transições sugeridas:

- Entrada da pergunta: fade + slide vertical curto.
- Troca de etapa: slide horizontal.
- Seleção de opção: borda verde + leve scale.
- Progresso: barra animada.

Cuidados:

- Animações rápidas, entre 180ms e 320ms.
- Nada que atrase o usuário.
- Priorizar clareza e sensação de fluidez.

## Prompt refinado para implementação

```txt
Criar um fluxo de onboarding pós-cadastro para o Gym Flow em React Native/Expo Router.

O fluxo deve acontecer após o cadastro/login e coletar dados em múltiplas etapas, com uma experiência visual parecida com apps modernos de saúde e treino. A interface deve ser mobile-first, intuitiva, com fundo escuro, destaque verde, barra de progresso, botão voltar, botão continuar e transições suaves entre etapas.

Coletar:
- Sexo.
- Tipo de rotina profissional e profissão.
- Frequência desejada de treinos por semana.
- Duração desejada por treino.
- Período preferido para treinar.
- Peso e altura.
- Horas médias de sono.
- Se acorda descansado.
- Se já fez academia.
- Quanto tempo treinou, caso já tenha treinado.
- Interesse em recomendações de alimentação.
- Interesse em conselhos diários.
- Consentimento para registrar fotos de refeições.
- Consentimento para registrar fotos de evolução física.

Criar estrutura sólida para não perder dados:
- Tipos em `src/types/onboarding.ts`.
- Schemas Zod em `src/schemas/onboarding.ts`.
- Context/store em `src/contexts/onboarding-context.tsx`.
- Serviço futuro em `src/services/onboarding.ts`.
- Componentes reutilizáveis em `src/components/onboarding/`.

Não chamar API diretamente nas telas. Ao finalizar, usar um serviço centralizado. Enquanto a API não existir, salvar em mock/rascunho local.

O fluxo deve validar cada etapa antes de permitir continuar. Deve ter resumo final para revisão e depois redirecionar para `/(app)/home`.
```

## Ordem de execução recomendada

1. Criar tipos de onboarding.
2. Criar schemas Zod.
3. Criar contexto/store do onboarding.
4. Criar componentes visuais reutilizáveis.
5. Criar tela única `app/(onboarding)/index.tsx`.
6. Implementar etapas uma por uma.
7. Conectar finalização ao serviço mock.
8. Redirecionar cadastro para onboarding em vez de home.
9. Adicionar resumo final.
10. Validar lint, TypeScript e fluxo no web/mobile.

## Critérios de aceite

- Usuário termina cadastro e cai no onboarding.
- Cada etapa é simples e clara.
- Usuário consegue voltar sem perder resposta.
- O app mantém as respostas em uma estrutura única.
- Validação impede avanço com dados inválidos.
- Resumo final mostra as principais escolhas.
- O fluxo está pronto para salvar em banco via API.
