import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState, type ComponentProps } from 'react';
import { Alert, Text, View } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { useSession } from '@/src/contexts/session-context';
import { countDailyLogDays, countPendingDailyLogs, onDailyLogQueued, onDailyLogSynced } from '@/src/services/daily-log';
import { fonts, makeStyles, radius, useTheme } from '@/src/theme';
import { formatShortDate } from '@/src/utils/format';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

// Consentimento específico e destacado, como a LGPD pede para dado de saúde: diz o que sobe, para quê,
// quem vê e como voltar atrás. É o molde do das medidas (MeasurementsBackupCard).
const CONSENT_TITLE = 'Guardar o diário na conta';
const CONSENT_TEXT =
  'Sono e humor são dados de saúde. Com o seu consentimento, o Gyn Flow guarda na sua conta um registro por dia com o sono, o humor e a água, para o diário voltar num aparelho novo e para contar os seus dias de Equilíbrio na temporada.\n\nO diário não vira XP e ninguém vê os seus registros. Seus amigos veem só quantos dias de Equilíbrio você teve no mês, e só se você ligar “Mostrar detalhes aos amigos” na temporada.\n\nVocê pode retirar o consentimento quando quiser: aí apagamos tudo do servidor na hora.';

// O mesmo, em partes curtas, no cartão: a pessoa lê antes de tocar em "Guardar na conta".
const consentPoints: { icon: IconName; text: string }[] = [
  { icon: 'heart-pulse', text: 'Sono e humor são dados de saúde: só saem daqui com o seu consentimento.' },
  {
    icon: 'cloud-upload-outline',
    text: 'Sobem o sono, o humor e a água de cada dia, para voltarem num aparelho novo e contarem no Equilíbrio da temporada.',
  },
  {
    icon: 'eye-off-outline',
    text: 'Não vira XP e ninguém vê os registros. Os amigos veem só a contagem de dias de Equilíbrio, e só se você ligar “Mostrar detalhes aos amigos”.',
  },
  { icon: 'delete-outline', text: 'Retirar o consentimento apaga tudo do servidor na hora.' },
];

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

export function DailyLogConsentCard() {
  const styles = useStyles();
  const { theme } = useTheme();
  const { session, setDailyLogConsent } = useSession();
  const userId = session?.user.id;
  const consentAt = session?.user.dailyLogConsentAt ?? null;
  // Com consentimento, os dias que ainda não subiram; sem, os que existem só neste aparelho.
  const [count, setCount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) {
      return;
    }

    setCount(await (consentAt ? countPendingDailyLogs(userId) : countDailyLogDays(userId)).catch(() => 0));
  }, [consentAt, userId]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  // Um toque no diário muda a contagem na hora; um envio ou um download, logo depois.
  useEffect(() => onDailyLogQueued(() => void refresh()), [refresh]);
  useEffect(() => onDailyLogSynced(() => void refresh()), [refresh]);

  async function apply(granted: boolean) {
    setIsSaving(true);
    setError(null);

    try {
      await setDailyLogConsent(granted);
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
      'Parar de guardar na conta',
      'Apagamos agora todo o seu diário do servidor, e os dias deixam de contar no Equilíbrio da temporada. O que está neste aparelho continua aqui.',
      [
        { style: 'cancel', text: 'Cancelar' },
        { onPress: () => void apply(false), style: 'destructive', text: 'Parar e apagar' },
      ],
    );
  }

  const status = consentAt
    ? count > 0
      ? `${plural(count, 'dia aguardando', 'dias aguardando')} envio.`
      : 'Tudo em dia com a conta.'
    : count > 0
      ? `${plural(count, 'dia registrado', 'dias registrados')} só aqui.`
      : 'Nenhum dia registrado ainda.';

  return (
    <View accessibilityLabel="Diário do dia na conta" style={styles.card}>
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
            {consentAt ? 'Diário guardado na conta' : 'Diário só neste aparelho'}
          </Text>
          <Text style={styles.status}>{status}</Text>
        </View>
      </View>

      {consentAt ? (
        <Text style={styles.text}>
          {`Desde ${formatShortDate(Date.parse(consentAt))}, o sono, o humor e a água de cada dia sobem para a sua conta e voltam num aparelho novo. Não vira XP e ninguém vê os registros: os amigos veem só a contagem de dias de Equilíbrio, se você mostrar detalhes na temporada.`}
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

      <Button
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

const useStyles = makeStyles((theme) => ({
  card: {
    backgroundColor: theme.bg.surface,
    borderColor: theme.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 12,
    padding: 16,
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
  error: {
    color: theme.status.danger,
    fontFamily: fonts.semibold,
    fontSize: 13,
  },
}));
