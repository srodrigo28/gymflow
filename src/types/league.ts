// Fase 4 (ranking, ligas e premiação): o formato das respostas da API. O servidor calcula tudo a
// partir dos treinos que já subiram para a conta; o app só mostra.

export type LeagueTier = 'bronze' | 'prata' | 'ouro' | 'elite';

// De onde veio o XP de um período. `boost` é o extra do XP em dobro por ter trazido gente.
export type XpBreakdown = {
  boost: number;
  checkins: number;
  goal: number;
  sets: number;
  workouts: number;
};

// As regras em vigor, para a tela "Como ganhar XP" não descolar do servidor.
export type XpRules = {
  boostDays: number;
  checkinXp: number;
  defaultGoalDays: number;
  goalXpPerDay: number;
  maxGoalDays: number;
  maxSetsPerDay: number;
  maxWorkoutsPerDay: number;
  minGoalDays: number;
  setXp: number;
  workoutXp: number;
};

export type WeeklyGoal = {
  // XP da meta batida: goalXpPerDay × days.
  bonusXp: number;
  // Meta desta semana (dias com treino).
  days: number;
  // Dias com treino concluído nesta semana.
  doneDays: number;
  // true enquanto a pessoa nunca escolheu: vale a meta padrão.
  isDefault: boolean;
  // Mudança já marcada para a próxima semana (mudar a meta só vale da semana seguinte em diante).
  nextWeekDays: number | null;
  reached: boolean;
};

// Sequência de semanas com a meta batida (22-estrategia.md, seção 3.2). Os escudos são automáticos:
// uma semana que ficou a UM dia da meta é coberta por um escudo, se ainda houver no mês (2 por mês,
// contados pelo mês da segunda-feira da semana). O escudo segura a sequência, mas não soma semana nem
// dá o XP da meta. Sem sequência em andamento, nenhum escudo é gasto.
export type Streak = {
  // Melhor sequência das últimas 52 semanas (contando a atual, se já bateu a meta).
  bestWeeks: number;
  // A semana atual já bateu a meta e por isso já conta em `weeks`. false: ainda em aberto, não quebra nada.
  currentWeekReached: boolean;
  // Semanas deste mês cobertas por escudo (segunda-feira, AAAA-MM-DD), da mais antiga para a mais nova.
  protectedWeeks: string[];
  shieldsLeft: number;
  shieldsPerMonth: number;
  // Semanas seguidas com a meta batida até agora.
  weeks: number;
};

export type XpSummary = {
  // XP em dobro até este instante (ISO), por ter trazido alguém pelo convite de um desafio.
  boostUntil: string | null;
  goal: WeeklyGoal;
  level: number;
  // XP em que o nível atual começou e XP do próximo nível.
  levelFloorXp: number;
  month: { key: string; xp: number };
  nextLevelXp: number;
  rules: XpRules;
  streak: Streak;
  totalXp: number;
  week: {
    breakdown: XpBreakdown;
    endsAt: string;
    // Segunda-feira da semana (AAAA-MM-DD), no fuso de São Paulo.
    key: string;
    startsAt: string;
    // Dias com treino concluído e, deles, os que tiveram check-in verificado.
    trainingDays: number;
    verifiedDays: number;
    xp: number;
  };
};

export type LeagueZone = 'promotion' | 'stay' | 'demotion';

export type LeagueStanding = {
  isMe: boolean;
  // Primeiro nome e a inicial do sobrenome ("Ana S."): na liga há gente que não se conhece.
  name: string;
  rank: number;
  userId: string;
  xp: number;
  zone: LeagueZone;
};

export type LeagueOutcome = 'promoted' | 'stayed' | 'demoted';

export type LeagueResult = {
  memberCount: number;
  newTier: LeagueTier;
  outcome: LeagueOutcome;
  rank: number;
  tier: LeagueTier;
  weekKey: string;
  xp: number;
};

export type LeagueRules = {
  demotePercent: number;
  groupSize: number;
  // Grupos menores que isso não rebaixam ninguém.
  minDemoteGroupSize: number;
  promotePercent: number;
  // XP mínimo na semana para subir, mesmo estando no topo.
  promotionMinXp: number;
};

export type LeagueOverview = {
  // null: a pessoa ainda não ganhou XP nesta semana (entra no grupo com o primeiro treino) ou saiu das ligas.
  group: { id: string; memberCount: number; standings: LeagueStanding[] } | null;
  lastResult: LeagueResult | null;
  participate: boolean;
  rules: LeagueRules;
  tier: LeagueTier;
  week: { endsAt: string; key: string; startsAt: string };
};

export type SeasonUnit = 'xp' | 'dias' | 'pontos' | 'percent' | 'kg' | 'minutos' | 'treinos';

export type SeasonEntry = {
  isMe: boolean;
  name: string;
  rank: number;
  userId: string;
  value: number;
};

export type SeasonCategory = {
  description: string;
  // Quem tem valor na categoria (você e seus amigos), do primeiro ao último. Empate divide a posição.
  entries: SeasonEntry[];
  // 'xp', 'constancia', 'constancia-verificada', 'pontualidade', 'forca', 'evolucao', 'tonelagem',
  // 'equilibrio', 'cardio:<exercício>' ou 'modalidade:<modalidade>'. Evolução, tonelagem, equilíbrio,
  // cardio e modalidades só aparecem entre quem liga "Mostrar detalhes aos amigos" (PUT /me/season-sharing).
  id: string;
  // hint: por que você não aparece (ou o que falta), quando não aparece.
  me: { hint: string | null; rank: number | null; value: number | null };
  // Marcas suas "a confirmar" (salto grande demais): não contam até serem confirmadas.
  pending: string[];
  // Entre quem é a disputa ("Você e seus amigos", "Você e seus amigos na liga Prata").
  scope: string;
  title: string;
  unit: SeasonUnit;
};

export type AwardKind = 'trophy' | 'badge';

export type Award = {
  awardedAt: string;
  description: string;
  // Nome de ícone do MaterialCommunityIcons.
  icon: string;
  id: string;
  key: string;
  kind: AwardKind;
  // Mês (AAAA-MM) ou semana (AAAA-MM-DD) do troféu; null nos selos.
  periodKey: string | null;
  title: string;
};

export type Season = {
  // Troféus ganhos neste mês (só depois que a temporada fecha).
  awards: Award[];
  categories: SeasonCategory[];
  // Primeira temporada que existe (AAAA-MM): o seletor de meses não passa dela.
  firstSeasonKey: string;
  friendsCount: number;
  month: { closed: boolean; endsAt: string; key: string; startsAt: string };
  // A pessoa ligou "Mostrar detalhes aos amigos": volume (tonelagem), evolução, cardio, modalidades e
  // equilíbrio. Sem isso ela não aparece nessas categorias para ninguém e também não vê os amigos nelas
  // (vale nos dois sentidos). Do equilíbrio, os amigos veem só a contagem de dias.
  sharing: boolean;
  // Categorias da estratégia que ainda não dá para medir, com o motivo. Vem vazia desde que as oito
  // categorias passaram a ser medidas; o campo fica para o caso de alguma um dia ficar sem dado.
  unavailable: { id: string; reason: string; title: string }[];
};

export type DotsFormula = 'male' | 'female';

// Só existe com o consentimento da pessoa, para o ranking de força relativa. Ninguém vê o peso.
export type StrengthProfile = {
  bodyweightKg: number;
  consentedAt: string;
  formula: DotsFormula;
  updatedAt: string;
};

export type ServerGym = {
  // Confirmada por duas contas diferentes ou pela equipe: só aí o check-in vale como verificado.
  confirmed: boolean;
  id: string;
  latitude: number;
  longitude: number;
  name: string;
  radiusM: number;
};

export type ServerCheckin = {
  createdAt: string;
  // Dia do check-in (AAAA-MM-DD), no fuso de São Paulo.
  day: string;
  distanceM: number;
  gymId: string;
  id: string;
  // No raio da academia e com a academia confirmada.
  verified: boolean;
  withinRadius: boolean;
};

export type AdminGym = ServerGym & {
  checkinCount: number;
  confirmedBy: 'members' | 'admin' | null;
  createdAt: string;
  memberCount: number;
};

// Agenda de treinos (pontualidade, 22-estrategia.md seção 3.3): até 7 compromissos por semana, no
// fuso de São Paulo. Só conta para quem agendou: sem agenda, a pessoa não entra na pontualidade.
export type ScheduleSlot = {
  // Hora marcada, "HH:MM" (24 h).
  time: string;
  // 0 = segunda … 6 = domingo.
  weekday: number;
};

export type Schedule = {
  rules: {
    maxSlots: number;
    // Compromissos já passados no mês para a pessoa entrar na categoria.
    minPastSlots: number;
    // O treino conta como pontual se começar até esta quantidade de minutos antes ou depois da hora.
    windowMinutes: number;
  };
  slots: ScheduleSlot[];
  timezone: string;
};
