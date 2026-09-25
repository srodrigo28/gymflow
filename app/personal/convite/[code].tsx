import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { BrandHeader } from '@/src/components/auth/BrandHeader';
import { DEFAULT_PERMISSIONS, PermissionSwitches } from '@/src/components/coaching/PermissionSwitches';
import { Button } from '@/src/components/ui/Button';
import { Screen } from '@/src/components/ui/Screen';
import { AuroraBackground } from '@/src/components/visual/AuroraBackground';
import { useSession } from '@/src/contexts/session-context';
import { ApiError } from '@/src/services/api';
import { getCoachingInvite, joinCoach } from '@/src/services/coaching';
import { crefLabel, firstName } from '@/src/services/student-coaching';
import { fonts, makeStyles, radius, typography, useTheme } from '@/src/theme';
import type { CoachingInvitePreview, CoachingPermissions } from '@/src/types/coaching';

// Tela do link de convite de um personal (gymflow://personal/convite/CODIGO; no Expo Go,
// exp://…/--/personal/convite/CODIGO), que a página pública do convite abre. Fica fora da área logada,
// como o convite de desafio: quem ainda não tem conta vê quem convida antes de decidir se cadastrar. O
// aceite pede a conta, e é nele que a pessoa escolhe o que compartilha.
export default function ConvitePersonalScreen() {
  const styles = useStyles();
  const { theme } = useTheme();
  const { isLoading, session } = useSession();
  const { code } = useLocalSearchParams<{ code: string }>();
  const [invite, setInvite] = useState<CoachingInvitePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<CoachingPermissions>(DEFAULT_PERMISSIONS);
  const [isJoining, setIsJoining] = useState(false);
  // Depois do aceite: o primeiro nome de quem virou seu personal.
  const [joinedName, setJoinedName] = useState<string | null>(null);

  useEffect(() => {
    if (!code) {
      return;
    }

    getCoachingInvite(code)
      .then(setInvite)
      .catch((reason: unknown) =>
        setError(
          reason instanceof ApiError && reason.status === 404
            ? 'Convite não encontrado. Confira se o link chegou inteiro ou peça um novo ao seu personal.'
            : reason instanceof Error
              ? reason.message
              : 'Não foi possível abrir o convite.',
        ),
      );
  }, [code]);

  async function join() {
    if (!session || !invite) {
      return;
    }

    setIsJoining(true);
    setError(null);

    try {
      const link = await joinCoach(session.token, invite.code, permissions);
      setJoinedName(firstName(link.coach.name));
    } catch (reason) {
      // Usado ou vencido entre a prévia e o aceite: o cartão passa a explicar e sugerir outro convite.
      if (reason instanceof ApiError && (reason.code === 'INVITE_USED' || reason.code === 'INVITE_EXPIRED')) {
        setInvite({ ...invite, status: reason.code === 'INVITE_USED' ? 'used' : 'expired' });
      } else {
        setError(reason instanceof Error ? reason.message : 'Não foi possível aceitar o convite.');
      }
    } finally {
      setIsJoining(false);
    }
  }

  const coach = invite?.coach;
  const name = coach ? firstName(coach.name) : '';
  const isMine = Boolean(session && coach && coach.id === session.user.id);
  const isOpen = invite?.status === 'valid' && !isMine && !joinedName;

  function inviteText() {
    if (joinedName) {
      return `Pronto: você e ${joinedName} estão ligados. As prescrições de ${joinedName} vão aparecer no seu Treino, e o que você compartilha muda quando quiser, em Perfil › Meu personal.`;
    }

    if (isMine) {
      return 'Este convite é seu: mande o link para o seu aluno.';
    }

    if (invite?.status === 'used') {
      return `Este convite já foi usado. Cada convite serve uma vez: peça um novo a ${name}.`;
    }

    if (invite?.status === 'expired') {
      return `Este convite venceu (eles valem 7 dias). Peça um novo a ${name}.`;
    }

    return `${name} quer acompanhar seus treinos no Gyn Flow. Você escolhe o que compartilha e pode desfazer quando quiser.`;
  }

  return (
    <Screen>
      <AuroraBackground intensity="subtle" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <BrandHeader />

        <View style={styles.body}>
          {invite && coach ? (
            <Animated.View entering={FadeInDown.duration(450)} style={styles.card}>
              <Text style={styles.eyebrow}>Convite de personal</Text>
              <Text accessibilityRole="header" style={styles.title}>
                {coach.name}
              </Text>
              {coach.cref || coach.city ? (
                <View style={styles.facts}>
                  {coach.cref ? <Text style={styles.fact}>{crefLabel(coach.cref)}</Text> : null}
                  {coach.city ? <Text style={styles.fact}>{coach.city}</Text> : null}
                </View>
              ) : null}
              {coach.bio ? <Text style={styles.bio}>{coach.bio}</Text> : null}
              <Text accessibilityLiveRegion="polite" style={styles.text}>
                {inviteText()}
              </Text>
            </Animated.View>
          ) : error ? null : (
            <ActivityIndicator color={theme.accent.primary} />
          )}

          {isOpen && session ? (
            <View style={styles.card}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>
                O que {name} vai ver
              </Text>
              <PermissionSwitches
                coachName={name}
                disabled={isJoining}
                onChange={(key, value) => setPermissions((current) => ({ ...current, [key]: value }))}
                value={permissions}
              />
              <Text style={styles.cardNote}>
                Cada chave vale na hora e muda quando você quiser, em Perfil › Meu personal. Se desfizer o vínculo,
                {' '}{name} perde o acesso e as prescrições saem; os treinos que você fez ficam com você.
              </Text>
            </View>
          ) : null}

          {error ? (
            <Text accessibilityLiveRegion="polite" style={styles.error}>
              {error}
            </Text>
          ) : null}
        </View>

        {isLoading ? null : (
          <View style={styles.actions}>
            {isOpen && session ? <Button haptic loading={isJoining} onPress={join} title="Aceitar convite" /> : null}

            {isOpen && !session ? (
              <>
                <Button
                  haptic
                  onPress={() => router.push({ params: { personal: code }, pathname: '/(auth)/sign-up' })}
                  title="Criar conta e aceitar"
                />
                <Button
                  onPress={() => router.push({ params: { personal: code }, pathname: '/(auth)/login' })}
                  title="Já tenho conta"
                  variant="ghost"
                />
                <Text style={styles.note}>
                  Leva menos de um minuto. Depois de entrar, você escolhe o que o personal vê: treinos, medidas e fotos
                  são chaves separadas.
                </Text>
              </>
            ) : null}

            {joinedName ? (
              <>
                <Button haptic onPress={() => router.replace('/(app)/home')} title="Ir para o início" />
                <Button onPress={() => router.replace('/(app)/perfil')} title="Ver meu personal" variant="ghost" />
              </>
            ) : null}

            {!isOpen && !joinedName && (invite || error) ? (
              <Button
                onPress={() => router.replace(session ? '/(app)/home' : '/(auth)/welcome')}
                title={session ? 'Ir para o início' : 'Conhecer o Gyn Flow'}
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
  facts: {
    gap: 4,
  },
  fact: {
    color: theme.text.secondary,
    fontFamily: fonts.semibold,
    fontSize: 14,
  },
  bio: {
    color: theme.text.primary,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
  },
  text: {
    ...typography.body,
    color: theme.text.secondary,
  },
  sectionTitle: {
    color: theme.text.primary,
    fontFamily: fonts.extrabold,
    fontSize: 17,
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
  cardNote: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  note: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
}));
