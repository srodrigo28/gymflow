import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { BrandHeader } from '@/src/components/auth/BrandHeader';
import { Button } from '@/src/components/ui/Button';
import { Screen } from '@/src/components/ui/Screen';
import { AuroraBackground } from '@/src/components/visual/AuroraBackground';
import { useSession } from '@/src/contexts/session-context';
import { challengeTiming, getInvite, joinChallenge } from '@/src/services/challenges';
import { fonts, makeStyles, radius, typography, useTheme } from '@/src/theme';
import type { InvitePreview } from '@/src/types/challenges';

// Tela do link de convite (gymflow://convite/CODIGO). Fica fora da área logada: quem ainda
// não tem conta vê o desafio antes de decidir se cadastrar.
export default function ConviteScreen() {
  const styles = useStyles();
  const { theme } = useTheme();
  const { isLoading, session } = useSession();
  const { code } = useLocalSearchParams<{ code: string }>();
  const [invite, setInvite] = useState<InvitePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    if (!code) {
      return;
    }

    getInvite(code)
      .then(setInvite)
      .catch((reason: unknown) =>
        setError(reason instanceof Error ? reason.message : 'Não foi possível abrir o convite.'),
      );
  }, [code]);

  async function join() {
    if (!session || !code) {
      return;
    }

    setIsJoining(true);
    setError(null);

    try {
      const id = await joinChallenge(session.token, code);
      router.replace({ params: { id }, pathname: '/(app)/desafios/[id]' });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível entrar no desafio.');
      setIsJoining(false);
    }
  }

  const who = invite?.ownerFirstName ? `${invite.ownerFirstName} te chamou` : 'Você foi chamado';
  const isOpen = invite && invite.status !== 'ended';

  return (
    <Screen>
      <AuroraBackground intensity="subtle" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <BrandHeader />

        <View style={styles.body}>
          {invite ? (
            <Animated.View entering={FadeInDown.duration(450)} style={styles.card}>
              <Text style={styles.eyebrow}>Convite para desafio</Text>
              <Text accessibilityRole="header" style={styles.title}>
                {invite.name}
              </Text>
              <Text style={styles.text}>
                {invite.status === 'ended'
                  ? 'Este desafio já terminou. Crie o seu e chame a turma.'
                  : `${who} para treinar ${invite.days} dias. Cada dia com treino concluído vale um ponto.`}
              </Text>
              <View style={styles.facts}>
                <Text style={styles.fact}>
                  {invite.memberCount} {invite.memberCount === 1 ? 'pessoa dentro' : 'pessoas dentro'}
                </Text>
                <Text style={styles.fact}>{challengeTiming(invite)}</Text>
              </View>
            </Animated.View>
          ) : error ? null : (
            <ActivityIndicator color={theme.accent.primary} />
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>

        {isLoading ? null : (
          <View style={styles.actions}>
            {isOpen && session ? (
              <Button haptic loading={isJoining} onPress={join} title="Entrar no desafio" />
            ) : null}

            {isOpen && !session ? (
              <>
                <Button
                  haptic
                  onPress={() => router.push({ params: { convite: code }, pathname: '/(auth)/sign-up' })}
                  title="Criar conta e entrar"
                />
                <Button
                  onPress={() => router.push({ params: { convite: code }, pathname: '/(auth)/login' })}
                  title="Já tenho conta"
                  variant="ghost"
                />
                <Text style={styles.note}>
                  Leva menos de um minuto. Seus treinos continuam só seus: o grupo vê o nome e os dias com treino.
                </Text>
              </>
            ) : null}

            {!isOpen ? (
              <Button
                onPress={() => router.replace(session ? '/(app)/desafios' : '/(auth)/welcome')}
                title={session ? 'Ver meus desafios' : 'Conhecer o Gyn Flow'}
                variant="outline"
              />
            ) : null}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const useStyles = makeStyles((theme) => ({
  content: {
    alignSelf: 'center',
    flexGrow: 1,
    gap: 24,
    maxWidth: 520,
    paddingBottom: 32,
    paddingHorizontal: 24,
    paddingTop: 16,
    width: '100%',
  },
  body: {
    flex: 1,
    gap: 16,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: theme.bg.overlay,
    borderColor: theme.border.subtle,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: 12,
    padding: 24,
  },
  eyebrow: {
    color: theme.accent.primary,
    fontFamily: fonts.bold,
    fontSize: 13,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: {
    ...typography.h1,
    color: theme.text.primary,
  },
  text: {
    ...typography.body,
    color: theme.text.secondary,
  },
  facts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  fact: {
    color: theme.text.primary,
    fontFamily: fonts.semibold,
    fontSize: 14,
  },
  error: {
    color: theme.status.danger,
    fontFamily: fonts.medium,
    fontSize: 15,
    textAlign: 'center',
  },
  actions: {
    gap: 10,
  },
  note: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
}));
