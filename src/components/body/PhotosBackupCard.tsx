import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState, type ComponentProps } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { useSession } from '@/src/contexts/session-context';
import { onSyncQueued } from '@/src/db/outbox';
import { getPhotoBackupStatus, onPhotosSynced, type PhotoBackupStatus } from '@/src/services/photo-sync';
import { fonts, makeStyles, radius, useTheme, withAlpha } from '@/src/theme';
import { formatShortDate } from '@/src/utils/format';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

// Consentimento específico e destacado para as fotos, separado do das medidas: foto de corpo é o dado mais
// sensível do app. Diz o que sobe, o que o servidor faz com a foto, quem vê e como voltar atrás. É o molde
// do das medidas (MeasurementsBackupCard), com os pontos curtos do cartão do diário.
const CONSENT_TITLE = 'Guardar fotos na conta';
const CONSENT_TEXT =
  'Foto do corpo é dado sensível e nasce privada, só sua. Com o seu consentimento, o Gyn Flow guarda as suas fotos de evolução na sua conta, só para você recuperá-las em outro aparelho.\n\nAntes de guardar, o servidor refaz cada foto e tira os metadados, inclusive a localização. Elas ficam num armazenamento privado e só abrem por links que valem 10 minutos. Ninguém mais as vê, e elas não viram XP.\n\nEste consentimento é separado do das medidas. Você pode retirá-lo quando quiser: aí apagamos todas as fotos da conta na hora. As deste aparelho continuam aqui.';

// O mesmo, em partes curtas, no cartão: a pessoa lê antes de tocar em "Guardar na conta".
const consentPoints: { icon: IconName; text: string }[] = [
  {
    icon: 'image-lock-outline',
    text: 'Foto do corpo é dado sensível: nasce privada e só sai daqui com este consentimento, separado do das medidas.',
  },
  { icon: 'map-marker-off-outline', text: 'O servidor refaz cada foto e tira os metadados, inclusive a localização.' },
  { icon: 'lock-outline', text: 'Ficam num armazenamento privado e só abrem por links que valem 10 minutos.' },
  { icon: 'eye-off-outline', text: 'Ninguém mais vê as suas fotos, e elas não viram XP.' },
  {
    icon: 'delete-outline',
    text: 'Retirar o consentimento apaga todas as fotos da conta na hora. As deste aparelho continuam.',
  },
];

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

// O estado do envio numa linha: o que acontece agora, ou o que falta.
function statusLine(status: PhotoBackupStatus, hasConsent: boolean) {
  if (!hasConsent) {
    return status.total > 0
      ? `${plural(status.total, 'foto guardada', 'fotos guardadas')} só aqui.`
      : 'Nenhuma foto ainda.';
  }

  if (status.activity === 'restoring') {
    return 'Trazendo as fotos da conta para este aparelho…';
  }

  if (status.pending > 0) {
    if (status.serverWaiting) {
      return `${plural(status.pending, 'foto esperando', 'fotos esperando')} o servidor.`;
    }

    if (status.activity === 'sending') {
      return `Enviando… ${status.pending === 1 ? 'falta 1 foto' : `faltam ${status.pending} fotos`}.`;
    }

    return `${plural(status.pending, 'foto aguardando', 'fotos aguardando')} envio.`;
  }

  return status.total > 0 ? 'Tudo em dia com a conta.' : 'Nenhuma foto ainda.';
}

// O consentimento e o retrato das fotos, sempre em dia: ao ganhar foco, a cada foto nova na fila e a cada
// envio ou download.
function usePhotoBackup() {
  const { session, setBodyPhotoConsent } = useSession();
  const consentAt = session?.user.bodyPhotoConsentAt ?? null;
  const [status, setStatus] = useState<PhotoBackupStatus | null>(null);

  const refresh = useCallback(async () => {
    setStatus(await getPhotoBackupStatus(consentAt).catch(() => null));
  }, [consentAt]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  useEffect(() => onSyncQueued(() => void refresh()), [refresh]);
  useEffect(() => onPhotosSynced(() => void refresh()), [refresh]);

  return { consentAt, setBodyPhotoConsent, status };
}

export function PhotosBackupCard() {
  const styles = useStyles();
  const { theme } = useTheme();
  const { consentAt, setBodyPhotoConsent, status } = usePhotoBackup();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function apply(granted: boolean) {
    setIsSaving(true);
    setError(null);

    try {
      await setBodyPhotoConsent(granted);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível salvar sua escolha.');
    } finally {
      setIsSaving(false);
    }
  }

  function askToGrant() {
    Alert.alert(CONSENT_TITLE, CONSENT_TEXT, [
      { style: 'cancel', text: 'Agora não' },
      { onPress: () => void apply(true), text: 'Aceito e quero guardar' },
    ]);
  }

  function askToRevoke() {
    Alert.alert(
      'Parar de guardar fotos na conta',
      'Apagamos agora todas as suas fotos da conta, e os links que ainda valiam deixam de abrir. As fotos deste aparelho continuam aqui.',
      [
        { style: 'cancel', text: 'Cancelar' },
        { onPress: () => void apply(false), style: 'destructive', text: 'Parar e apagar' },
      ],
    );
  }

  return (
    <View accessibilityLabel="Fotos na conta" style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons
            color={theme.accent.primary}
            name={consentAt ? 'cloud-check-outline' : 'cloud-lock-outline'}
            size={20}
          />
        </View>
        <View style={styles.headerText}>
          <Text accessibilityRole="header" style={styles.title}>
            {consentAt ? 'Fotos guardadas na conta' : 'Fotos só neste aparelho'}
          </Text>
          {status ? <Text style={styles.status}>{statusLine(status, Boolean(consentAt))}</Text> : null}
        </View>
      </View>

      {consentAt && status && status.total > 0 ? (
        <Text style={styles.counts}>
          {`${status.inAccount} na conta · ${status.total - status.inAccount} só neste aparelho`}
        </Text>
      ) : null}

      {/* O servidor ainda sem armazenamento de fotos (503): nada se perde, só espera. */}
      {consentAt && status?.serverWaiting ? (
        <View accessibilityLiveRegion="polite" style={styles.notice}>
          <MaterialCommunityIcons color={theme.status.info} name="cloud-clock-outline" size={18} />
          <Text style={styles.noticeText}>
            O servidor ainda não está guardando fotos. As suas continuam seguras neste aparelho e sobem sozinhas
            assim que ele estiver pronto.
          </Text>
        </View>
      ) : null}

      {consentAt ? (
        <Text style={styles.text}>
          {`Desde ${formatShortDate(Date.parse(consentAt))}, suas fotos sobem para a sua conta sem os metadados (nem a localização) e voltam num aparelho novo. Ficam num armazenamento privado, com links que valem 10 minutos. Ninguém mais as vê, e elas não viram XP.`}
        </Text>
      ) : (
        <View style={styles.points}>
          {consentPoints.map((point) => (
            <View key={point.icon} style={styles.point}>
              <MaterialCommunityIcons color={theme.text.secondary} name={point.icon} size={18} />
              <Text style={styles.pointText}>{point.text}</Text>
            </View>
          ))}
        </View>
      )}

      {consentAt && status && status.refused > 0 ? (
        <Text style={styles.refused}>
          {`${plural(status.refused, 'foto não pôde', 'fotos não puderam')} subir e ${status.refused === 1 ? 'continua' : 'continuam'} só neste aparelho: o servidor aceita fotos JPEG ou PNG de até 5 MB.`}
        </Text>
      ) : null}

      <Button
        accessibilityLabel={consentAt ? 'Parar de guardar as fotos na conta e apagá-las de lá' : 'Guardar as fotos na conta'}
        loading={isSaving}
        onPress={consentAt ? askToRevoke : askToGrant}
        title={consentAt ? 'Parar e apagar da conta' : 'Guardar na conta'}
        variant={consentAt ? 'ghost' : 'outline'}
      />

      {error ? (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

// O resumo na Evolução: o estado das fotos numa linha e o caminho para o cartão inteiro, na tela Fotos.
export function PhotosBackupSummary() {
  const styles = useStyles();
  const { theme } = useTheme();
  const { consentAt, status } = usePhotoBackup();
  const title = consentAt ? 'Fotos guardadas na conta' : 'Fotos só neste aparelho';
  const line = status
    ? consentAt && status.serverWaiting && status.pending > 0
      ? 'O servidor ainda não guarda fotos: as suas seguem seguras aqui.'
      : statusLine(status, Boolean(consentAt))
    : null;

  return (
    <Pressable
      accessibilityHint="Abre as fotos, onde você escolhe se elas ficam na conta."
      accessibilityLabel={line ? `${title}. ${line}` : title}
      accessibilityRole="button"
      onPress={() => router.push('/(app)/corpo/fotos')}
      style={({ pressed }) => [styles.card, styles.summary, pressed ? styles.pressed : null]}>
      <View style={styles.iconWrap}>
        <MaterialCommunityIcons
          color={theme.accent.primary}
          name={consentAt ? 'cloud-check-outline' : 'cloud-lock-outline'}
          size={20}
        />
      </View>
      <View style={styles.headerText}>
        <Text style={styles.title}>{title}</Text>
        {line ? <Text style={styles.status}>{line}</Text> : null}
      </View>
      <Ionicons color={theme.text.muted} name="chevron-forward" size={18} />
    </Pressable>
  );
}

const useStyles = makeStyles((theme) => ({
  card: {
    backgroundColor: theme.bg.surface,
    borderColor: theme.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  summary: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: theme.accent.soft,
    borderRadius: radius.pill,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: theme.text.primary,
    fontFamily: fonts.extrabold,
    fontSize: 16,
  },
  status: {
    color: theme.text.muted,
    fontFamily: fonts.semibold,
    fontSize: 12,
  },
  counts: {
    color: theme.text.secondary,
    fontFamily: fonts.semibold,
    fontSize: 13,
  },
  notice: {
    alignItems: 'flex-start',
    backgroundColor: withAlpha(theme.status.info, 0.12),
    borderRadius: radius.sm,
    flexDirection: 'row',
    gap: 10,
    padding: 12,
  },
  noticeText: {
    color: theme.text.primary,
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 19,
  },
  text: {
    color: theme.text.secondary,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  points: {
    gap: 10,
  },
  point: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
  },
  pointText: {
    color: theme.text.secondary,
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  refused: {
    color: theme.text.secondary,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 19,
  },
  error: {
    color: theme.status.danger,
    fontFamily: fonts.semibold,
    fontSize: 13,
  },
  pressed: {
    opacity: 0.75,
  },
}));
