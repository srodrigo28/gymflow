import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { useSession } from '@/src/contexts/session-context';
import { countMeasurements } from '@/src/services/body';
import { countPendingMeasurements, onMeasurementsSynced } from '@/src/services/body-sync';
import { fonts, makeStyles, radius, useTheme } from '@/src/theme';
import { formatShortDate } from '@/src/utils/format';

// Consentimento específico e destacado, como a LGPD pede para dado de saúde: diz o que sobe, para
// quê, quem vê e como voltar atrás. As fotos têm o consentimento delas (PhotosBackupCard).
const CONSENT_TITLE = 'Guardar medidas na conta';
const CONSENT_TEXT =
  'Peso, gordura corporal e circunferências são dados de saúde. Com o seu consentimento, o Gyn Flow guarda essas medidas na sua conta, só para você recuperá-las em outro aparelho. Ninguém mais as vê.\n\nVocê pode retirar o consentimento quando quiser: aí apagamos tudo do servidor na hora. As fotos não entram aqui: elas têm um consentimento separado.';

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

export function MeasurementsBackupCard() {
  const styles = useStyles();
  const { theme } = useTheme();
  const { session, setBodyDataConsent } = useSession();
  const consentAt = session?.user.bodyDataConsentAt ?? null;
  // Com consentimento, o que ainda não subiu; sem, o que existe só neste aparelho.
  const [count, setCount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setCount(await (consentAt ? countPendingMeasurements() : countMeasurements()).catch(() => 0));
  }, [consentAt]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  useEffect(() => onMeasurementsSynced(() => void refresh()), [refresh]);

  async function apply(granted: boolean) {
    setIsSaving(true);
    setError(null);

    try {
      await setBodyDataConsent(granted);
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
      'Apagamos agora todas as suas medidas do servidor. As deste aparelho continuam aqui.',
      [
        { style: 'cancel', text: 'Cancelar' },
        { onPress: () => void apply(false), style: 'destructive', text: 'Parar e apagar' },
      ],
    );
  }

  const status = consentAt
    ? count > 0
      ? `${plural(count, 'medida aguardando', 'medidas aguardando')} envio.`
      : 'Tudo em dia com a conta.'
    : count > 0
      ? `${plural(count, 'medida guardada', 'medidas guardadas')} só aqui.`
      : 'Nenhuma medida registrada ainda.';

  return (
    <View accessibilityLabel="Medidas na conta" style={styles.card}>
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
            {consentAt ? 'Medidas guardadas na conta' : 'Medidas só neste aparelho'}
          </Text>
          {status ? <Text style={styles.status}>{status}</Text> : null}
        </View>
      </View>

      <Text style={styles.text}>
        {consentAt
          ? `Desde ${formatShortDate(Date.parse(consentAt))}, suas medidas sobem para a sua conta e voltam num aparelho novo. As fotos têm um consentimento separado.`
          : 'Peso e medidas são dados de saúde: só saem daqui com o seu consentimento. Guardá-las na conta evita perder o histórico ao trocar de celular.'}
      </Text>

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
  error: {
    color: theme.status.danger,
    fontFamily: fonts.semibold,
    fontSize: 13,
  },
}));
