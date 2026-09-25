import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState, type ComponentProps } from 'react';
import { Alert, Platform, Pressable, Text, View } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { useSession } from '@/src/contexts/session-context';
import { openLegalPage } from '@/src/services/legal';
import { fonts, makeStyles, radius, useTheme } from '@/src/theme';
import { formatShortDate } from '@/src/utils/format';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

// Consentimento específico e destacado para as recomendações com IA, no molde dos outros cartões
// (MeasurementsBackupCard, DailyLogConsentCard): diz o que vai para a IA e o que nunca vai, quem processa e
// por quanto tempo guarda, o que as regras garantem, o teto do mês e como voltar atrás. Os limites e prazos
// são os da API e da Política de Privacidade (a página da Anthropic foi lida em 25/09/2026).
const CONSENT_TITLE = 'Ligar as recomendações com IA';
const CONSENT_TEXT =
  'A IA (Claude, da Anthropic) sugere um plano para a sua semana e um resumo do seu mês, e explica o porquê. Regras do Gyn Flow conferem cada resposta e descartam a que sair dos limites: aí você segue com as recomendações por regras.\n\nPara a IA vão só dados agregados de treino: exercícios, séries, cargas, meta, agenda e as suas escolhas de treino. O questionário e as medidas vão só se você já os guarda na conta. Nunca vão o seu nome, o seu e-mail ou as suas fotos.\n\nA Anthropic (Estados Unidos) processa esses dados como operadora, numa transferência internacional. Pela página oficial dela, lida em 25/09/2026, as entradas e saídas são apagadas em até 30 dias (com exceções, explicadas na Política de Privacidade) e, por padrão, não treinam modelos.\n\nHá um teto de custo por mês: passou dele, a IA descansa até o mês virar. Você pode retirar o consentimento quando quiser, e aí apagamos o que a IA gerou para você.';

const REVOKE_TITLE = 'Retirar o consentimento da IA';
const REVOKE_TEXT =
  'Apagamos agora os planos e resumos que a IA gerou para você e as escolhas de treino mandadas para ela. As recomendações por regras continuam, e você pode ligar a IA de novo quando quiser.';

// O mesmo, em partes curtas, no cartão: a pessoa lê antes de tocar em "Aceitar e ligar a IA".
const consentPoints: { icon: IconName; text: string }[] = [
  {
    icon: 'creation-outline',
    text: 'A IA (Claude, da Anthropic) sugere um plano para a sua semana e um resumo do seu mês, e explica o porquê de cada sugestão.',
  },
  {
    icon: 'shield-check-outline',
    text: 'Regras do app conferem cada resposta: só exercícios do catálogo, carga só com histórico e no máximo 10% ou 5 kg acima da sua melhor marca recente, dias dentro da sua meta e nada de dieta, remédio, suplemento ou meta de peso. A resposta que quebrar uma regra é descartada, e você segue com as recomendações por regras.',
  },
  {
    icon: 'upload-outline',
    text: 'Vão para a IA só dados agregados de treino: exercícios, séries, cargas, meta, agenda e as suas escolhas de treino. O questionário e as medidas vão só se você já os guarda na conta, com os consentimentos deles.',
  },
  { icon: 'eye-off-outline', text: 'Nunca vão o seu nome, o seu e-mail ou as suas fotos.' },
  {
    icon: 'earth',
    text: 'A Anthropic (Estados Unidos) processa esses dados como operadora, numa transferência internacional. Pela página oficial dela, as entradas e saídas são apagadas em até 30 dias e, por padrão, não treinam modelos.',
  },
  {
    icon: 'speedometer',
    text: 'A IA tem um custo, pago pelo Gyn Flow e sem cobrança para você, com um teto por mês. Passou dele, a IA descansa até o mês virar, e as recomendações por regras continuam.',
  },
  { icon: 'delete-outline', text: 'Retirar o consentimento apaga tudo o que a IA gerou para você.' },
];

type Confirmation = {
  action: string;
  cancel: string;
  destructive?: boolean;
  message: string;
  onConfirm: () => void;
  title: string;
};

// No navegador o Alert do React Native não aparece; lá vale a confirmação do próprio navegador.
function askToConfirm({ action, cancel, destructive = false, message, onConfirm, title }: Confirmation) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }

    return;
  }

  Alert.alert(title, message, [
    { style: 'cancel', text: cancel },
    { onPress: onConfirm, style: destructive ? 'destructive' : 'default', text: action },
  ]);
}

// O consentimento vive na sessão: ao aceitar, a tela de Recomendações pede o plano e o resumo; ao retirar,
// o servidor já apagou o que a IA gerou.
export function AiConsentCard() {
  const styles = useStyles();
  const { theme } = useTheme();
  const { session, setAiConsent } = useSession();
  const consentAt = session?.user.aiConsentAt ?? null;
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function apply(granted: boolean) {
    setIsSaving(true);
    setError(null);

    try {
      await setAiConsent(granted);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível salvar sua escolha.');
    } finally {
      setIsSaving(false);
    }
  }

  function askToGrant() {
    askToConfirm({
      action: 'Aceito e quero ligar',
      cancel: 'Agora não',
      message: CONSENT_TEXT,
      onConfirm: () => void apply(true),
      title: CONSENT_TITLE,
    });
  }

  function askToRevoke() {
    askToConfirm({
      action: 'Retirar e apagar',
      cancel: 'Cancelar',
      destructive: true,
      message: REVOKE_TEXT,
      onConfirm: () => void apply(false),
      title: REVOKE_TITLE,
    });
  }

  return (
    <View accessibilityLabel="Recomendações com IA" style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons
            color={theme.accent.primary}
            name={consentAt ? 'creation' : 'creation-outline'}
            size={20}
          />
        </View>
        <View style={styles.headerText}>
          <Text accessibilityRole="header" style={styles.title}>
            Recomendações com IA
          </Text>
          <Text style={styles.status}>
            {consentAt
              ? `Consentimento dado em ${formatShortDate(Date.parse(consentAt))}.`
              : 'Opcional: só liga com o seu consentimento.'}
          </Text>
        </View>
      </View>

      {consentAt ? (
        <Text style={styles.text}>
          O plano da semana e o resumo do mês vêm da IA (Claude, da Anthropic) e passam pelas regras do app antes
          de chegar aqui. Para ela vão só dados agregados de treino, e o questionário e as medidas se você os guarda
          na conta; nunca o seu nome, o seu e-mail ou as suas fotos. Retirar o consentimento apaga o que a IA gerou.
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

      <Pressable
        accessibilityHint="Abre a Política de Privacidade no navegador"
        accessibilityRole="link"
        hitSlop={8}
        onPress={() => void openLegalPage('privacidade')}
        style={({ pressed }) => [styles.link, pressed ? styles.pressed : null]}>
        <Text style={styles.linkText}>Detalhes na Política de Privacidade</Text>
      </Pressable>

      <Button
        accessibilityLabel={
          consentAt ? 'Retirar o consentimento da IA e apagar o que ela gerou' : 'Aceitar e ligar as recomendações com IA'
        }
        loading={isSaving}
        onPress={consentAt ? askToRevoke : askToGrant}
        title={consentAt ? 'Retirar o consentimento' : 'Aceitar e ligar a IA'}
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
  link: {
    alignSelf: 'flex-start',
  },
  linkText: {
    color: theme.accent.primary,
    fontFamily: fonts.semibold,
    fontSize: 13,
    textDecorationLine: 'underline',
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
