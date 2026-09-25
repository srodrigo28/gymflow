import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState, type ComponentProps } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { Screen } from '@/src/components/ui/Screen';
import { useSession } from '@/src/contexts/session-context';
import { onMeasurementsSynced } from '@/src/services/body-sync';
import { onWorkoutsRestored } from '@/src/services/sync';
import { getSyncStatus, restoreFromAccount, syncNow, type SyncStatus } from '@/src/services/sync-status';
import { fonts, makeStyles, radius, typography, useTheme, withAlpha } from '@/src/theme';
import { formatSessionDate } from '@/src/utils/format';

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

export default function SincronizarScreen() {
  const styles = useStyles();
  const { theme } = useTheme();
  const { session } = useSession();
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [busy, setBusy] = useState<'sync' | 'restore' | null>(null);
  const [message, setMessage] = useState<{ text: string; tone: 'ok' | 'error' } | null>(null);
  const token = session?.token;
  const consentAt = session?.user.bodyDataConsentAt ?? null;

  const load = useCallback(() => {
    getSyncStatus(consentAt)
      .then(setStatus)
      .catch(() => {});
  }, [consentAt]);

  useFocusEffect(load);

  // Recarrega quando treinos ou medidas chegam da conta durante a tela aberta.
  useEffect(() => {
    const stopWorkouts = onWorkoutsRestored(load);
    const stopMeasurements = onMeasurementsSynced(load);

    return () => {
      stopWorkouts();
      stopMeasurements();
    };
  }, [load]);

  async function run(kind: 'sync' | 'restore') {
    if (!token) {
      return;
    }

    setBusy(kind);
    setMessage(null);

    try {
      await (kind === 'sync' ? syncNow(token, consentAt) : restoreFromAccount(token, consentAt));
      setMessage({ text: kind === 'sync' ? 'Tudo em dia com a conta.' : 'Conta baixada de novo neste aparelho.', tone: 'ok' });
    } catch (error) {
      setMessage({
        text: error instanceof Error ? error.message : 'Não foi possível sincronizar agora.',
        tone: 'error',
      });
    } finally {
      setBusy(null);
      load();
    }
  }

  function confirmRestore() {
    Alert.alert(
      'Baixar de novo da conta?',
      'Traz para este aparelho os treinos e as medidas da conta que ainda não estão aqui. Nada do aparelho é apagado.',
      [
        { style: 'cancel', text: 'Cancelar' },
        { onPress: () => void run('restore'), text: 'Baixar' },
      ],
    );
  }

  const workouts = status?.workouts;
  const measurements = status?.measurements;

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
            Sincronizar
          </Text>
        </View>

        <Text style={styles.intro}>
          Seus aparelhos ficam em dia pela conta {session?.user.email}. O que sobe daqui volta num celular novo
          assim que você entrar.
        </Text>

        <StatusCard
          icon="dumbbell"
          lines={
            workouts
              ? [
                  `${plural(workouts.finished, 'treino concluído', 'treinos concluídos')} neste aparelho`,
                  `${workouts.synced} na conta · ${workouts.pending} na fila`,
                ]
              : []
          }
          note={
            status?.workoutsRestoredAt
              ? `Histórico da conta baixado ${formatSessionDate(status.workoutsRestoredAt).toLowerCase()}.`
              : 'Treinos sobem sozinhos ao terminar e ao voltar para o app.'
          }
          title="Treinos"
          tone={theme.domain.treino}
        />

        <StatusCard
          icon={measurements?.hasConsent ? 'cloud-check-outline' : 'cloud-lock-outline'}
          lines={
            measurements
              ? measurements.hasConsent
                ? [
                    `${plural(measurements.total, 'medida', 'medidas')} neste aparelho`,
                    measurements.pending > 0 ? `${measurements.pending} na fila` : 'Tudo na conta',
                  ]
                : [`${plural(measurements.total, 'medida', 'medidas')} só neste aparelho`]
              : []
          }
          note={
            measurements?.hasConsent
              ? 'Com o seu consentimento, sobem e voltam como os treinos.'
              : 'Sobem só com o seu consentimento, que fica na tela Evolução.'
          }
          title="Medidas do corpo"
          tone={theme.domain.conquista}
        />

        <StatusCard
          icon="cellphone-lock"
          lines={status ? [`${plural(status.photos.total, 'foto', 'fotos')} de evolução`, 'Respostas do questionário'] : []}
          note="Ficam só neste aparelho, de propósito. Fotos na conta chegam com armazenamento privado."
          title="Só aqui"
          tone={theme.text.secondary}
        />

        <View style={styles.actions}>
          <Button
            haptic
            icon="sync"
            loading={busy === 'sync'}
            disabled={busy !== null || !token}
            onPress={() => void run('sync')}
            title="Sincronizar agora"
          />
          <Button
            disabled={busy !== null || !token}
            icon="cloud-download-outline"
            loading={busy === 'restore'}
            onPress={confirmRestore}
            title="Baixar de novo da conta"
            variant="outline"
          />
          {status?.lastManualSyncAt ? (
            <Text style={styles.lastSync}>
              Última sincronização manual: {formatSessionDate(status.lastManualSyncAt).toLowerCase()}.
            </Text>
          ) : null}
          {message ? (
            <Text
              accessibilityLiveRegion="polite"
              style={[styles.message, message.tone === 'error' ? styles.messageError : null]}>
              {message.text}
            </Text>
          ) : null}
        </View>

        <View style={styles.devices}>
          <View style={styles.devicesHeader}>
            <MaterialCommunityIcons color={theme.text.muted} name="watch-variant" size={20} />
            <Text style={styles.devicesTitle}>Relógios e apps de saúde</Text>
          </View>
          <Text style={styles.devicesText}>
            Health Connect no Android e o app Saúde no iPhone chegam com a versão de loja: eles precisam de
            um build nativo, que o Expo Go não tem. Quando entrarem, passos, batimentos e sono vão alimentar as
            recomendações.
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

function StatusCard({
  icon,
  lines,
  note,
  title,
  tone,
}: {
  icon: ComponentProps<typeof MaterialCommunityIcons>['name'];
  lines: string[];
  note: string;
  title: string;
  tone: string;
}) {
  const styles = useStyles();

  return (
    <View accessibilityLabel={`${title}. ${lines.join('. ')}. ${note}`} accessible style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconWrap, { backgroundColor: withAlpha(tone, 0.16) }]}>
          <MaterialCommunityIcons color={tone} name={icon} size={20} />
        </View>
        <View style={styles.cardText}>
          <Text style={styles.cardTitle}>{title}</Text>
          {lines.map((line) => (
            <Text key={line} style={styles.cardLine}>
              {line}
            </Text>
          ))}
        </View>
      </View>
      <Text style={styles.cardNote}>{note}</Text>
    </View>
  );
}

const useStyles = makeStyles((theme) => ({
  content: {
    alignSelf: 'center',
    gap: 12,
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
  },
  intro: {
    color: theme.text.secondary,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    backgroundColor: theme.bg.surface,
    borderColor: theme.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 10,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  cardText: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    color: theme.text.primary,
    fontFamily: fonts.extrabold,
    fontSize: 16,
  },
  cardLine: {
    color: theme.text.secondary,
    fontFamily: fonts.semibold,
    fontSize: 13,
  },
  cardNote: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 17,
  },
  actions: {
    gap: 10,
    marginTop: 4,
  },
  lastSync: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 12,
    textAlign: 'center',
  },
  message: {
    color: theme.status.success,
    fontFamily: fonts.semibold,
    fontSize: 13,
    textAlign: 'center',
  },
  messageError: {
    color: theme.status.danger,
  },
  devices: {
    borderColor: theme.border.subtle,
    borderRadius: radius.md,
    borderStyle: 'dashed',
    borderWidth: 1,
    gap: 8,
    marginTop: 8,
    padding: 16,
  },
  devicesHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  devicesTitle: {
    color: theme.text.primary,
    fontFamily: fonts.bold,
    fontSize: 14,
  },
  devicesText: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 19,
  },
  pressed: {
    opacity: 0.75,
  },
}));
