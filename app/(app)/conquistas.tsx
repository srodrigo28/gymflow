import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { Screen } from '@/src/components/ui/Screen';
import { useSession } from '@/src/contexts/session-context';
import { listAchievements } from '@/src/services/achievements';
import { ApiError } from '@/src/services/api';
import { listAwards } from '@/src/services/league';
import { fonts, makeStyles, radius, typography, useTheme, withAlpha } from '@/src/theme';
import type { Achievement } from '@/src/types/achievements';
import type { Award } from '@/src/types/league';
import { formatShortDate } from '@/src/utils/format';

type AwardIconName = keyof typeof MaterialCommunityIcons.glyphMap;

// Troféus e selos da conta: ainda buscando, a lista, ou o aviso de por que ela não veio.
type AwardsState = { status: 'loading' } | { awards: Award[]; status: 'ready' } | { message: string; status: 'error' };

const MONTH_NAMES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

/** O ícone vem do servidor: nome que esta versão do app não conhece vira a taça, e não um quadrado vazio. */
function awardIcon(name: string): AwardIconName {
  return Object.prototype.hasOwnProperty.call(MaterialCommunityIcons.glyphMap, name)
    ? (name as AwardIconName)
    : 'trophy-outline';
}

/** `2026-09` → "setembro de 2026"; `2026-09-21` (a segunda-feira da semana) → "semana de 21/09". */
function periodLabel(periodKey: string | null) {
  if (!periodKey) {
    return null;
  }

  const week = /^(\d{4})-(\d{2})-(\d{2})$/.exec(periodKey);

  if (week) {
    return `semana de ${week[3]}/${week[2]}`;
  }

  const month = /^(\d{4})-(\d{2})$/.exec(periodKey);
  const name = month ? MONTH_NAMES[Number(month[2]) - 1] : undefined;

  return month && name ? `${name} de ${month[1]}` : null;
}

function awardsErrorMessage(reason: unknown) {
  // Status 0: o pedido nem chegou ao servidor.
  if (reason instanceof ApiError && reason.status !== 0) {
    return 'Os troféus da conta não carregaram agora. Tente de novo mais tarde.';
  }

  return 'Sem conexão: os troféus da conta aparecem quando houver internet.';
}

function shareTrophy(award: Award) {
  const period = periodLabel(award.periodKey);

  router.push({
    params: {
      trofeuDescricao: award.description,
      trofeuTitulo: award.title,
      ...(period ? { trofeuPeriodo: period } : {}),
    },
    pathname: '/(app)/compartilhar',
  });
}

export default function ConquistasScreen() {
  const styles = useStyles();
  const { theme } = useTheme();
  const { session } = useSession();
  const [achievements, setAchievements] = useState<Achievement[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [awards, setAwards] = useState<AwardsState>({ status: 'loading' });
  const token = session?.token;

  const load = useCallback(async () => {
    try {
      setAchievements(await listAchievements());
      setError(null);
    } catch {
      setError('Não foi possível ler seus treinos agora. Tente de novo em instantes.');
    }
  }, []);

  const loadAwards = useCallback(async () => {
    if (!token) {
      return;
    }

    try {
      const list = await listAwards(token);
      // Do mais novo para o mais antigo.
      const sorted = (Array.isArray(list) ? [...list] : []).sort(
        (a, b) => (Date.parse(b.awardedAt) || 0) - (Date.parse(a.awardedAt) || 0),
      );

      setAwards({ awards: sorted, status: 'ready' });
    } catch (reason) {
      // Falhar ao voltar para a tela não apaga a lista que já estava aparecendo.
      setAwards((current) =>
        current.status === 'ready' ? current : { message: awardsErrorMessage(reason), status: 'error' },
      );
    }
  }, [token]);

  // Recalcula ao voltar para a tela: o treino que acabou de ser concluído já conta.
  useFocusEffect(
    useCallback(() => {
      void load();
      void loadAwards();
    }, [load, loadAwards]),
  );

  const items = achievements ?? [];
  // Desbloqueadas da mais recente para a mais antiga; bloqueadas com as mais próximas primeiro.
  const unlocked = items
    .filter((item) => item.unlockedAt !== null)
    .sort((a, b) => (b.unlockedAt ?? 0) - (a.unlockedAt ?? 0));
  const locked = items.filter((item) => item.unlockedAt === null).sort((a, b) => b.progress - a.progress);
  const percent = items.length ? Math.round((unlocked.length / items.length) * 100) : 0;

  return (
    <Screen edges={['top', 'right', 'left']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
            Conquistas
          </Text>
        </View>

        {token ? (
          <>
            <Text accessibilityRole="header" style={styles.sectionTitle}>
              Troféus e selos da conta
            </Text>

            {awards.status === 'loading' ? <Text style={styles.note}>Buscando na sua conta…</Text> : null}

            {awards.status === 'error' ? <Text style={styles.note}>{awards.message}</Text> : null}

            {awards.status === 'ready' && awards.awards.length === 0 ? (
              <View style={styles.card}>
                <View style={styles.cardRow}>
                  <View style={[styles.badge, { backgroundColor: withAlpha(theme.domain.conquista, 0.18) }]}>
                    <MaterialCommunityIcons color={theme.domain.conquista} name="trophy-outline" size={24} />
                  </View>
                  <Text style={styles.awardsEmptyText}>Troféus saem das ligas e da temporada entre amigos.</Text>
                </View>
                <Button
                  icon="trophy-outline"
                  onPress={() => router.push('/(app)/liga')}
                  title="Ver a liga"
                  variant="outline"
                />
              </View>
            ) : null}

            {awards.status === 'ready'
              ? awards.awards.map((award) => <AwardCard award={award} key={award.id} />)
              : null}
          </>
        ) : null}

        <View
          accessibilityLabel={
            achievements ? `${unlocked.length} de ${items.length} conquistas desbloqueadas` : 'Carregando conquistas'
          }
          accessible
          style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={[styles.badge, { backgroundColor: withAlpha(theme.domain.conquista, 0.18) }]}>
              <MaterialCommunityIcons color={theme.domain.conquista} name="trophy-outline" size={26} />
            </View>
            <View style={styles.summaryText}>
              <Text style={styles.summaryValue}>{achievements ? `${unlocked.length} de ${items.length}` : '—'}</Text>
              <Text style={styles.summaryLabel}>conquistas desbloqueadas</Text>
            </View>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { backgroundColor: theme.domain.conquista, width: `${percent}%` }]} />
          </View>
          <Text style={styles.summaryCaption}>
            Calculadas a partir dos treinos, pesagens e fotos registrados neste aparelho.
          </Text>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {achievements ? (
          <>
            {unlocked.length ? (
              <>
                <Text style={styles.sectionTitle}>Desbloqueadas</Text>
                {unlocked.map((achievement) => (
                  <AchievementCard achievement={achievement} key={achievement.id} />
                ))}
              </>
            ) : (
              <View style={styles.emptyCard}>
                <MaterialCommunityIcons color={theme.text.muted} name="trophy-outline" size={32} />
                <Text style={styles.emptyTitle}>Nenhuma conquista ainda</Text>
                <Text style={styles.emptyText}>
                  O primeiro treino concluído já desbloqueia a primeira. Elas aparecem aqui sozinhas, a partir do
                  que você registra.
                </Text>
                <Button
                  icon="barbell-outline"
                  onPress={() => router.push('/(app)/treino')}
                  title="Começar um treino"
                  variant="outline"
                />
              </View>
            )}

            {locked.length ? (
              <>
                <Text style={styles.sectionTitle}>Para desbloquear</Text>
                {locked.map((achievement) => (
                  <AchievementCard achievement={achievement} key={achievement.id} />
                ))}
              </>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function AwardCard({ award }: { award: Award }) {
  const styles = useStyles();
  const { theme } = useTheme();
  const kindLabel = award.kind === 'trophy' ? 'Troféu' : 'Selo';
  const awardedAt = Date.parse(award.awardedAt);
  const date = Number.isNaN(awardedAt) ? null : formatShortDate(awardedAt);

  return (
    <View style={[styles.card, { borderColor: withAlpha(theme.domain.conquista, 0.4) }]}>
      {/* O leitor de tela ouve o cartão de uma vez; o compartilhar fica de fora, para dar para tocar nele. */}
      <View
        accessibilityLabel={`${kindLabel}: ${award.title}${date ? `, ganho em ${date}` : ''}. ${award.description}`}
        accessible
        style={styles.cardRow}>
        <View style={[styles.badge, { backgroundColor: withAlpha(theme.domain.conquista, 0.18) }]}>
          <MaterialCommunityIcons color={theme.domain.conquista} name={awardIcon(award.icon)} size={24} />
        </View>
        <View style={styles.cardText}>
          <Text style={styles.awardKind}>{kindLabel}</Text>
          <Text style={styles.cardTitle}>{award.title}</Text>
          <Text style={styles.cardDescription}>{award.description}</Text>
        </View>
        {date ? (
          <View style={[styles.datePill, { backgroundColor: withAlpha(theme.domain.conquista, 0.18) }]}>
            <Text style={[styles.dateText, { color: theme.domain.conquista }]}>{date}</Text>
          </View>
        ) : null}
      </View>

      {award.kind === 'trophy' ? (
        <Pressable
          accessibilityLabel={`Compartilhar o troféu ${award.title}`}
          accessibilityRole="button"
          hitSlop={4}
          onPress={() => shareTrophy(award)}
          style={({ pressed }) => [styles.shareButton, pressed ? styles.pressed : null]}>
          <Ionicons color={theme.accent.primary} name="share-social-outline" size={16} />
          <Text style={styles.shareText}>Compartilhar</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function AchievementCard({ achievement }: { achievement: Achievement }) {
  const styles = useStyles();
  const { theme } = useTheme();
  const { description, icon, progress, progressLabel, title, unlockedAt } = achievement;
  const percent = Math.round(progress * 100);
  // O leitor de tela ouve o cartão inteiro de uma vez: nome, situação, descrição e progresso.
  const label =
    unlockedAt !== null
      ? `${title}, desbloqueada em ${formatShortDate(unlockedAt)}. ${description}`
      : `${title}, bloqueada. ${description}${progressLabel ? ` Progresso: ${progressLabel}.` : ''}`;

  return (
    <View
      accessibilityLabel={label}
      accessible
      style={[styles.card, unlockedAt !== null ? { borderColor: withAlpha(theme.domain.conquista, 0.4) } : null]}>
      <View style={styles.cardRow}>
        <View
          style={[
            styles.badge,
            unlockedAt !== null ? { backgroundColor: withAlpha(theme.domain.conquista, 0.18) } : null,
          ]}>
          <MaterialCommunityIcons
            color={unlockedAt !== null ? theme.domain.conquista : theme.text.muted}
            name={icon}
            size={24}
          />
        </View>
        <View style={styles.cardText}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardDescription}>{description}</Text>
        </View>
        {unlockedAt !== null ? (
          <View style={[styles.datePill, { backgroundColor: withAlpha(theme.domain.conquista, 0.18) }]}>
            <Text style={[styles.dateText, { color: theme.domain.conquista }]}>{formatShortDate(unlockedAt)}</Text>
          </View>
        ) : null}
      </View>

      {unlockedAt === null ? (
        <View style={styles.progressRow}>
          <View
            accessibilityRole="progressbar"
            accessibilityValue={{ max: 100, min: 0, now: percent }}
            style={styles.track}>
            {/* Um fio visível mesmo com pouco progresso: 1 de 50 treinos não pode parecer zero. */}
            <View
              style={[
                styles.fill,
                {
                  backgroundColor: withAlpha(theme.domain.conquista, 0.85),
                  width: `${progress > 0 ? Math.max(percent, 3) : 0}%`,
                },
              ]}
            />
          </View>
          {progressLabel ? <Text style={styles.progressLabel}>{progressLabel}</Text> : null}
        </View>
      ) : null}
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
  summaryCard: {
    backgroundColor: theme.bg.surface,
    borderColor: theme.border.subtle,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  summaryRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
  },
  summaryText: {
    flex: 1,
    gap: 2,
  },
  summaryValue: {
    color: theme.text.primary,
    fontFamily: fonts.extrabold,
    fontSize: 28,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.4,
  },
  summaryLabel: {
    color: theme.text.secondary,
    fontFamily: fonts.regular,
    fontSize: 14,
  },
  summaryCaption: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 17,
  },
  badge: {
    alignItems: 'center',
    backgroundColor: theme.bg.raised,
    borderRadius: radius.md,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  error: {
    color: theme.status.danger,
    fontFamily: fonts.medium,
    fontSize: 14,
  },
  sectionTitle: {
    color: theme.text.primary,
    fontFamily: fonts.extrabold,
    fontSize: 16,
    marginTop: 4,
  },
  card: {
    backgroundColor: theme.bg.surface,
    borderColor: theme.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
  cardRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  cardText: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    color: theme.text.primary,
    fontFamily: fonts.bold,
    fontSize: 16,
  },
  cardDescription: {
    color: theme.text.secondary,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  datePill: {
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  dateText: {
    fontFamily: fonts.bold,
    fontSize: 12,
  },
  progressRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  track: {
    backgroundColor: theme.bg.raised,
    borderRadius: radius.pill,
    flex: 1,
    height: 8,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: radius.pill,
    height: '100%',
  },
  progressLabel: {
    ...typography.caption,
    color: theme.text.muted,
    fontVariant: ['tabular-nums'],
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: theme.bg.surface,
    borderColor: theme.border.subtle,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: 10,
    padding: 20,
  },
  emptyTitle: {
    color: theme.text.primary,
    fontFamily: fonts.extrabold,
    fontSize: 18,
    textAlign: 'center',
  },
  emptyText: {
    color: theme.text.secondary,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 6,
    textAlign: 'center',
  },
  note: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  awardsEmptyText: {
    color: theme.text.secondary,
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  awardKind: {
    ...typography.overline,
    color: theme.domain.conquista,
    marginBottom: 2,
  },
  // Alinhado com o texto do cartão: 48 do ícone + 12 de espaço.
  shareButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderColor: theme.accent.primary,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    marginLeft: 60,
    minHeight: 40,
    paddingHorizontal: 14,
  },
  shareText: {
    color: theme.accent.primary,
    fontFamily: fonts.bold,
    fontSize: 14,
  },
  pressed: {
    opacity: 0.75,
  },
}));
