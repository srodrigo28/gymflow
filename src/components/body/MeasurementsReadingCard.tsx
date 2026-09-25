import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { type ComponentProps, useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { useSession } from '@/src/contexts/session-context';
import { getAiStatus, getMeasurementsReading } from '@/src/services/ai';
import { ApiError } from '@/src/services/api';
import { onMeasurementsSynced } from '@/src/services/body-sync';
import { fonts, makeStyles, radius, useTheme, withAlpha } from '@/src/theme';
import type { AiMeasurementsReading } from '@/src/types/ai';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

// O que a tela guarda da resposta, com a conta de quem pediu: trocar de conta esconde a leitura da anterior.
type Loaded =
  | { kind: 'reading'; reading: AiMeasurementsReading; token: string }
  // Ainda não há o que ler (menos de duas medidas na conta): a mensagem vem pronta do servidor.
  | { kind: 'empty'; message: string; token: string }
  | { kind: 'limit'; message: string; token: string };

// A tendência em palavras e sem cor de certo ou errado: é contexto, nunca nota.
const trends: Record<AiMeasurementsReading['trend'], { icon: IconName; label: string }> = {
  descendo: { icon: 'trending-down', label: 'descendo' },
  estavel: { icon: 'trending-neutral', label: 'estável' },
  sem_dados: { icon: 'dots-horizontal', label: 'ainda sem dados' },
  subindo: { icon: 'trending-up', label: 'subindo' },
};

// Quanto esperar antes de mostrar "lendo": sem a IA ligada, o servidor responde na hora (503), e o cartão
// não pode piscar na tela de quem nem vai vê-lo.
const SLOW_MS = 800;

/**
 * "Leitura das medidas", na Evolução (Fase 6): o que a IA lê das medidas guardadas na conta, com a
 * tendência em palavras e algumas observações. Precisa da IA ligada no servidor e de dois consentimentos, o
 * da IA e o das medidas; faltando algum, fica um atalho discreto que diz o que falta. Sem a chave (503), sem
 * internet ou com a leitura recusada pelas regras do servidor, fica em silêncio.
 */
export function MeasurementsReadingCard() {
  const { session } = useSession();
  const token = session?.token;
  const hasAiConsent = Boolean(session?.user.aiConsentAt);
  const hasBodyConsent = Boolean(session?.user.bodyDataConsentAt);
  const ready = hasAiConsent && hasBodyConsent;
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [isSlow, setIsSlow] = useState(false);
  // Se a IA está ligada no servidor, só para decidir o atalho. Uma pergunta por conta enquanto a tela existe.
  const [aiOn, setAiOn] = useState<{ token: string; value: boolean } | null>(null);
  const askedStatus = useRef<string | null>(null);
  // Um pedido de leitura de cada vez: a primeira do dia é gerada na hora, e gerar custa.
  const pending = useRef(false);
  const slowTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(slowTimer.current), []);

  const requestReading = useCallback(() => {
    if (!token || !ready || pending.current) {
      return;
    }

    pending.current = true;
    slowTimer.current = setTimeout(() => setIsSlow(true), SLOW_MS);

    void getMeasurementsReading(token)
      .then(
        (response): Loaded | null => {
          if (response.status === 'ok' && response.content) {
            return { kind: 'reading', reading: response.content, token };
          }

          // Recusada pelas regras do servidor: nada aparece, e a Evolução segue como sempre.
          return response.status === 'empty'
            ? { kind: 'empty', message: response.message || 'Ainda não há medidas suficientes na conta.', token }
            : null;
        },
        // Só o limite (429) tem o que dizer. O resto (503, 403, sem internet) fica em silêncio.
        (reason: unknown): Loaded | null =>
          reason instanceof ApiError && reason.status === 429 ? { kind: 'limit', message: reason.message, token } : null,
      )
      .then((next) => {
        pending.current = false;
        clearTimeout(slowTimer.current);
        setIsSlow(false);
        setLoaded(next);
      });
  }, [ready, token]);

  useFocusEffect(
    useCallback(() => {
      if (!token) {
        return;
      }

      if (ready) {
        requestReading();
        return;
      }

      // Sem os dois consentimentos não há leitura para pedir. O atalho só aparece com a IA ligada no
      // servidor: sem ela, nada sobre a IA aparece.
      if (askedStatus.current === token) {
        return;
      }

      askedStatus.current = token;

      void getAiStatus(token).then(
        (status) => setAiOn({ token, value: status.configured }),
        () => {
          // Sem resposta: pergunta de novo no próximo foco.
          askedStatus.current = null;
        },
      );
    }, [ready, requestReading, token]),
  );

  // Logo depois do consentimento das medidas, elas ainda estão subindo e a conta parece vazia. Quando
  // chegam, a leitura sai.
  const isEmpty = loaded?.kind === 'empty';

  useEffect(() => (isEmpty ? onMeasurementsSynced(() => requestReading()) : undefined), [isEmpty, requestReading]);

  if (!token) {
    return null;
  }

  if (!ready) {
    return aiOn?.token === token && aiOn.value ? (
      <ConsentShortcut hasAiConsent={hasAiConsent} hasBodyConsent={hasBodyConsent} />
    ) : null;
  }

  const current = loaded?.token === token ? loaded : null;

  if (current?.kind === 'reading') {
    return <ReadingView reading={current.reading} />;
  }

  if (isSlow) {
    return <LoadingView />;
  }

  if (current?.kind === 'empty') {
    return <MessageView message={current.message} />;
  }

  return current?.kind === 'limit' ? <LimitNote message={current.message} /> : null;
}

function CardHeader() {
  const styles = useStyles();
  const { theme } = useTheme();

  return (
    <View style={styles.header}>
      <View style={[styles.icon, { backgroundColor: withAlpha(theme.domain.conquista, 0.16) }]}>
        <MaterialCommunityIcons color={theme.domain.conquista} name="creation" size={20} />
      </View>
      <Text accessibilityRole="header" style={styles.title}>
        Leitura das medidas
      </Text>
    </View>
  );
}

function ReadingView({ reading }: { reading: AiMeasurementsReading }) {
  const styles = useStyles();
  const { theme } = useTheme();
  // Uma tendência que esta versão do app não conhece vira "ainda sem dados", em vez de quebrar a tela.
  const trend = trends[reading.trend] ?? trends.sem_dados;

  return (
    <View style={styles.card}>
      <CardHeader />

      <View accessibilityLabel={`Tendência das medidas: ${trend.label}`} accessible style={styles.trend}>
        <MaterialCommunityIcons color={theme.text.secondary} name={trend.icon} size={16} />
        <Text style={styles.trendText}>Tendência: {trend.label}</Text>
      </View>

      <Text style={styles.text}>{reading.text}</Text>

      {reading.notes.length ? (
        <View style={styles.notes}>
          {reading.notes.map((note, index) => (
            <View key={`${index}-${note}`} style={styles.note}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.noteText}>{note}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <Text style={styles.footnote}>
        Leitura da IA sobre as medidas guardadas na sua conta, conferida pelas regras do Gyn Flow. É contexto para
        você, não uma nota.
      </Text>
    </View>
  );
}

function LoadingView() {
  const styles = useStyles();
  const { theme } = useTheme();

  return (
    <View accessibilityState={{ busy: true }} style={styles.card}>
      <CardHeader />
      <View style={styles.loading}>
        <ActivityIndicator color={theme.text.muted} size="small" />
        <Text style={styles.message}>Lendo as suas medidas. A primeira leitura do dia leva alguns segundos.</Text>
      </View>
    </View>
  );
}

function MessageView({ message }: { message: string }) {
  const styles = useStyles();

  return (
    <View style={styles.card}>
      <CardHeader />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

// O limite (o teto do mês da IA ou pedidos demais) numa linha discreta, com a mensagem pronta do servidor.
function LimitNote({ message }: { message: string }) {
  const styles = useStyles();
  const { theme } = useTheme();

  return (
    <View accessibilityLabel={message} accessible style={styles.limit}>
      <Ionicons color={theme.text.muted} name="information-circle-outline" size={16} style={styles.alignIcon} />
      <Text style={styles.limitText}>{message}</Text>
    </View>
  );
}

// Falta consentimento: um atalho discreto que diz qual. O da IA fica em Recomendações; o das medidas, no
// cartão das medidas na conta, mais abaixo nesta mesma tela.
function ConsentShortcut({ hasAiConsent, hasBodyConsent }: { hasAiConsent: boolean; hasBodyConsent: boolean }) {
  const styles = useStyles();
  const { theme } = useTheme();
  const text = hasAiConsent
    ? 'A leitura das medidas com IA precisa de dois consentimentos. O da IA você já deu; falta guardar as medidas na conta, no botão Guardar na conta, mais abaixo.'
    : hasBodyConsent
      ? 'A leitura das medidas com IA precisa de dois consentimentos. O das medidas você já deu; falta o das recomendações com IA, em Recomendações.'
      : 'A leitura das medidas com IA precisa de dois consentimentos: o das recomendações com IA, em Recomendações, e o de guardar as medidas na conta, mais abaixo nesta tela.';

  const body = (
    <>
      <MaterialCommunityIcons color={theme.text.muted} name="creation" size={18} style={styles.alignIcon} />
      <View style={styles.flex}>
        <Text style={styles.shortcutText}>{text}</Text>
        {hasAiConsent ? null : <Text style={styles.shortcutLink}>Abrir Recomendações</Text>}
      </View>
      {hasAiConsent ? null : (
        <Ionicons color={theme.text.muted} name="chevron-forward" size={18} style={styles.chevron} />
      )}
    </>
  );

  // Só falta o das medidas: ele fica nesta mesma tela, então o aviso não leva a outro lugar.
  if (hasAiConsent) {
    return (
      <View accessibilityLabel={text} accessible style={styles.shortcut}>
        {body}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityHint="Abre Recomendações, onde fica o consentimento da IA"
      accessibilityLabel={text}
      accessibilityRole="button"
      onPress={() => router.push('/(app)/recomendacoes')}
      style={({ pressed }) => [styles.shortcut, pressed ? styles.pressed : null]}>
      {body}
    </Pressable>
  );
}

const useStyles = makeStyles((theme) => ({
  card: {
    backgroundColor: theme.bg.surface,
    borderColor: theme.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 10,
    padding: 16,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  icon: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  title: {
    color: theme.text.primary,
    flex: 1,
    fontFamily: fonts.extrabold,
    fontSize: 16,
  },
  flex: {
    flex: 1,
    gap: 4,
  },
  trend: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: theme.bg.raised,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  trendText: {
    color: theme.text.secondary,
    fontFamily: fonts.bold,
    fontSize: 12,
  },
  text: {
    color: theme.text.primary,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 21,
  },
  notes: {
    gap: 6,
  },
  note: {
    flexDirection: 'row',
    gap: 8,
  },
  bullet: {
    color: theme.text.muted,
    fontFamily: fonts.bold,
    fontSize: 14,
    lineHeight: 20,
  },
  noteText: {
    color: theme.text.secondary,
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 20,
  },
  footnote: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 17,
  },
  loading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  message: {
    color: theme.text.secondary,
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  limit: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 2,
  },
  // Alinha o ícone com a primeira linha do texto ao lado.
  alignIcon: {
    marginTop: 1,
  },
  limitText: {
    color: theme.text.muted,
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  shortcut: {
    alignItems: 'flex-start',
    borderColor: theme.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  shortcutText: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  shortcutLink: {
    color: theme.accent.primary,
    fontFamily: fonts.bold,
    fontSize: 13,
  },
  chevron: {
    alignSelf: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
}));
