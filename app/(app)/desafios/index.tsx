import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { Screen } from '@/src/components/ui/Screen';
import { useSession } from '@/src/contexts/session-context';
import { challengeTiming, joinChallenge, listChallenges } from '@/src/services/challenges';
import { fonts, makeStyles, radius, typography, useTheme, withAlpha } from '@/src/theme';
import type { ChallengeSummary } from '@/src/types/challenges';

export default function DesafiosScreen() {
  const styles = useStyles();
  const { theme } = useTheme();
  const { session } = useSession();
  const [challenges, setChallenges] = useState<ChallengeSummary[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const token = session?.token;

  const load = useCallback(async () => {
    if (!token) {
      return;
    }

    try {
      setChallenges(await listChallenges(token));
      setLoadError(null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Não foi possível carregar os desafios.');
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function handleJoin() {
    if (!token || !code.trim()) {
      return;
    }

    setIsJoining(true);
    setJoinError(null);

    try {
      const id = await joinChallenge(token, code.trim());
      setCode('');
      router.push({ params: { id }, pathname: '/(app)/desafios/[id]' });
    } catch (error) {
      setJoinError(error instanceof Error ? error.message : 'Não foi possível entrar no desafio.');
    } finally {
      setIsJoining(false);
    }
  }

  return (
    <Screen edges={['top', 'right', 'left']}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
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
            Desafios
          </Text>
        </View>

        <Text style={styles.intro}>
          Chame amigos para treinar junto. Cada dia com treino concluído vale um ponto, para todo mundo igual.
        </Text>

        <Button haptic icon="add" onPress={() => router.push('/(app)/desafios/novo')} title="Criar desafio" />

        {loadError ? <Text style={styles.error}>{loadError}</Text> : null}

        {challenges?.length === 0 ? (
          <Text style={styles.empty}>
            Você ainda não está em nenhum desafio. Crie um e mande o convite no grupo da academia.
          </Text>
        ) : null}

        {challenges?.map((challenge) => (
          <Pressable
            accessibilityLabel={`${challenge.name}. ${challengeTiming(challenge)}. ${
              challenge.myRank ? `Você está em ${challenge.myRank}º lugar` : ''
            } com ${challenge.myPoints} ${challenge.myPoints === 1 ? 'ponto' : 'pontos'}.`}
            accessibilityRole="button"
            key={challenge.id}
            onPress={() => router.push({ params: { id: challenge.id }, pathname: '/(app)/desafios/[id]' })}
            style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}>
            <View style={styles.cardTop}>
              <Text numberOfLines={2} style={styles.cardTitle}>
                {challenge.name}
              </Text>
              <View
                style={[
                  styles.timing,
                  challenge.status === 'ended' ? styles.timingEnded : { backgroundColor: withAlpha(theme.accent.primary, 0.14) },
                ]}>
                <Text style={[styles.timingText, challenge.status === 'ended' ? styles.timingTextEnded : null]}>
                  {challengeTiming(challenge)}
                </Text>
              </View>
            </View>

            <View style={styles.cardStats}>
              <Stat icon="trophy-outline" value={challenge.myRank ? `${challenge.myRank}º lugar` : '—'} />
              <Stat
                icon="calendar-check-outline"
                value={`${challenge.myPoints} ${challenge.myPoints === 1 ? 'ponto' : 'pontos'}`}
              />
              <Stat
                icon="account-group-outline"
                value={`${challenge.memberCount} ${challenge.memberCount === 1 ? 'pessoa' : 'pessoas'}`}
              />
            </View>
          </Pressable>
        ))}

        <View style={styles.joinCard}>
          <Text style={styles.sectionTitle}>Recebeu um código?</Text>
          <Input
            autoCapitalize="characters"
            autoCorrect={false}
            error={joinError ?? undefined}
            icon="key-outline"
            maxLength={12}
            onChangeText={(text) => setCode(text.toUpperCase())}
            onSubmitEditing={handleJoin}
            placeholder="Código do convite"
            returnKeyType="go"
            value={code}
          />
          <Button
            disabled={!code.trim()}
            loading={isJoining}
            onPress={handleJoin}
            title="Entrar no desafio"
            variant="outline"
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

function Stat({ icon, value }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; value: string }) {
  const styles = useStyles();
  const { theme } = useTheme();

  return (
    <View style={styles.stat}>
      <MaterialCommunityIcons color={theme.text.secondary} name={icon} size={16} />
      <Text style={styles.statText}>{value}</Text>
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
  intro: {
    ...typography.body,
    color: theme.text.secondary,
  },
  error: {
    color: theme.status.danger,
    fontFamily: fonts.medium,
    fontSize: 14,
  },
  empty: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
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
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  cardTitle: {
    color: theme.text.primary,
    flex: 1,
    fontFamily: fonts.extrabold,
    fontSize: 17,
    lineHeight: 22,
  },
  timing: {
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  timingEnded: {
    backgroundColor: theme.bg.raised,
  },
  timingText: {
    color: theme.accent.primary,
    fontFamily: fonts.bold,
    fontSize: 12,
  },
  timingTextEnded: {
    color: theme.text.muted,
  },
  cardStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  stat: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  statText: {
    color: theme.text.secondary,
    fontFamily: fonts.semibold,
    fontSize: 13,
  },
  joinCard: {
    backgroundColor: theme.bg.surface,
    borderColor: theme.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 12,
    marginTop: 8,
    padding: 16,
  },
  sectionTitle: {
    color: theme.text.primary,
    fontFamily: fonts.extrabold,
    fontSize: 16,
  },
  pressed: {
    opacity: 0.75,
  },
}));
