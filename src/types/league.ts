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

export type SeasonUnit = 'xp' | 'dias' | 'pontos' | 'percent' | 'kg' | 'minutos';

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
  // 'xp', 'constancia', 'constancia-verificada', 'forca', 'evolucao', 'tonelagem' ou 'cardio:<exercício>'.
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
  // A pessoa escolheu mostrar volume (tonelagem), evolução e cardio aos amigos. Sem isso ela não
  // aparece nessas três categorias para ninguém e também não vê os amigos nelas (vale nos dois sentidos).
  sharing: boolean;
  // Categorias da estratégia que ainda não dá para medir, com o motivo.
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
