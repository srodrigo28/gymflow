import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Linking, Platform, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { Screen } from '@/src/components/ui/Screen';
import { useSession } from '@/src/contexts/session-context';
import { getAdminMetrics, type AdminMetrics } from '@/src/services/admin';
import { listAdminGyms, setGymConfirmation } from '@/src/services/league';
import { fonts, makeStyles, radius, typography, useTheme, withAlpha } from '@/src/theme';
import type { AdminGym } from '@/src/types/league';

const UNDO_TITLE = 'Desfazer a confirmação?';

const confirmationLabels = {
  admin: 'Confirmada pela equipe',
  members: 'Confirmada por duas contas',
} as const;

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

// Desfazer tira o verificado dos check-ins de todo mundo naquela academia: pede confirmação antes. No
// navegador o Alert do React Native não aparece; lá vale a confirmação do próprio navegador.
function confirmUndo(gym: AdminGym, onConfirm: () => void) {
  const message = `Os check-ins em “${gym.name}” deixam de valer como verificados.`;

  if (Platform.OS === 'web') {
    if (window.confirm(`${UNDO_TITLE}\n\n${message}`)) {
      onConfirm();
    }

    return;
  }

  Alert.alert(UNDO_TITLE, message, [
    { style: 'cancel', text: 'Manter' },
    { onPress: onConfirm, style: 'destructive', text: 'Desfazer' },
  ]);
}

// Para conferir se o ponto marcado é mesmo uma academia antes de confirmar.
function openOnMap(gym: AdminGym) {
  const url = `https://www.google.com/maps/search/?api=1&query=${gym.latitude},${gym.longitude}`;

  void Linking.openURL(url).catch(() => undefined);
}

// Só para administradores: o número que decide quando o app deixa de ser 100% grátis e as academias
// que a equipe confirma para o check-in verificado.
export default function AdminScreen() {
  const styles = useStyles();
  const { theme } = useTheme();
  const { session } = useSession();
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [gyms, setGyms] = useState<AdminGym[] | null>(null);
  const [gymsError, setGymsError] = useState<string | null>(null);
  // Academia com a confirmação mudando agora: trava só o botão dela.
  const [busyGymId, setBusyGymId] = useState<string | null>(null);
  const [gymActionError, setGymActionError] = useState<string | null>(null);
  const token = session?.token;

  // Números e academias carregam juntos, mas um erro num não esconde o outro.
  const load = useCallback(async () => {
    if (!token) {
      return;
    }

    await Promise.all([
      (async () => {
        try {
          setMetrics(await getAdminMetrics(token));
          setError(null);
        } catch (reason) {
          setError(reason instanceof Error ? reason.message : 'Não foi possível carregar o painel.');
        }
      })(),
      (async () => {
        try {
          setGyms(await listAdminGyms(token));
          setGymsError(null);
        } catch (reason) {
          setGymsError(reason instanceof Error ? reason.message : 'Não foi possível carregar as academias.');
        }
      })(),
    ]);
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function refresh() {
    setIsRefreshing(true);
    await load();
    setIsRefreshing(false);
  }

  async function changeConfirmation(gym: AdminGym) {
    if (!token) {
      return;
    }

    setBusyGymId(gym.id);
    setGymActionError(null);

    try {
      const updated = await setGymConfirmation(token, gym.id, !gym.confirmed);
      setGyms((current) => current?.map((item) => (item.id === gym.id ? updated : item)) ?? current);
    } catch (reason) {
      setGymActionError(reason instanceof Error ? reason.message : 'Não foi possível mudar a confirmação.');
    } finally {
      setBusyGymId(null);
    }
  }

  function handleGymAction(gym: AdminGym) {
    if (gym.confirmed) {
      confirmUndo(gym, () => void changeConfirmation(gym));
    } else {
      void changeConfirmation(gym);
    }
  }

  const total = metrics?.users.total ?? 0;
  const goal = metrics?.freeUntilUsers ?? 200;
  const progress = Math.min(1, total / goal);

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
            Painel
          </Text>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {metrics ? (
          <>
            <View
              accessibilityLabel={`${total} de ${goal} cadastros.`}
              accessible
              style={styles.goalCard}>
              <Text style={styles.goalLabel}>Cadastros</Text>
              <View style={styles.goalRow}>
                <Text style={styles.goalValue}>{total}</Text>
                <Text style={styles.goalTotal}>de {goal}</Text>
              </View>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${progress * 100}%` }]} />
              </View>
              <Text style={styles.goalNote}>
                {total >= goal
                  ? `Meta dos ${goal} atingida. Hora de decidir as campanhas de valor simbólico (22-campanhas.md).`
                  : `Até ${goal} cadastros o app segue 100% grátis. Faltam ${goal - total}.`}
              </Text>
            </View>

            <View style={styles.grid}>
              <Metric label="novos na semana" value={metrics.users.newThisWeek} />
              <Metric label="ativos na semana" value={metrics.users.activeThisWeek} />
              <Metric label="treinos na semana" value={metrics.workouts.finishedThisWeek} />
            </View>

            <Text style={styles.footnote}>
              Ativo é quem abriu o app nos últimos 7 dias. Atualizado às{' '}
              {new Date(metrics.generatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })};
              puxe a tela para atualizar.
            </Text>
          </>
        ) : null}

        {gyms || gymsError ? (
          <>
            <Text accessibilityRole="header" style={styles.sectionTitle}>
              Academias
            </Text>
            <Text style={styles.sectionNote}>
              Check-in só vale como verificado em academia confirmada. Confirme só academias de verdade; desfazer tira o
              verificado dos check-ins dela.
            </Text>

            {gymsError ? <Text style={styles.error}>{gymsError}</Text> : null}
            {gymActionError ? <Text style={styles.error}>{gymActionError}</Text> : null}

            {gyms?.length === 0 ? <Text style={styles.empty}>Nenhuma academia marcada ainda.</Text> : null}

            {gyms?.map((gym) => (
              <GymCard
                busy={busyGymId === gym.id}
                gym={gym}
                key={gym.id}
                locked={busyGymId !== null}
                onAction={() => handleGymAction(gym)}
              />
            ))}
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

type GymCardProps = {
  busy: boolean;
  gym: AdminGym;
  // Outra academia mudando agora: uma confirmação de cada vez.
  locked: boolean;
  onAction: () => void;
};

function GymCard({ busy, gym, locked, onAction }: GymCardProps) {
  const styles = useStyles();
  const { theme } = useTheme();
  const status = gym.confirmedBy ? confirmationLabels[gym.confirmedBy] : 'Não confirmada';
  const people = plural(gym.memberCount, 'pessoa', 'pessoas');
  const counts = `${people} · ${plural(gym.checkinCount, 'check-in', 'check-ins')}`;

  return (
    <View style={styles.gymCard}>
      <View accessibilityLabel={`${gym.name}. ${counts}. ${status}.`} accessible style={styles.gymInfo}>
        <Text numberOfLines={2} style={styles.gymName}>
          {gym.name}
        </Text>
        <Text style={styles.gymMeta}>{counts}</Text>
        <View
          style={[
            styles.chip,
            gym.confirmedBy ? { backgroundColor: withAlpha(theme.status.success, 0.14) } : styles.chipIdle,
          ]}>
          <Ionicons
            color={gym.confirmedBy ? theme.status.success : theme.text.muted}
            name={gym.confirmedBy ? 'shield-checkmark' : 'shield-outline'}
            size={14}
          />
          <Text style={styles.chipText}>{status}</Text>
        </View>
      </View>

      <Pressable
        accessibilityLabel={`Ver ${gym.name} no mapa`}
        accessibilityRole="link"
        hitSlop={4}
        onPress={() => openOnMap(gym)}
        style={({ pressed }) => [styles.mapLink, pressed ? styles.pressed : null]}>
        <Ionicons color={theme.accent.primary} name="map-outline" size={16} />
        <Text style={styles.mapLinkText}>Ver no mapa</Text>
      </Pressable>

      <Button
        accessibilityLabel={gym.confirmed ? `Desfazer a confirmação de ${gym.name}` : `Confirmar ${gym.name}`}
        disabled={locked}
        icon={gym.confirmed ? 'close-circle-outline' : 'shield-checkmark-outline'}
        loading={busy}
        onPress={onAction}
        title={gym.confirmed ? 'Desfazer confirmação' : 'Confirmar'}
        variant={gym.confirmed ? 'ghost' : 'outline'}
      />
    </View>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  const styles = useStyles();

  return (
    <View accessibilityLabel={`${value} ${label}`} accessible style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
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
  error: {
    color: theme.status.danger,
    fontFamily: fonts.medium,
    fontSize: 14,
  },
  goalCard: {
    backgroundColor: theme.bg.surface,
    borderColor: theme.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 10,
    padding: 20,
  },
  goalLabel: {
    color: theme.text.secondary,
    fontFamily: fonts.semibold,
    fontSize: 14,
  },
  goalRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: 8,
  },
  goalValue: {
    color: theme.text.primary,
    fontFamily: fonts.extrabold,
    fontSize: 48,
    fontVariant: ['tabular-nums'],
    lineHeight: 54,
  },
  goalTotal: {
    color: theme.text.muted,
    fontFamily: fonts.semibold,
    fontSize: 18,
  },
  track: {
    backgroundColor: theme.bg.raised,
    borderRadius: radius.pill,
    height: 10,
    overflow: 'hidden',
  },
  fill: {
    backgroundColor: theme.accent.primary,
    borderRadius: radius.pill,
    height: '100%',
  },
  goalNote: {
    color: theme.text.secondary,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  grid: {
    flexDirection: 'row',
    gap: 10,
  },
  metric: {
    backgroundColor: theme.bg.surface,
    borderColor: theme.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    gap: 2,
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  metricValue: {
    color: theme.text.primary,
    fontFamily: fonts.extrabold,
    fontSize: 26,
    fontVariant: ['tabular-nums'],
  },
  metricLabel: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
  },
  footnote: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 17,
  },
  sectionTitle: {
    color: theme.text.primary,
    fontFamily: fonts.extrabold,
    fontSize: 16,
    marginTop: 8,
  },
  sectionNote: {
    color: theme.text.secondary,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  empty: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  gymCard: {
    backgroundColor: theme.bg.surface,
    borderColor: theme.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  gymInfo: {
    gap: 6,
  },
  gymName: {
    color: theme.text.primary,
    fontFamily: fonts.bold,
    fontSize: 16,
  },
  gymMeta: {
    color: theme.text.secondary,
    fontFamily: fonts.regular,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  chip: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipIdle: {
    backgroundColor: theme.bg.raised,
  },
  chipText: {
    color: theme.text.primary,
    fontFamily: fonts.semibold,
    fontSize: 12,
  },
  mapLink: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 6,
    minHeight: 40,
  },
  mapLinkText: {
    color: theme.accent.primary,
    fontFamily: fonts.semibold,
    fontSize: 14,
  },
  pressed: {
    opacity: 0.75,
  },
}));
