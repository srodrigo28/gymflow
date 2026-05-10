# Plano da tela de perfil

## Objetivo

Criar uma tela de perfil que funcione como a central pessoal do usuário. Como o app terá poucos menus principais, essa área pode concentrar atalhos importantes em cards com rolagem, imagem, título e texto representativo.

A primeira versão deve ser simples, bonita e direta, mas já preparada para receber no futuro um dashboard de evolução corporal e um sistema de recomendações mais inteligente.

## Estrutura inicial da tela

### 1. Cabeçalho do perfil

- Foto circular centralizada no topo.
- Nome do usuário logo abaixo.
- Texto curto de apoio:
  - "Acompanhe suas escolhas, rotina e evolução."
- Botão ou área clicável:
  - "Alterar perfil"

### 2. Alterar perfil

Ao clicar em "Alterar perfil", a pessoa deve encontrar opções para atualizar os dados principais.

Campos planejados:

- Foto
- Nome
- Peso
- Altura
- Objetivo atual
- Nível de treino
- Preferências alimentares
- Preferências de exercícios

Essa área pode abrir como uma tela separada no futuro. Para a primeira versão, pode ser apenas um card ou botão preparado para navegação.

### 3. Cards com rolagem

Usar cards em lista vertical ou grid responsivo.

Cada card deve ter:

- Imagem ou ícone visual.
- Título curto.
- Texto acessível explicando a função.
- Estado visual de toque.
- Área clicável confortável para dedo em dispositivos pequenos.

## Menus do perfil

### Ordem recomendada dos cards

1. Sincronizar dispositivos
2. Alimentações diárias
3. Alimentação ideal para escolher
4. Escolhas de treinos
5. Recomendações
6. Conquistas
7. Frase do dia

### 1. Sincronizar dispositivos

Título do card: Sincronizar dispositivos

Cor sugerida:
Amarelo/âmbar.

Texto representativo:
"Conecte relógios e dispositivos para acompanhar atividade, saúde e sinais de evolução."

Função planejada:

- Permitir conectar relógios inteligentes e dispositivos de saúde.
- Preparar integração futura com dados de passos, batimentos, sono e calorias.
- Usar esses dados para melhorar recomendações de treino, descanso e evolução corporal.

### 2. Alimentações diárias

Título do card: Alimentações diárias

Texto representativo:
"Informe os tipos de refeições que costuma fazer no dia para melhorar suas recomendações."

Função planejada:

- Adicionar tipos de alimentação que a pessoa costuma fazer.
- Permitir selecionar refeições comuns da rotina.

### 3. Alimentação ideal para escolher

Título do card: Alimentação ideal para escolher

Texto representativo:
"Escolha ideias de alimentação alinhadas ao seu objetivo, rotina e preferências."

Função planejada:

- Mostrar opções simples e seguras.
- Separar sugestões por objetivo.
- Ajudar a pessoa a escolher caminhos de alimentação mais compatíveis com o perfil.

### 4. Escolhas de treinos

Título do card: Escolhas de treinos

Texto representativo:
"Ajuste seus tipos de treino favoritos, disponibilidade, foco principal e preferências de exercícios."

Função planejada:

- Permitir escolher estilos de treino.
- Permitir selecionar preferências de exercícios por categoria.
- Usar essas escolhas para melhorar métricas e recomendações futuras.

Exemplos de estilos:

- Hipertrofia
- Emagrecimento
- Força
- Condicionamento
- Mobilidade
- Treino em casa
- Academia

### 5. Recomendações

Título do card: Recomendações

Texto representativo:
"Receba sugestões personalizadas com base no seu perfil, rotina e respostas da avaliação."

Função planejada:

- Listar recomendações gerais de treino, descanso e rotina.
- Usar dados do onboarding para adaptar as mensagens.
- No futuro, conectar com histórico real do usuário.

### 6. Conquistas

Título do card: Conquistas

Cor sugerida:
Azul claro.

Texto representativo:
"Veja marcos importantes da sua jornada, como constância, treinos concluídos e evolução registrada."

Função planejada:

- Mostrar badges, metas batidas e progresso por período.
- Exibir conquistas simples no início.
- Evoluir depois para conquistas por treino, alimentação e medidas.

## Preferências de exercícios

Essa área deve ficar dentro de "Escolhas de treinos" ou como uma subárea chamada "Exercícios preferidos".

Objetivo:

Entender quais tipos de exercícios o usuário prefere, quais evita e quais fazem sentido para sua rotina. Esses dados ajudam o app a recomendar treinos com mais precisão.

### Sequência recomendada

#### Etapa 1: Onde você costuma treinar?

Pergunta:
"Onde você costuma treinar com mais frequência?"

Opções:

- Academia
- Casa
- Ar livre
- Condomínio
- Estúdio ou box
- Varia conforme o dia

Como usar nas recomendações:

- Academia: liberar máquinas, cabos, barras e halteres.
- Casa: priorizar peso corporal, elásticos e halteres simples.
- Ar livre: priorizar corrida, caminhada, escadas e funcionais.
- Estúdio ou box: permitir treinos mais intensos e circuitos.

#### Etapa 2: Quais categorias você prefere?

Pergunta:
"Quais tipos de exercícios você mais gosta de fazer?"

Permitir múltipla escolha.

Categorias principais:

- Musculação
- Cardio
- Funcional
- Mobilidade e alongamento
- Abdômen e core
- Peso corporal
- Esportes
- Recuperação ativa

Texto de apoio:
"Escolha as categorias que combinam com você. Isso ajuda o app a montar sugestões mais naturais para sua rotina."

#### Etapa 3: Filtrar por grupo muscular

Pergunta:
"Quais regiões você quer priorizar?"

Permitir múltipla escolha.

Grupos sugeridos:

- Peito
- Costas
- Ombros
- Braços
- Abdômen
- Glúteos
- Pernas
- Panturrilhas
- Corpo inteiro

Uso nas métricas:

- Identificar foco corporal.
- Evitar excesso de volume em uma região.
- Sugerir equilíbrio entre membros superiores, inferiores e core.

#### Etapa 4: Filtrar por intensidade preferida

Pergunta:
"Qual intensidade costuma combinar melhor com você?"

Opções:

- Leve
- Moderada
- Intensa
- Varia conforme o dia

Texto de apoio:
"A intensidade ideal pode mudar. Aqui queremos entender o que você costuma tolerar melhor."

Uso nas recomendações:

- Ajustar volume, descanso e dificuldade.
- Evitar recomendações agressivas para iniciantes.
- Sugerir progressão gradual.

#### Etapa 5: Filtrar por equipamento disponível

Pergunta:
"Quais equipamentos você costuma ter disponível?"

Permitir múltipla escolha.

Opções:

- Nenhum equipamento
- Halteres
- Barras
- Anilhas
- Máquinas
- Cabos
- Elásticos
- Caneleiras
- Colchonete
- Esteira
- Bicicleta ergométrica

Uso nas recomendações:

- Evitar exercícios impossíveis para a realidade do usuário.
- Trocar exercícios por alternativas equivalentes.
- Criar treinos mais práticos.

#### Etapa 6: Exercícios que você gosta

Pergunta:
"Quais exercícios você gosta ou gostaria de incluir nos treinos?"

Mostrar lista filtrada pelas categorias anteriores.

Exemplos por categoria:

Musculação:

- Agachamento
- Leg press
- Supino
- Remada
- Puxada
- Desenvolvimento de ombros
- Rosca bíceps
- Tríceps na polia

Cardio:

- Caminhada
- Corrida
- Bicicleta
- Esteira
- Escada
- Elíptico

Funcional:

- Polichinelo
- Burpee
- Afundo alternado
- Prancha
- Agachamento livre
- Corrida estacionária

Mobilidade e alongamento:

- Alongamento de posterior
- Mobilidade de quadril
- Mobilidade de ombros
- Alongamento de peitoral
- Liberação leve

Abdômen e core:

- Prancha
- Abdominal tradicional
- Elevação de pernas
- Abdominal infra
- Dead bug
- Prancha lateral

Peso corporal:

- Flexão
- Agachamento livre
- Afundo
- Ponte de glúteos
- Elevação pélvica
- Barra fixa, se disponível

#### Etapa 7: Exercícios que prefere evitar

Pergunta:
"Tem algum exercício que você prefere evitar?"

Permitir múltipla escolha e campo opcional de observação.

Motivos possíveis:

- Não gosto
- Tenho dificuldade
- Sinto dor
- Não tenho equipamento
- Não sei executar
- Prefiro substituir

Importante:

Se o motivo for dor, o app deve tratar como alerta e sugerir cuidado. Não deve prescrever solução médica.

Texto de apoio:
"Se algum exercício causa dor, vale conversar com um profissional antes de insistir nele."

#### Etapa 8: Preferência de formato do treino

Pergunta:
"Qual formato de treino você prefere?"

Opções:

- Treino tradicional por séries
- Circuito
- Treino rápido
- Treino com foco em técnica
- Treino com mais cardio
- Treino com mais força
- Varia conforme o dia

Uso nas recomendações:

- Ajustar estrutura da sessão.
- Personalizar tempo de descanso.
- Criar treinos mais aderentes ao perfil.

### Ordem ideal da experiência

1. Local de treino.
2. Categorias preferidas.
3. Grupo muscular prioritário.
4. Intensidade preferida.
5. Equipamentos disponíveis.
6. Exercícios que gosta.
7. Exercícios que prefere evitar.
8. Formato de treino preferido.

Essa ordem é importante porque começa pelo contexto mais amplo e só depois mostra exercícios específicos. Assim o app evita listas enormes e vai filtrando naturalmente.

### Dados que devem ser salvos

Campos sugeridos:

- `trainingLocation`
- `preferredExerciseCategories`
- `priorityMuscleGroups`
- `preferredIntensity`
- `availableEquipment`
- `likedExercises`
- `avoidedExercises`
- `avoidExerciseReasons`
- `preferredWorkoutFormat`

### Como isso ajuda nas métricas

Essas respostas podem alimentar:

- Recomendações de treino mais precisas.
- Sugestões de substituição de exercícios.
- Alertas de excesso de foco em uma região.
- Relatórios de preferência do usuário.
- Evolução de aderência ao treino.
- Comparação entre o que foi recomendado e o que o usuário realmente prefere.

### Acessibilidade da área

Cada categoria deve ter texto claro.

Exemplo de `accessibilityLabel`:
"Selecionar categoria Musculação. Use esta opção se você prefere exercícios com pesos, máquinas, barras ou halteres."

Para exercícios:
"Selecionar exercício Agachamento. Exercício para pernas e glúteos, com variações para academia ou peso corporal."

## Alimentações diárias

Título do card: Alimentações diárias

Texto representativo:
"Informe os tipos de refeições que costuma fazer no dia para melhorar suas recomendações."

Função planejada:

- Adicionar tipos de alimentação que a pessoa costuma fazer.
- Permitir selecionar refeições comuns da rotina.

Exemplos:

- Café da manhã
- Almoço
- Lanche
- Jantar
- Ceia
- Pré-treino
- Pós-treino

No futuro, permitir registrar horários, observações e preferências.

## Alimentação ideal para escolher

Título do card: Alimentação ideal para escolher

Texto representativo:
"Escolha ideias de alimentação alinhadas ao seu objetivo, rotina e preferências."

Função planejada:

- Mostrar sugestões simples e seguras.
- Separar por objetivo:
  - Ganho de massa
  - Perda de gordura
  - Manutenção
  - Energia para treino
- Evitar linguagem médica ou prescritiva.
- Incentivar acompanhamento profissional quando necessário.

## Frase do dia

Título do card: Frase do dia

Texto representativo:
"Publique ou salve uma frase para marcar seu momento e manter sua motivação visível."

Função planejada:

- Permitir criar uma frase curta.
- Mostrar frase no perfil.
- No futuro, permitir compartilhar ou salvar histórico.

## Área futura: dashboard evolutivo corporal

Essa área pode entrar dentro do perfil como um bloco especial, abaixo da foto e antes dos cards principais.

Título sugerido:
"Evolução corporal"

Texto representativo:
"Acompanhe peso, medidas, fotos e sinais de evolução ao longo do tempo."

Indicadores futuros:

- Peso atual
- Variação de peso
- IMC estimado
- Medidas corporais
- Fotos de evolução
- Frequência de treino
- Consistência semanal
- Energia e humor
- Categorias de exercícios mais usadas
- Exercícios favoritos
- Exercícios evitados

Componentes futuros:

- Gráfico simples de peso.
- Cards pequenos de indicadores.
- Linha do tempo de fotos.
- Comparativo antes/depois.
- Escala de progresso com meta atual.
- Mapa de foco muscular por período.
- Ranking de exercícios mais executados.

## Organização visual sugerida

### 1. Topo centralizado

- Foto circular.
- Nome.
- Botão "Alterar perfil".

### 2. Bloco de resumo rápido

- Objetivo atual.
- Nível de treino.
- Frequência semanal.

### 3. Scroll de cards

- Cards com imagem e título.
- Texto curto e acessível.
- Separação clara entre cada área.

### 4. Área de preferências de exercícios

- Pode abrir a partir do card "Escolhas de treinos".
- Deve usar filtros progressivos para evitar uma tela lotada.
- Deve permitir voltar e ajustar escolhas sem perder respostas anteriores.

### 5. Destaque final de evolução corporal

- Card maior chamado "Evolução corporal".
- Deve ficar no final da rolagem, depois dos menus principais.
- Ao clicar, abre a tela detalhada no futuro.

## Acessibilidade

- Todo card deve ter texto claro, não apenas imagem.
- Usar títulos objetivos.
- Usar contraste alto entre texto e fundo.
- Área clicável grande o suficiente para toque.
- Evitar textos muito longos dentro dos cards.
- Cada card deve funcionar bem com leitor de tela.
- Em seleções múltiplas, informar quando um item está selecionado.
- Evitar depender apenas de cor para indicar seleção.

Exemplo de `accessibilityLabel`:
"Abrir Conquistas. Veja marcos importantes da sua jornada, como constância e treinos concluídos."

## Primeira versão recomendada

Para a primeira entrega, implementar:

1. Foto central do perfil.
2. Nome e botão "Alterar perfil".
3. Card de resumo rápido.
4. Cards:
   - Conquistas
   - Recomendações
   - Escolhas de treinos
   - Alimentações diárias
   - Alimentação para seu perfil
   - Frase do dia
5. Card de destaque "Evolução corporal" no final da rolagem.
6. Dentro de "Escolhas de treinos", iniciar com a sequência:
   - Local de treino
   - Categorias preferidas
   - Grupos musculares
   - Equipamentos disponíveis
   - Exercícios que gosta
   - Exercícios que prefere evitar

## Observações de design

- Usar cards com imagem real ou ilustração leve.
- Manter bordas discretas e raio pequeno.
- Evitar poluir a tela inicial.
- Priorizar rolagem vertical natural.
- Cada card deve ter uma ação clara.
- A tela deve parecer uma central pessoal, não uma página de marketing.
- A seleção de exercícios deve ser progressiva, com filtros, para não exibir uma lista enorme logo de cara.
