import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useEffect, useState, type ComponentProps } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, Switch, Text, View } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { Screen } from '@/src/components/ui/Screen';
import { useSession } from '@/src/contexts/session-context';
import { ApiError } from '@/src/services/api';
import {
  formatXp,
  getLeague,
  getXpSummary,
  setLeagueParticipation,
  setWeeklyGoal,
  tierIndex,
  tierLabels,
} from '@/src/services/league';
import { getOnboardingProfile } from '@/src/services/onboarding';
import { syncWorkouts } from '@/src/services/sync';
import { fonts, makeStyles, radius, typography, useTheme, withAlpha, type Theme } from '@/src/theme';
import type {
  LeagueOverview,
  LeagueResult,
  LeagueRules,
  LeagueStanding,
  LeagueTier,
  Streak,
  WeeklyGoal,
  XpBreakdown,
  XpRules,
  XpSummary,
} from '@/src/types/league';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

// De onde veio o pedido para entrar ou sair das ligas: o erro aparece perto do que foi tocado.
type ParticipationSource = 'league' | 'switch';

// A semana da liga é a de São Paulo, que não tem horário de verão desde 2019: é sempre UTC−3. As
// datas e os dias que faltam seguem esse relógio, o mesmo do servidor, em qualquer fuso do aparelho.
const SAO_PAULO_OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
// Quanto a tela espera os treinos subirem antes de pedir o XP.
const SYNC_WAIT_MS = 4000;

const TIERS = (Object.keys(tierLabels) as LeagueTier[]).sort((a, b) => tierIndex(a) - tierIndex(b));

// A cor da insígnia de cada liga. No tema claro ela escurece para manter o contraste sobre o branco.
const tierColors: Record<LeagueTier, Record<Theme['scheme'], string>> = {
  bronze: { dark: '#E3A174', light: '#9A5B2E' },
  elite: { dark: '#B9A8FF', light: '#5B4FCF' },
  ouro: { dark: '#FFD35C', light: '#946000' },
  prata: { dark: '#C5CEDB', light: '#5B6678' },
};

const breakdownParts: { key: keyof XpBreakdown; label: string }[] = [
  { key: 'workouts', label: 'Treinos' },
  { key: 'sets', label: 'Séries' },
  { key: 'checkins', label: 'Check-in' },
  { key: 'goal', label: 'Meta' },
  { key: 'boost', label: 'Bônus do convite' },
];

const links: { description: string; href: Href; icon: IconName; title: string }[] = [
  {
    description: 'O mês em categorias entre você e seus amigos, com troféus no fechamento.',
    href: '/(app)/liga/temporada',
    icon: 'calendar-star',
    title: 'Temporada entre amigos',
  },
  {
    description: 'Agachamento, supino e terra, ajustados pelo peso corporal.',
    href: '/(app)/liga/forca',
    icon: 'arm-flex-outline',
    title: 'Força relativa (DOTS)',
  },
  {
    description: 'Os marcos que você já alcançou e os próximos.',
    href: '/(app)/conquistas',
    icon: 'trophy-outline',
    title: 'Troféus e selos',
  },
];

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

// As mensagens da API já vêm prontas para a tela; qualquer outro erro vira uma frase nossa.
function messageOf(reason: unknown, fallback: string) {
  return reason instanceof ApiError ? reason.message : fallback;
}

// O treino de agora há pouco precisa estar na conta para contar no XP. A espera tem limite: com a
// rede ruim, a tela carrega com o que o servidor já tem.
function syncFirst(token: string) {
  return Promise.race([
    syncWorkouts(token).catch(() => undefined),
    new Promise<void>((resolve) => setTimeout(resolve, SYNC_WAIT_MS)),
  ]);
}

/** O instante no relógio de São Paulo: leia com os getters UTC. */
function saoPauloDate(instant: number) {
  return new Date(instant - SAO_PAULO_OFFSET_MS);
}

function saoPauloDay(instant: number) {
  return Math.floor((instant - SAO_PAULO_OFFSET_MS) / DAY_MS);
}

// "Semana de 21 a 27 de set"; virando o mês, "Semana de 29 de set a 5 de out". O fim é a segunda
// seguinte à meia-noite e fica de fora: o último dia é o domingo.
function weekLabel(startsAt: string, endsAt: string) {
  const startMs = Date.parse(startsAt);
  const endMs = Date.parse(endsAt);

  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
    return 'Semana atual';
  }

  const start = saoPauloDate(startMs);
  const end = saoPauloDate(endMs - 1);
  const startMonth = MONTHS[start.getUTCMonth()];
  const endMonth = MONTHS[end.getUTCMonth()];

  return startMonth === endMonth
    ? `Semana de ${start.getUTCDate()} a ${end.getUTCDate()} de ${endMonth}`
    : `Semana de ${start.getUTCDate()} de ${startMonth} a ${end.getUTCDate()} de ${endMonth}`;
}

// Conta o dia de hoje: na segunda faltam 7 dias; no domingo, é o último.
function daysLeftLabel(endsAt: string) {
  const endMs = Date.parse(endsAt);

  if (!Number.isFinite(endMs)) {
    return null;
  }

  const days = saoPauloDay(endMs) - saoPauloDay(Date.now());

  if (days <= 0) {
    return 'fechando';
  }

  return days === 1 ? 'último dia' : `faltam ${days} dias`;
}

// "28/09": o último dia com o XP em dobro. Um fim exatamente à meia-noite não leva o dia seguinte.
function dayMonth(instant: number) {
  const date = saoPauloDate(instant - 1);

  return `${String(date.getUTCDate()).padStart(2, '0')}/${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function range(from: number, to: number) {
  return Array.from({ length: Math.max(0, to - from + 1) }, (_, index) => from + index);
}

function trainingDaysText(trainingDays: number, verifiedDays: number) {
  if (trainingDays === 0) {
    return 'Nenhum dia com treino ainda: o primeiro já conta.';
  }

  return `${plural(trainingDays, 'dia', 'dias')} com treino · ${verifiedDays} ${
    verifiedDays === 1 ? 'verificado' : 'verificados'
  }`;
}

// A regra geral, com as duas pontas: da Bronze ninguém desce e da Elite ninguém sobe.
function leagueLegend(rules: LeagueRules, tier: LeagueTier) {
  const promotion =
    tier === 'elite'
      ? 'A Elite é a liga mais alta: dela ninguém sobe.'
      : `Os ${rules.promotePercent}% do topo sobem (com pelo menos ${formatXp(rules.promotionMinXp)}).`;
  const demotion =
    tier === 'bronze'
      ? 'Da Bronze ninguém desce.'
      : `Os ${rules.demotePercent}% de baixo descem, em grupos a partir de ${rules.minDemoteGroupSize} pessoas.`;

  return `${promotion} ${demotion} Grupos de até ${rules.groupSize} pessoas do mesmo nível.`;
}

function resultText(result: LeagueResult) {
  const tier = tierLabels[result.tier];
  const newTier = tierLabels[result.newTier];

  if (result.outcome === 'promoted') {
    return `Semana passada: ${result.rank}º lugar na ${tier}. Você subiu para a ${newTier}!`;
  }

  if (result.outcome === 'demoted') {
    return `Nesta semana você treina na ${newTier}. Cada treino conta desde segunda.`;
  }

  return `Semana passada: ${result.rank}º lugar na ${tier}, com ${formatXp(result.xp)}.`;
}

export default function LigaScreen() {
  const styles = useStyles();
  const { theme } = useTheme();
  const { session } = useSession();
  const [summary, setSummary] = useState<XpSummary | null>(null);
  const [league, setLeague] = useState<LeagueOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [routineDays, setRoutineDays] = useState<number | null>(null);
  // A escolha que está sendo salva: o botão já mostra a posição nova enquanto o servidor responde.
  const [pendingParticipation, setPendingParticipation] = useState<boolean | null>(null);
  const [participationError, setParticipationError] = useState<{
    from: ParticipationSource;
    message: string;
  } | null>(null);
  const token = session?.token;
  const userId = session?.user.id;

  // XP e liga vêm juntos, mas um não segura o outro: se só um falhar, o outro aparece.
  const load = useCallback(async () => {
    if (!token) {
      return;
    }

    await syncFirst(token);

    const [xp, overview] = await Promise.allSettled([getXpSummary(token), getLeague(token)]);

    if (xp.status === 'fulfilled') {
      setSummary(xp.value);
    }

    if (overview.status === 'fulfilled') {
      setLeague(overview.value);
    }

    const failure = [xp, overview].find((result): result is PromiseRejectedResult => result.status === 'rejected');
    setError(failure ? messageOf(failure.reason, 'Não foi possível carregar a liga. Tente de novo em instantes.') : null);
    setIsLoaded(true);
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  // A rotina do questionário (dias de treino por semana) vira uma sugestão de meta.
  useEffect(() => {
    if (!userId) {
      return;
    }

    let active = true;

    getOnboardingProfile(userId)
      .then((profile) => {
        if (active) {
          setRoutineDays(profile?.trainingDaysPerWeek ?? null);
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [userId]);

  async function refresh() {
    setIsRefreshing(true);
    await load();
    setIsRefreshing(false);
  }

  // A meta nova aparece na hora; o recarregamento traz o XP que ela pode ter mudado.
  async function chooseGoal(days: number) {
    if (!token) {
      return;
    }

    const goal = await setWeeklyGoal(token, days);
    setSummary((current) => (current ? { ...current, goal } : current));
    await load();
  }

  async function applyParticipation(participate: boolean, from: ParticipationSource) {
    if (!token) {
      return;
    }

    setPendingParticipation(participate);
    setParticipationError(null);

    try {
      await setLeagueParticipation(token, participate);
      await load();
    } catch (reason) {
      setParticipationError({ from, message: messageOf(reason, 'Não foi possível salvar a sua escolha.') });
    } finally {
      setPendingParticipation(null);
    }
  }

  function handleParticipationSwitch(participate: boolean) {
    if (participate) {
      void applyParticipation(true, 'switch');
      return;
    }

    Alert.alert(
      'Sair das ligas?',
      'Você sai do grupo desta semana e deixa de aparecer na classificação. O seu XP continua contando para o nível, e dá para voltar quando quiser.',
      [
        { style: 'cancel', text: 'Continuar na liga' },
        { onPress: () => void applyParticipation(false, 'switch'), style: 'destructive', text: 'Sair das ligas' },
      ],
    );
  }

  return (
    <Screen edges={['top', 'right', 'left']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            colors={[theme.accent.primary]}
            onRefresh={refresh}
            refreshing={isRefreshing}
            tintColor={theme.accent.primary}
          />
        }
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Voltar"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(app)/home'))}
            style={({ pressed }) => [styles.iconButton, pressed ? styles.pressed : null]}>
            <Ionicons color={theme.text.primary} name="arrow-back" size={20} />
          </Pressable>
          <Text accessibilityRole="header" style={styles.title}>
            Liga
          </Text>
        </View>

        {error ? (
          <Text accessibilityLiveRegion="polite" style={styles.error}>
            {error}
          </Text>
        ) : null}

        {!isLoaded ? (
          <ActivityIndicator accessibilityLabel="Carregando a liga" color={theme.accent.primary} style={styles.loading} />
        ) : null}

        {isLoaded && !summary && !league ? (
          <Button icon="refresh" loading={isRefreshing} onPress={refresh} title="Tentar de novo" variant="outline" />
        ) : null}

        {summary ? (
          <>
            <LevelCard summary={summary} />
            <WeekCard summary={summary} />
            <GoalCard goal={summary.goal} onChoose={chooseGoal} routineDays={routineDays} rules={summary.rules} />
            {/* A API de antes da sequência não manda o campo: sem ele, o cartão só não aparece. */}
            {summary.streak ? <StreakCard streak={summary.streak} /> : null}
          </>
        ) : null}

        {league ? (
          <>
            {league.participate && league.lastResult ? <ResultBanner result={league.lastResult} /> : null}
            <LeagueCard
              busy={pendingParticipation !== null}
              error={participationError?.from === 'league' ? participationError.message : null}
              league={league}
              onRejoin={() => void applyParticipation(true, 'league')}
            />
          </>
        ) : null}

        {isLoaded ? (
          <View style={styles.links}>
            {links.map((link) => (
              <Pressable
                accessibilityLabel={`Abrir ${link.title}. ${link.description}`}
                accessibilityRole="button"
                key={link.title}
                onPress={() => router.push(link.href)}
                style={({ pressed }) => [styles.link, pressed ? styles.pressed : null]}>
                <View style={[styles.linkIcon, { backgroundColor: withAlpha(theme.domain.conquista, 0.16) }]}>
                  <MaterialCommunityIcons color={theme.domain.conquista} name={link.icon} size={24} />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.linkTitle}>{link.title}</Text>
                  <Text style={styles.linkDescription}>{link.description}</Text>
                </View>
                <MaterialCommunityIcons color={theme.text.muted} name="chevron-right" size={22} />
              </Pressable>
            ))}
          </View>
        ) : null}

        {summary ? <XpRulesCard rules={summary.rules} /> : null}

        {league ? (
          <View style={styles.card}>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Participar das ligas</Text>
              <Switch
                accessibilityLabel="Participar das ligas"
                disabled={pendingParticipation !== null}
                ios_backgroundColor={theme.bg.high}
                onValueChange={handleParticipationSwitch}
                thumbColor={(pendingParticipation ?? league.participate) ? theme.accent.primary : theme.text.muted}
                trackColor={{ false: theme.bg.high, true: withAlpha(theme.accent.primary, 0.45) }}
                value={pendingParticipation ?? league.participate}
              />
            </View>
            <Text style={styles.secondary}>
              Na liga, o seu grupo vê o seu primeiro nome, a inicial do sobrenome e o XP da semana.
            </Text>
            {participationError?.from === 'switch' ? (
              <Text accessibilityLiveRegion="polite" style={styles.error}>
                {participationError.message}
              </Text>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function LevelCard({ summary }: { summary: XpSummary }) {
  const styles = useStyles();
  const { theme } = useTheme();
  const span = summary.nextLevelXp - summary.levelFloorXp;
  const progress = span > 0 ? Math.min(1, Math.max(0, (summary.totalXp - summary.levelFloorXp) / span)) : 1;
  const percent = Math.round(progress * 100);
  const remaining = Math.max(0, summary.nextLevelXp - summary.totalXp);
  const boostUntil = summary.boostUntil ? Date.parse(summary.boostUntil) : Number.NaN;
  const hasBoost = Number.isFinite(boostUntil) && boostUntil > Date.now();

  return (
    <View style={styles.card}>
      <View style={styles.levelRow}>
        <View style={[styles.levelBadge, { backgroundColor: withAlpha(theme.domain.conquista, 0.18) }]}>
          <MaterialCommunityIcons color={theme.domain.conquista} name="star-four-points" size={26} />
        </View>
        <View style={styles.flex}>
          <Text accessibilityRole="header" style={styles.levelTitle}>
            Nível {summary.level}
          </Text>
          <Text style={styles.secondary}>{formatXp(summary.totalXp)} no total</Text>
        </View>
      </View>

      <View
        accessibilityLabel={`Progresso até o nível ${summary.level + 1}`}
        accessibilityRole="progressbar"
        accessibilityValue={{ max: 100, min: 0, now: percent }}
        style={styles.track}>
        {/* Um fio visível logo no começo do nível: 5 XP de 500 não pode parecer zero. */}
        <View
          style={[
            styles.fill,
            { backgroundColor: theme.domain.conquista, width: `${progress > 0 ? Math.max(percent, 3) : 0}%` },
          ]}
        />
      </View>
      <Text style={styles.caption}>
        {remaining > 0
          ? `Faltam ${formatXp(remaining)} para o nível ${summary.level + 1}`
          : `Nível ${summary.level + 1} a caminho: puxe a tela para atualizar.`}
      </Text>

      {hasBoost ? (
        <View style={[styles.highlight, { backgroundColor: withAlpha(theme.accent.primary, 0.12) }]}>
          <MaterialCommunityIcons color={theme.accent.primary} name="lightning-bolt" size={20} />
          <Text style={styles.highlightText}>
            XP em dobro até {dayMonth(boostUntil)}, pelo convite de um desafio.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function WeekCard({ summary }: { summary: XpSummary }) {
  const styles = useStyles();
  const { week } = summary;
  const parts = breakdownParts.filter((part) => week.breakdown[part.key] > 0);
  const daysLeft = daysLeftLabel(week.endsAt);

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text accessibilityRole="header" style={styles.cardTitle}>
          {weekLabel(week.startsAt, week.endsAt)}
        </Text>
        {daysLeft ? (
          <View style={styles.pill}>
            <Text style={styles.pillText}>{daysLeft}</Text>
          </View>
        ) : null}
      </View>

      <View accessibilityLabel={`${formatXp(week.xp)} nesta semana`} accessible style={styles.weekXp}>
        <Text style={styles.bigValue}>{formatXp(week.xp)}</Text>
        <Text style={styles.secondary}>nesta semana</Text>
      </View>

      {parts.length ? (
        <View style={styles.chips}>
          {parts.map((part) => (
            <View
              accessibilityLabel={`${part.label}: ${formatXp(week.breakdown[part.key])}`}
              accessible
              key={part.key}
              style={styles.chip}>
              <Text style={styles.chipLabel}>{part.label}</Text>
              <Text style={styles.chipValue}>+{formatXp(week.breakdown[part.key])}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <Text style={styles.secondary}>{trainingDaysText(week.trainingDays, week.verifiedDays)}</Text>
    </View>
  );
}

type GoalCardProps = {
  goal: WeeklyGoal;
  onChoose: (days: number) => Promise<void>;
  routineDays: number | null;
  rules: XpRules;
};

function GoalCard({ goal, onChoose, routineDays, rules }: GoalCardProps) {
  const styles = useStyles();
  const { theme } = useTheme();
  // A escolha em andamento: ela já aparece marcada enquanto o servidor responde.
  const [savingDays, setSavingDays] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Enquanto a pessoa não escolhe, nenhuma opção aparece marcada: a padrão não foi escolha dela.
  const chosen = goal.isDefault ? null : (goal.nextWeekDays ?? goal.days);
  const selected = savingDays ?? chosen;
  const options = range(rules.minGoalDays, rules.maxGoalDays);
  const routine =
    goal.isDefault && routineDays !== null && routineDays >= rules.minGoalDays && routineDays <= rules.maxGoalDays
      ? routineDays
      : null;

  async function choose(days: number) {
    if (savingDays !== null || days === chosen) {
      return;
    }

    setSavingDays(days);
    setError(null);

    try {
      await onChoose(days);
    } catch (reason) {
      setError(messageOf(reason, 'Não foi possível salvar a meta. Tente de novo.'));
    } finally {
      setSavingDays(null);
    }
  }

  return (
    <View style={styles.card}>
      <Text accessibilityRole="header" style={styles.cardTitle}>
        Meta da semana
      </Text>

      <View
        accessibilityLabel={`${goal.doneDays} de ${plural(goal.days, 'dia', 'dias')} com treino nesta semana`}
        accessible
        style={styles.goalProgress}>
        <View style={styles.dots}>
          {Array.from({ length: goal.days }, (_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index < goal.doneDays ? { backgroundColor: theme.domain.treino, borderColor: theme.domain.treino } : null,
              ]}
            />
          ))}
        </View>
        <Text style={styles.goalCount}>
          {goal.doneDays} de {plural(goal.days, 'dia', 'dias')}
        </Text>
      </View>

      {goal.reached ? (
        <View style={[styles.highlight, { backgroundColor: withAlpha(theme.status.success, 0.14) }]}>
          <MaterialCommunityIcons color={theme.status.success} name="check-circle" size={20} />
          <Text style={styles.highlightText}>Meta batida: +{formatXp(goal.bonusXp)}</Text>
        </View>
      ) : (
        <Text style={styles.secondary}>Com a meta batida, a semana rende +{formatXp(goal.bonusXp)}.</Text>
      )}

      <View style={styles.divider} />

      <Text style={styles.label}>{goal.isDefault ? 'Escolha a sua meta' : 'Dias com treino por semana'}</Text>
      {goal.isDefault ? (
        <Text style={styles.secondary}>
          Por enquanto vale a meta padrão, de {plural(goal.days, 'dia', 'dias')}. Quantos dias cabem na sua semana?
        </Text>
      ) : null}

      <View accessibilityLabel="Meta de dias com treino por semana" accessibilityRole="radiogroup" style={styles.options}>
        {options.map((days) => {
          const isSelected = days === selected;

          return (
            <Pressable
              accessibilityLabel={`${plural(days, 'dia', 'dias')} por semana`}
              accessibilityRole="radio"
              accessibilityState={{ busy: days === savingDays, checked: isSelected, disabled: savingDays !== null }}
              disabled={savingDays !== null}
              key={days}
              onPress={() => void choose(days)}
              style={({ pressed }) => [
                styles.option,
                isSelected ? styles.optionActive : null,
                pressed || (savingDays !== null && !isSelected) ? styles.pressed : null,
              ]}>
              <Text style={[styles.optionText, isSelected ? styles.optionTextActive : null]}>{days}</Text>
            </Pressable>
          );
        })}
      </View>

      {routine !== null ? (
        <Button
          disabled={savingDays !== null}
          icon="calendar-outline"
          loading={savingDays === routine}
          onPress={() => void choose(routine)}
          title={`Usar a sua rotina: ${plural(routine, 'dia', 'dias')}`}
          variant="outline"
        />
      ) : null}

      {goal.nextWeekDays !== null ? (
        <Text accessibilityLiveRegion="polite" style={styles.nextWeek}>
          Na próxima semana: {plural(goal.nextWeekDays, 'dia', 'dias')}
        </Text>
      ) : null}

      <Text style={styles.caption}>A primeira escolha vale já; depois, uma mudança vale a partir da próxima semana.</Text>

      {error ? (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

// "2026-09-08" → "8 set": a segunda-feira que abre a semana, lida direto da chave (sem fuso no meio).
function weekStartLabel(key: string) {
  const [, month, day] = key.split('-').map(Number);

  return `${day} ${MONTHS[month - 1] ?? ''}`.trim();
}

// Sequência de semanas com a meta batida e os escudos do mês. Sem culpa: a semana em aberto não quebra
// nada, e a que ficou a um dia da meta é segurada por um escudo.
function StreakCard({ streak }: { streak: Streak }) {
  const styles = useStyles();
  const { theme } = useTheme();
  const shields = Array.from({ length: streak.shieldsPerMonth }, (_, index) => index < streak.shieldsLeft);
  const protectedLabels = streak.protectedWeeks.map(weekStartLabel);
  const weeksText = streak.weeks === 1 ? 'semana seguida com a meta batida' : 'semanas seguidas com a meta batida';

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text accessibilityRole="header" style={styles.cardTitle}>
          Sequência
        </Text>
        <MaterialCommunityIcons color={theme.domain.conquista} name="fire" size={22} />
      </View>

      {streak.weeks > 0 ? (
        <View accessibilityLabel={`${streak.weeks} ${weeksText}`} accessible style={styles.weekXp}>
          <Text style={styles.bigValue}>{streak.weeks}</Text>
          <Text style={styles.secondary}>{weeksText}</Text>
        </View>
      ) : (
        // Sem sequência em andamento, a semana atual nunca bateu a meta ainda: ela é o começo.
        <Text style={styles.secondary}>
          A semana atual ainda está em aberto: {streak.bestWeeks > 0 ? 'uma sequência nova' : 'a sequência'} começa
          quando a meta for batida.
        </Text>
      )}

      {streak.bestWeeks > 0 ? (
        <Text style={styles.label}>Melhor sequência: {plural(streak.bestWeeks, 'semana', 'semanas')}</Text>
      ) : null}

      {streak.weeks === 0 ? null : streak.currentWeekReached ? (
        <View style={[styles.highlight, { backgroundColor: withAlpha(theme.status.success, 0.14) }]}>
          <MaterialCommunityIcons color={theme.status.success} name="check-circle" size={20} />
          <Text style={styles.highlightText}>A semana atual já bateu a meta e conta na sequência.</Text>
        </View>
      ) : (
        <Text style={styles.caption}>
          A semana atual ainda está em aberto: ela entra na sequência quando a meta for batida.
        </Text>
      )}

      <View style={styles.divider} />

      <View
        accessibilityLabel={`Escudos do mês: ${streak.shieldsLeft} de ${streak.shieldsPerMonth} ${
          streak.shieldsPerMonth === 1 ? 'disponível' : 'disponíveis'
        }.`}
        accessible
        style={styles.shieldRow}>
        <View style={styles.shields}>
          {shields.map((isLeft, index) => (
            <MaterialCommunityIcons
              color={isLeft ? theme.domain.conquista : theme.text.muted}
              key={index}
              name={isLeft ? 'shield' : 'shield-outline'}
              size={24}
            />
          ))}
        </View>
        <Text style={styles.label}>
          Escudos do mês: {streak.shieldsLeft} de {streak.shieldsPerMonth}
        </Text>
      </View>

      {protectedLabels.length ? (
        <Text style={styles.secondary}>
          {protectedLabels.length === 1
            ? `Um escudo segurou a semana de ${protectedLabels[0]}: a sequência continuou.`
            : `Os escudos seguraram as semanas de ${protectedLabels.join(' e ')}: a sequência continuou.`}
        </Text>
      ) : null}

      <Text style={styles.caption}>
        Uma semana que ficou a um dia da meta usa um escudo e não quebra a sequência. São {streak.shieldsPerMonth} por
        mês.
      </Text>
    </View>
  );
}

function ResultBanner({ result }: { result: LeagueResult }) {
  const styles = useStyles();
  const { theme } = useTheme();
  const text = resultText(result);

  // Quem desceu vê um aviso neutro, sem cor de alerta: a semana nova já começou.
  if (result.outcome === 'demoted') {
    return (
      <View accessibilityLabel={text} accessible style={[styles.banner, styles.bannerNeutral]}>
        <MaterialCommunityIcons color={theme.text.secondary} name="shield-outline" size={24} />
        <Text style={styles.bannerText}>{text}</Text>
      </View>
    );
  }

  const tone = result.outcome === 'promoted' ? theme.status.success : theme.accent.primary;

  return (
    <View
      accessibilityLabel={text}
      accessible
      style={[styles.banner, { backgroundColor: withAlpha(tone, 0.12), borderColor: withAlpha(tone, 0.35) }]}>
      <MaterialCommunityIcons
        color={tone}
        name={result.outcome === 'promoted' ? 'arrow-up-bold-circle-outline' : 'shield-check-outline'}
        size={24}
      />
      <Text style={styles.bannerText}>{text}</Text>
    </View>
  );
}

type LeagueCardProps = {
  busy: boolean;
  error: string | null;
  league: LeagueOverview;
  onRejoin: () => void;
};

function LeagueCard({ busy, error, league, onRejoin }: LeagueCardProps) {
  const styles = useStyles();
  const { theme } = useTheme();

  if (!league.participate) {
    return (
      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.cardTitle}>
          Ligas da semana
        </Text>
        <Text style={styles.secondary}>Você saiu das ligas.</Text>
        <Text style={styles.caption}>O seu XP continua valendo para o nível. Quando quiser, é só voltar.</Text>
        <Button icon="enter-outline" loading={busy} onPress={onRejoin} title="Voltar para as ligas" variant="outline" />
        {error ? (
          <Text accessibilityLiveRegion="polite" style={styles.error}>
            {error}
          </Text>
        ) : null}
      </View>
    );
  }

  const color = tierColors[league.tier][theme.scheme];
  const daysLeft = daysLeftLabel(league.week.endsAt);

  return (
    <View style={styles.card}>
      <View style={styles.tierRow}>
        <View style={[styles.tierBadge, { backgroundColor: withAlpha(color, 0.16), borderColor: withAlpha(color, 0.45) }]}>
          <MaterialCommunityIcons color={color} name="shield-star" size={30} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.overline}>Sua liga</Text>
          <Text accessibilityRole="header" style={styles.tierTitle}>
            Liga {tierLabels[league.tier]}
          </Text>
        </View>
        {/* As quatro ligas em ordem, com as já alcançadas preenchidas. O nome já diz tudo ao leitor de tela. */}
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.ladder}>
          {TIERS.map((item) => {
            const reached = tierIndex(item) <= tierIndex(league.tier);

            return (
              <MaterialCommunityIcons
                color={reached ? tierColors[item][theme.scheme] : withAlpha(theme.text.muted, 0.5)}
                key={item}
                name={reached ? 'shield' : 'shield-outline'}
                size={14}
              />
            );
          })}
        </View>
      </View>

      {league.group ? (
        <>
          <Text style={styles.caption}>
            {plural(league.group.memberCount, 'pessoa', 'pessoas')} no seu grupo{daysLeft ? ` · ${daysLeft}` : ''}
          </Text>
          <View style={styles.board}>
            {league.group.standings.map((row) => (
              <StandingRow key={row.userId} row={row} />
            ))}
          </View>
        </>
      ) : (
        <View style={styles.empty}>
          <MaterialCommunityIcons color={theme.text.muted} name="account-group-outline" size={30} />
          <Text style={styles.emptyText}>Você entra no grupo desta semana com o primeiro treino concluído.</Text>
          <Button icon="barbell-outline" onPress={() => router.push('/(app)/treino')} title="Começar um treino" />
        </View>
      )}

      <Text style={styles.caption}>{leagueLegend(league.rules, league.tier)}</Text>
    </View>
  );
}

function StandingRow({ row }: { row: LeagueStanding }) {
  const styles = useStyles();
  const { theme } = useTheme();
  const zone =
    row.zone === 'promotion'
      ? { color: theme.status.success, icon: 'arrow-up' as const, label: 'sobe', spoken: 'zona de subida' }
      : row.zone === 'demotion'
        ? { color: theme.status.warning, icon: 'arrow-down' as const, label: 'desce', spoken: 'zona de descida' }
        : null;

  return (
    <View
      accessibilityLabel={`${row.rank}º lugar: ${row.isMe ? `você, ${row.name}` : row.name}, ${formatXp(row.xp)}${
        zone ? `, ${zone.spoken}` : ''
      }.`}
      accessible
      style={[
        styles.row,
        zone ? { borderLeftColor: zone.color } : null,
        row.isMe ? { backgroundColor: withAlpha(theme.accent.primary, 0.12) } : null,
      ]}>
      <Text style={styles.rank}>{row.rank}º</Text>
      <Text numberOfLines={1} style={[styles.name, row.isMe ? styles.nameMe : null]}>
        {row.isMe ? `${row.name} (você)` : row.name}
      </Text>
      {zone ? (
        <View style={[styles.zonePill, { backgroundColor: withAlpha(zone.color, 0.16) }]}>
          <MaterialCommunityIcons color={zone.color} name={zone.icon} size={12} />
          <Text style={[styles.zoneText, { color: zone.color }]}>{zone.label}</Text>
        </View>
      ) : null}
      <Text style={styles.xp}>{formatXp(row.xp)}</Text>
    </View>
  );
}

function XpRulesCard({ rules }: { rules: XpRules }) {
  const styles = useStyles();
  const { theme } = useTheme();
  const items: { detail: string; icon: IconName; title: string }[] = [
    {
      detail: `+${formatXp(rules.workoutXp)} (até ${rules.maxWorkoutsPerDay} por dia)`,
      icon: 'dumbbell',
      title: 'Treino concluído',
    },
    {
      detail: `+${formatXp(rules.setXp)} (até ${rules.maxSetsPerDay} por dia)`,
      icon: 'format-list-checks',
      title: 'Série feita',
    },
    { detail: `+${formatXp(rules.checkinXp)}`, icon: 'map-marker-check-outline', title: 'Check-in verificado na academia' },
    { detail: `+${formatXp(rules.goalXpPerDay)} por dia da meta`, icon: 'target', title: 'Meta da semana batida' },
    {
      detail: `Quem traz alguém por um desafio e quem entra ganham XP em dobro por ${plural(rules.boostDays, 'dia', 'dias')}.`,
      icon: 'account-multiple-plus-outline',
      title: 'Convite',
    },
  ];

  return (
    <View style={styles.card}>
      <Text accessibilityRole="header" style={styles.cardTitle}>
        Como ganhar XP
      </Text>
      {items.map((item) => (
        <View accessibilityLabel={`${item.title}: ${item.detail}`} accessible key={item.title} style={styles.ruleRow}>
          <View style={styles.ruleIcon}>
            <MaterialCommunityIcons color={theme.accent.primary} name={item.icon} size={18} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.ruleTitle}>{item.title}</Text>
            <Text style={styles.ruleDetail}>{item.detail}</Text>
          </View>
        </View>
      ))}
      <Text style={styles.caption}>Carga levantada, medidas, fotos e o diário do dia não viram XP.</Text>
    </View>
  );
}

const useStyles = makeStyles((theme) => ({
  content: {
    alignSelf: 'center',
    gap: 14,
    maxWidth: 560,
    paddingBottom: 40,
    paddingHorizontal: 20,
    paddingTop: 12,
    width: '100%',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: theme.bg.surface,
    borderColor: theme.border.subtle,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  title: {
    ...typography.h1,
    color: theme.text.primary,
    flex: 1,
  },
  loading: {
    marginVertical: 32,
  },
  error: {
    color: theme.status.danger,
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    backgroundColor: theme.bg.surface,
    borderColor: theme.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  cardTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  cardTitle: {
    color: theme.text.primary,
    flex: 1,
    fontFamily: fonts.extrabold,
    fontSize: 16,
    lineHeight: 22,
  },
  flex: {
    flex: 1,
    gap: 2,
  },
  secondary: {
    color: theme.text.secondary,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  caption: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  highlight: {
    alignItems: 'center',
    borderRadius: radius.sm,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  highlightText: {
    color: theme.text.primary,
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: 14,
    lineHeight: 20,
  },
  levelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
  },
  levelBadge: {
    alignItems: 'center',
    borderRadius: radius.md,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  levelTitle: {
    ...typography.h2,
    color: theme.text.primary,
  },
  track: {
    backgroundColor: theme.bg.raised,
    borderRadius: radius.pill,
    height: 10,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: radius.pill,
    height: '100%',
  },
  pill: {
    backgroundColor: theme.accent.soft,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pillText: {
    color: theme.accent.primary,
    fontFamily: fonts.bold,
    fontSize: 12,
  },
  weekXp: {
    alignItems: 'baseline',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  bigValue: {
    color: theme.text.primary,
    fontFamily: fonts.extrabold,
    fontSize: 36,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.6,
    lineHeight: 42,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    alignItems: 'center',
    backgroundColor: theme.bg.raised,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipLabel: {
    color: theme.text.secondary,
    fontFamily: fonts.medium,
    fontSize: 13,
  },
  chipValue: {
    color: theme.text.primary,
    fontFamily: fonts.bold,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  goalProgress: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  dots: {
    flexDirection: 'row',
    flexShrink: 1,
    flexWrap: 'wrap',
    gap: 6,
  },
  dot: {
    borderColor: theme.border.strong,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    height: 18,
    width: 18,
  },
  goalCount: {
    color: theme.text.primary,
    fontFamily: fonts.bold,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
  },
  divider: {
    backgroundColor: theme.border.subtle,
    height: 1,
  },
  label: {
    color: theme.text.primary,
    fontFamily: fonts.bold,
    fontSize: 14,
  },
  options: {
    flexDirection: 'row',
    gap: 8,
  },
  option: {
    alignItems: 'center',
    backgroundColor: theme.bg.raised,
    borderColor: theme.border.subtle,
    borderRadius: radius.sm,
    borderWidth: 1,
    flex: 1,
    height: 44,
    justifyContent: 'center',
  },
  optionActive: {
    backgroundColor: theme.accent.primary,
    borderColor: theme.accent.primary,
  },
  optionText: {
    color: theme.text.primary,
    fontFamily: fonts.bold,
    fontSize: 16,
    fontVariant: ['tabular-nums'],
  },
  optionTextActive: {
    color: theme.accent.onPrimary,
  },
  nextWeek: {
    color: theme.text.primary,
    fontFamily: fonts.semibold,
    fontSize: 14,
  },
  banner: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  bannerNeutral: {
    backgroundColor: theme.bg.raised,
    borderColor: theme.border.subtle,
  },
  bannerText: {
    color: theme.text.primary,
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: 14,
    lineHeight: 20,
  },
  tierRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
  },
  tierBadge: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  overline: {
    ...typography.overline,
    color: theme.text.muted,
  },
  tierTitle: {
    ...typography.h2,
    color: theme.text.primary,
  },
  ladder: {
    flexDirection: 'row',
    gap: 3,
  },
  board: {
    borderColor: theme.border.subtle,
    borderRadius: radius.sm,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    alignItems: 'center',
    borderBottomColor: theme.border.subtle,
    borderBottomWidth: 1,
    borderLeftColor: 'transparent',
    borderLeftWidth: 3,
    flexDirection: 'row',
    gap: 10,
    minHeight: 48,
    paddingLeft: 10,
    paddingRight: 12,
    paddingVertical: 8,
  },
  rank: {
    color: theme.text.secondary,
    fontFamily: fonts.bold,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
    minWidth: 28,
  },
  name: {
    color: theme.text.primary,
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: 15,
  },
  nameMe: {
    fontFamily: fonts.extrabold,
  },
  zonePill: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  zoneText: {
    fontFamily: fonts.bold,
    fontSize: 12,
  },
  xp: {
    color: theme.text.primary,
    fontFamily: fonts.extrabold,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  empty: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  emptyText: {
    color: theme.text.secondary,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  links: {
    gap: 10,
  },
  link: {
    alignItems: 'center',
    backgroundColor: theme.bg.surface,
    borderColor: theme.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    padding: 14,
  },
  linkIcon: {
    alignItems: 'center',
    borderRadius: radius.sm,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  linkTitle: {
    color: theme.text.primary,
    fontFamily: fonts.extrabold,
    fontSize: 15,
  },
  linkDescription: {
    color: theme.text.secondary,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  ruleRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
  },
  ruleIcon: {
    alignItems: 'center',
    backgroundColor: theme.accent.soft,
    borderRadius: radius.sm,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  ruleTitle: {
    color: theme.text.primary,
    fontFamily: fonts.semibold,
    fontSize: 14,
  },
  ruleDetail: {
    color: theme.text.secondary,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  shieldRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  shields: {
    flexDirection: 'row',
    gap: 4,
  },
  switchRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  switchLabel: {
    color: theme.text.primary,
    flex: 1,
    fontFamily: fonts.bold,
    fontSize: 15,
  },
  pressed: {
    opacity: 0.75,
  },
}));
