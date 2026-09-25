import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, Share, Text, View } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { Screen } from '@/src/components/ui/Screen';
import { useSession } from '@/src/contexts/session-context';
import { challengeTiming, getChallenge, inviteMessage, leaveChallenge } from '@/src/services/challenges';
import { registerPushToken } from '@/src/services/push';
import { syncWorkouts } from '@/src/services/sync';
import { fonts, makeStyles, radius, typography, useTheme, withAlpha } from '@/src/theme';
import type { Challenge, Standing } from '@/src/types/challenges';

export default function DesafioScreen() {
  const styles = useStyles();
  const { theme } = useTheme();
  const { session } = useSession();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [leaderboard, setLeaderboard] = useState<Standing[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const token = session?.token;

  const load = useCallback(async () => {
    if (!token || !id) {
      return;
    }

    // O treino de agora há pouco precisa estar na conta para contar no placar.
    await syncWorkouts(token).catch(() => undefined);

    try {
      const data = await getChallenge(token, id);
      setChallenge(data.challenge);
      setLeaderboard(data.leaderboard);
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível carregar o desafio.');
    }
  }, [id, token]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  // Quem acabou de criar ou entrar num desafio passa por aqui: é a hora de registrar o aparelho
  // para o lembrete do dia e o placar final.
  useEffect(() => {
    if (session && challenge) {
      void registerPushToken(session).catch(() => undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.id, challenge?.id]);

  async function refresh() {
    setIsRefreshing(true);
    await load();
    setIsRefreshing(false);
  }

  function invite() {
    if (challenge) {
      void Share.share({ message: inviteMessage(challenge) }).catch(() => undefined);
    }
  }

  function confirmLeave() {
    Alert.alert('Sair do desafio?', 'Você sai do placar. Dá para voltar depois pelo mesmo convite.', [
      { style: 'cancel', text: 'Ficar' },
      {
        onPress: async () => {
          if (!token || !id) {
            return;
          }

          try {
            await leaveChallenge(token, id);
            router.replace('/(app)/desafios');
          } catch (reason) {
            setError(reason instanceof Error ? reason.message : 'Não foi possível sair do desafio.');
          }
        },
        style: 'destructive',
        text: 'Sair',
      },
    ]);
  }

  const leader = leaderboard[0];

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
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(app)/desafios'))}
            style={({ pressed }) => [styles.iconButton, pressed ? styles.pressed : null]}>
            <Ionicons color={theme.text.primary} name="arrow-back" size={20} />
          </Pressable>
          <Text accessibilityRole="header" numberOfLines={2} style={styles.title}>
            {challenge?.name ?? 'Desafio'}
          </Text>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {challenge ? (
          <>
            <View style={styles.summary}>
              <Chip text={challengeTiming(challenge)} tone={challenge.status === 'ended' ? 'muted' : 'accent'} />
              <Chip text={`${challenge.days} dias`} tone="muted" />
              <Chip
                text={`${challenge.memberCount} ${challenge.memberCount === 1 ? 'pessoa' : 'pessoas'}`}
                tone="muted"
              />
            </View>

            {challenge.status !== 'ended' ? (
              <View style={styles.inviteCard}>
                <Text style={styles.inviteText}>
                  {challenge.memberCount === 1
                    ? 'Só você por enquanto. Desafio bom é com a turma: mande o convite.'
                    : 'Quanto mais gente, mais difícil faltar. Chame mais alguém.'}
                </Text>
                <Button haptic icon="logo-whatsapp" onPress={invite} title="Convidar amigos" />
                <Text style={styles.code}>
                  Código do convite: <Text style={styles.codeValue}>{challenge.inviteCode}</Text>
                </Text>
              </View>
            ) : null}

            <Text style={styles.sectionTitle}>Placar</Text>
            <View style={styles.board}>
              {leaderboard.map((row) => (
                <View
                  accessibilityLabel={`${row.rank}º lugar: ${row.isMe ? 'você' : row.name}, ${row.points} ${
                    row.points === 1 ? 'ponto' : 'pontos'
                  }`}
                  key={row.userId}
                  style={[styles.row, row.isMe ? { backgroundColor: withAlpha(theme.accent.primary, 0.1) } : null]}>
                  <View style={[styles.rank, row.rank === 1 && row.points > 0 ? styles.rankFirst : null]}>
                    {row.rank === 1 && row.points > 0 ? (
                      <MaterialCommunityIcons color={theme.domain.conquista} name="crown" size={16} />
                    ) : (
                      <Text style={styles.rankText}>{row.rank}º</Text>
                    )}
                  </View>
                  <Text numberOfLines={1} style={[styles.name, row.isMe ? styles.nameMe : null]}>
                    {row.isMe ? `${row.name} (você)` : row.name}
                  </Text>
                  <Text style={styles.points}>
                    {row.points}
                    <Text style={styles.pointsUnit}> {row.points === 1 ? 'dia' : 'dias'}</Text>
                  </Text>
                </View>
              ))}
            </View>

            <Text style={styles.rules}>
              Cada dia com treino concluído vale um ponto, com pelo menos uma série feita. Seus treinos sobem sozinhos
              quando há internet; puxe a tela para atualizar.
              {leader && leader.points > 0 && challenge.status === 'ended' ? ` ${leader.name} fechou na frente.` : ''}
            </Text>

            <Button onPress={confirmLeave} title="Sair do desafio" variant="ghost" />
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function Chip({ text, tone }: { text: string; tone: 'accent' | 'muted' }) {
  const styles = useStyles();
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.chip,
        { backgroundColor: tone === 'accent' ? withAlpha(theme.accent.primary, 0.14) : theme.bg.surface },
      ]}>
      <Text style={[styles.chipText, { color: tone === 'accent' ? theme.accent.primary : theme.text.secondary }]}>
        {text}
      </Text>
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
    ...typography.h2,
    color: theme.text.primary,
    flex: 1,
  },
  error: {
    color: theme.status.danger,
    fontFamily: fonts.medium,
    fontSize: 14,
  },
  summary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: {
    fontFamily: fonts.bold,
    fontSize: 13,
  },
  inviteCard: {
    backgroundColor: theme.bg.surface,
    borderColor: theme.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  inviteText: {
    color: theme.text.secondary,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  code: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 13,
    textAlign: 'center',
  },
  codeValue: {
    color: theme.text.primary,
    fontFamily: fonts.bold,
    letterSpacing: 1.5,
  },
  sectionTitle: {
    color: theme.text.primary,
    fontFamily: fonts.extrabold,
    fontSize: 16,
    marginTop: 4,
  },
  board: {
    backgroundColor: theme.bg.surface,
    borderColor: theme.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    alignItems: 'center',
    borderBottomColor: theme.border.subtle,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 56,
    paddingHorizontal: 16,
  },
  rank: {
    alignItems: 'center',
    backgroundColor: theme.bg.raised,
    borderRadius: radius.pill,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  rankFirst: {
    backgroundColor: withAlpha(theme.domain.conquista, 0.18),
  },
  rankText: {
    color: theme.text.secondary,
    fontFamily: fonts.bold,
    fontSize: 13,
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
  points: {
    color: theme.text.primary,
    fontFamily: fonts.extrabold,
    fontSize: 18,
    fontVariant: ['tabular-nums'],
  },
  pointsUnit: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 13,
  },
  rules: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 19,
  },
  pressed: {
    opacity: 0.75,
  },
}));
