import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Share, Text, View } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { Screen } from '@/src/components/ui/Screen';
import { useSession } from '@/src/contexts/session-context';
import { createChallenge, inviteMessage, type ChallengeDays } from '@/src/services/challenges';
import { fonts, makeStyles, radius, typography, useTheme } from '@/src/theme';

const durations: { days: ChallengeDays; hint: string }[] = [
  { days: 7, hint: 'uma semana' },
  { days: 14, hint: 'duas semanas' },
  { days: 30, hint: 'um mês' },
];

export default function NovoDesafioScreen() {
  const styles = useStyles();
  const { theme } = useTheme();
  const { session } = useSession();
  const [name, setName] = useState('');
  const [days, setDays] = useState<ChallengeDays>(30);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  async function handleCreate() {
    if (!session) {
      return;
    }

    if (name.trim().length < 2) {
      setError('Dê um nome ao desafio.');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const challenge = await createChallenge(session.token, name.trim(), days);
      // O convite sai na hora: é o que faz o desafio existir de verdade.
      await Share.share({ message: inviteMessage(challenge) }).catch(() => undefined);
      router.replace({ params: { id: challenge.id }, pathname: '/(app)/desafios/[id]' });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível criar o desafio.');
      setIsCreating(false);
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
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(app)/desafios'))}
            style={({ pressed }) => [styles.iconButton, pressed ? styles.pressed : null]}>
            <Ionicons color={theme.text.primary} name="arrow-back" size={20} />
          </Pressable>
          <Text accessibilityRole="header" style={styles.title}>
            Novo desafio
          </Text>
        </View>

        <Input
          autoCapitalize="sentences"
          error={error ?? undefined}
          label="Nome do desafio"
          maxLength={60}
          onChangeText={setName}
          placeholder="Ex.: Outubro sem falta"
          returnKeyType="done"
          value={name}
        />

        <Text style={styles.label}>Duração</Text>
        <View accessibilityRole="radiogroup" style={styles.durations}>
          {durations.map((item) => (
            <Pressable
              accessibilityLabel={`${item.days} dias, ${item.hint}`}
              accessibilityRole="radio"
              accessibilityState={{ checked: days === item.days }}
              key={item.days}
              onPress={() => setDays(item.days)}
              style={({ pressed }) => [
                styles.duration,
                days === item.days ? styles.durationActive : null,
                pressed ? styles.pressed : null,
              ]}>
              <Text style={[styles.durationDays, days === item.days ? styles.durationTextActive : null]}>
                {item.days} dias
              </Text>
              <Text style={[styles.durationHint, days === item.days ? styles.durationTextActive : null]}>
                {item.hint}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.rules}>
          <Text style={styles.rulesTitle}>Como funciona</Text>
          <Text style={styles.rulesText}>
            Começa hoje. Cada dia com treino concluído vale um ponto, com pelo menos uma série feita. Dois treinos
            no mesmo dia continuam valendo um ponto: ganha quem aparece mais, não quem registra mais.
          </Text>
        </View>

        <Button haptic icon="logo-whatsapp" loading={isCreating} onPress={handleCreate} title="Criar e convidar" />
      </ScrollView>
    </Screen>
  );
}

const useStyles = makeStyles((theme) => ({
  content: {
    alignSelf: 'center',
    gap: 16,
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
  label: {
    color: theme.text.secondary,
    fontFamily: fonts.semibold,
    fontSize: 14,
  },
  durations: {
    flexDirection: 'row',
    gap: 10,
  },
  duration: {
    alignItems: 'center',
    backgroundColor: theme.bg.surface,
    borderColor: theme.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    gap: 2,
    paddingVertical: 14,
  },
  durationActive: {
    backgroundColor: theme.accent.primary,
    borderColor: theme.accent.primary,
  },
  durationDays: {
    color: theme.text.primary,
    fontFamily: fonts.extrabold,
    fontSize: 16,
  },
  durationHint: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 12,
  },
  durationTextActive: {
    color: theme.accent.onPrimary,
  },
  rules: {
    backgroundColor: theme.bg.surface,
    borderRadius: radius.md,
    gap: 6,
    padding: 16,
  },
  rulesTitle: {
    color: theme.text.primary,
    fontFamily: fonts.bold,
    fontSize: 15,
  },
  rulesText: {
    color: theme.text.secondary,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  pressed: {
    opacity: 0.75,
  },
}));
