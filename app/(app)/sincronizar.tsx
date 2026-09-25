import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState, type ComponentProps } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { Screen } from '@/src/components/ui/Screen';
import { useSession } from '@/src/contexts/session-context';
import { onMeasurementsSynced } from '@/src/services/body-sync';
import { onPhotosSynced } from '@/src/services/photo-sync';
import { onWorkoutsRestored } from '@/src/services/sync';
import { getSyncStatus, restoreFromAccount, syncNow, type SyncStatus } from '@/src/services/sync-status';
import { fonts, makeStyles, radius, typography, useTheme, withAlpha } from '@/src/theme';
import { formatSessionDate } from '@/src/utils/format';

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

// O que dizer das fotos: o servidor esperando, as que não puderam subir, ou onde fica o consentimento.
function photosNote(photos: SyncStatus['photos'] | undefined, hasConsent: boolean) {
  if (!hasConsent) {
    return 'Sobem só com o consentimento próprio das fotos, que fica na tela Fotos da Evolução.';
  }

  if (photos?.serverWaiting) {
    return 'O servidor ainda não está guardando fotos. Elas continuam seguras neste aparelho e sobem assim que der.';
  }

  const refused = photos?.refused ?? 0;

  return `Com o seu consentimento, sobem sem os metadados e voltam num aparelho novo.${
    refused > 0
      ? ` ${plural(refused, 'foto não pôde', 'fotos não puderam')} subir e ${refused === 1 ? 'continua' : 'continuam'} só aqui.`
      : ''
  }`;
}

// O que sobrou das fotos depois de sincronizar: o servidor ainda sem armazenamento, ou a fila que sobe na
// próxima rodada (o limite de envios por hora). null quando não sobrou nada.
function photosLeftNote(photos: SyncStatus['photos'] | undefined) {
  if (!photos?.hasConsent || photos.pending === 0) {
    return null;
  }

  return photos.serverWaiting
    ? 'O servidor ainda não está guardando fotos: elas seguem seguras aqui.'
    : `${plural(photos.pending, 'foto continua', 'fotos continuam')} na fila e ${photos.pending === 1 ? 'sobe' : 'sobem'} na próxima rodada.`;
}

export default function SincronizarScreen() {
  const styles = useStyles();
  const { theme } = useTheme();
  const { session } = useSession();
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [busy, setBusy] = useState<'sync' | 'restore' | null>(null);
  const [message, setMessage] = useState<{ text: string; tone: 'ok' | 'error' } | null>(null);
  const token = session?.token;
  const bodyDataConsentAt = session?.user.bodyDataConsentAt ?? null;
  const bodyPhotoConsentAt = session?.user.bodyPhotoConsentAt ?? null;

  const load = useCallback(() => {
    getSyncStatus({ bodyDataConsentAt, bodyPhotoConsentAt })
      .then(setStatus)
      .catch(() => {});
  }, [bodyDataConsentAt, bodyPhotoConsentAt]);

  useFocusEffect(load);

  // Recarrega quando treinos, medidas ou fotos chegam da conta (ou sobem) durante a tela aberta.
  useEffect(() => {
    const stopWorkouts = onWorkoutsRestored(load);
    const stopMeasurements = onMeasurementsSynced(load);
    const stopPhotos = onPhotosSynced(load);

    return () => {
      stopWorkouts();
      stopMeasurements();
      stopPhotos();
    };
  }, [load]);

  async function run(kind: 'sync' | 'restore') {
    if (!session) {
      return;
    }

    setBusy(kind);
    setMessage(null);

    try {
      await (kind === 'sync' ? syncNow(session) : restoreFromAccount(session));
      // Fotos que ficaram na fila não estão "em dia": a mensagem conta o porquê.
      const fresh = await getSyncStatus({ bodyDataConsentAt, bodyPhotoConsentAt }).catch(() => null);
      const photosLeft = photosLeftNote(fresh?.photos);
      setMessage({
        text:
          kind === 'restore'
            ? `Conta baixada de novo neste aparelho.${photosLeft ? ` ${photosLeft}` : ''}`
            : photosLeft
              ? `${photosLeft} O resto está em dia com a conta.`
              : 'Tudo em dia com a conta.',
        tone: 'ok',
      });
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
      'Traz para este aparelho os treinos, as medidas e as fotos da conta que ainda não estão aqui. Nada do aparelho é apagado.',
      [
        { style: 'cancel', text: 'Cancelar' },
        { onPress: () => void run('restore'), text: 'Baixar' },
      ],
    );
  }

  const workouts = status?.workouts;
  const measurements = status?.measurements;
  const photos = status?.photos;

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
          icon={photos?.hasConsent ? 'cloud-check-outline' : 'cloud-lock-outline'}
          lines={
            photos
              ? photos.hasConsent
                ? [
                    `${plural(photos.total, 'foto', 'fotos')} neste aparelho`,
                    `${photos.inAccount} na conta · ${
                      photos.pending > 0
                        ? `${photos.pending} ${photos.pending === 1 ? 'falta' : 'faltam'} subir`
                        : 'nenhuma falta subir'
                    }`,
                  ]
                : [`${plural(photos.total, 'foto', 'fotos')} só neste aparelho`]
              : []
          }
          note={photosNote(photos, Boolean(bodyPhotoConsentAt))}
          title="Fotos de evolução"
          tone={theme.domain.conquista}
        />

        {/* As respostas do questionário sobem só com o consentimento delas, que fica no Perfil. */}
        {session?.user.questionnaireConsentAt ? null : (
          <StatusCard
            icon="cellphone-lock"
            lines={['Respostas do questionário']}
            note="Ficam só neste aparelho. Para guardá-las na conta, use o Perfil."
            title="Só aqui"
            tone={theme.text.secondary}
          />
        )}

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
