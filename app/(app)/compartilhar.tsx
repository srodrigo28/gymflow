import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';

import { SHARE_HEIGHT, SHARE_WIDTH, ShareCard, type ShareContent } from '@/src/components/share/ShareCard';
import { Button } from '@/src/components/ui/Button';
import { Screen } from '@/src/components/ui/Screen';
import { useSession } from '@/src/contexts/session-context';
import {
  countPersonalRecords,
  getPersonalRecord,
  getPeriodSummary,
  getTrainingStreak,
  listPersonalRecords,
} from '@/src/services/training';
import { fonts, makeStyles, radius, typography, useTheme } from '@/src/theme';
import { monthKey, muscleLabel, startOfMonth, startOfWeek } from '@/src/utils/format';
import { shareCardImage } from '@/src/utils/share-image';

type Tab = 'recorde' | 'semana' | 'sequencia' | 'mes';

// O troféu só vira opção quando a tela de conquistas manda um (parâmetros `trofeu*`); os cards de
// sempre continuam nas abas ao lado.
type Mode = Tab | 'trofeu';

const TABS: { key: Tab; label: string }[] = [
  { key: 'recorde', label: 'Recorde' },
  { key: 'semana', label: 'Semana' },
  { key: 'sequencia', label: 'Sequência' },
  { key: 'mes', label: 'Mês' },
];

const EMPTY: Record<Tab, string> = {
  mes: 'Ainda não há treinos neste mês.',
  recorde:
    'Você ainda não tem um recorde registrado. Conclua uma série com carga e repetições para o primeiro aparecer aqui.',
  semana: 'Ainda não há treinos nesta semana.',
  sequencia: 'A sequência começa na primeira semana com treino concluído.',
};

const MAX_WIDTH = 560;
const GUTTER = 20;

function isTab(value: unknown): value is Tab {
  return TABS.some((tab) => tab.key === value);
}

// Parâmetro de rota como texto limpo. Vazio conta como ausente; repetido chega como lista e vale o primeiro.
function textParam(value: string | string[] | undefined) {
  const text = Array.isArray(value) ? value[0] : value;

  return typeof text === 'string' && text.trim() ? text.trim() : null;
}

export default function CompartilharScreen() {
  const styles = useStyles();
  const { theme } = useTheme();
  const { session } = useSession();
  const { width } = useWindowDimensions();
  // `recordId` chega da sessão de treino, com o recorde recém-batido: o card é daquele, não do último.
  // `trofeuTitulo`, `trofeuDescricao` e `trofeuPeriodo` chegam das conquistas, com um troféu da conta.
  const params = useLocalSearchParams<{
    recordId?: string;
    tipo?: string;
    trofeuDescricao?: string;
    trofeuPeriodo?: string;
    trofeuTitulo?: string;
  }>();
  const trophyTitle = textParam(params.trofeuTitulo);
  const trophyDescription = textParam(params.trofeuDescricao);
  const trophyPeriod = textParam(params.trofeuPeriodo);
  const [tab, setTab] = useState<Mode>(trophyTitle ? 'trofeu' : isTab(params.tipo) ? params.tipo : 'recorde');
  const [contents, setContents] = useState<Partial<Record<Tab, ShareContent | null>>>({});
  const [loaded, setLoaded] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const cardRef = useRef<View>(null);
  // A prévia encolhe para caber na tela; a imagem exportada sai sempre com 360 × 450.
  const scale = Math.min(1, (Math.min(width, MAX_WIDTH) - GUTTER * 2) / SHARE_WIDTH);
  const recordId = params.recordId;
  const requestedTab = params.tipo;

  // A tela pode já estar aberta quando um link novo chega (deep link): a aba acompanha o parâmetro.
  // Um troféu pedido tem a vez sobre o tipo.
  useEffect(() => {
    if (trophyTitle) {
      setTab('trofeu');
    } else if (isTab(requestedTab)) {
      setTab(requestedTab);
    }
  }, [requestedTab, trophyTitle, trophyDescription, trophyPeriod]);

  useEffect(() => {
    void (async () => {
      const now = Date.now();
      const monthStart = startOfMonth();
      const [chosen, records, week, streak, month, monthPrs] = await Promise.all([
        recordId ? getPersonalRecord(recordId) : Promise.resolve(null),
        listPersonalRecords(1),
        getPeriodSummary(startOfWeek(), now),
        getTrainingStreak(),
        getPeriodSummary(monthStart, now),
        countPersonalRecords(monthStart, now),
      ]);
      const best = chosen ?? records[0];

      setContents({
        mes:
          month.sessionCount > 0
            ? {
                kind: 'mes',
                month: monthKey(),
                prCount: monthPrs,
                sessionCount: month.sessionCount,
                topMuscle: month.byMuscle[0] ? muscleLabel(month.byMuscle[0].muscle) : null,
                volumeKg: month.volumeKg,
              }
            : null,
        recorde: best ? { exercise: best.exercise, kind: 'recorde', reps: best.reps, weightKg: best.weightKg } : null,
        semana:
          week.sessionCount > 0
            ? { cardioMinutes: week.cardioMinutes, kind: 'semana', sessionCount: week.sessionCount, volumeKg: week.volumeKg }
            : null,
        sequencia: streak.weeks > 0 ? { daysThisWeek: streak.daysThisWeek, kind: 'sequencia', weeks: streak.weeks } : null,
      });
      setLoaded(true);
    })();
  }, [recordId]);

  const trophy: ShareContent | null = trophyTitle
    ? { description: trophyDescription ?? '', kind: 'trofeu', period: trophyPeriod, title: trophyTitle }
    : null;
  // Sem os parâmetros do troféu, a opção some e a tela volta para o card de recorde.
  const selected: Mode = tab === 'trofeu' && !trophy ? 'recorde' : tab;
  const tabs: { key: Mode; label: string }[] = trophy ? [{ key: 'trofeu', label: 'Troféu' }, ...TABS] : TABS;
  const content = selected === 'trofeu' ? trophy : (contents[selected] ?? null);
  const emptyText = selected === 'trofeu' ? null : EMPTY[selected];

  async function share() {
    if (!cardRef.current) {
      return;
    }

    setMessage(null);
    setIsSharing(true);

    try {
      const result = await shareCardImage(cardRef, 'gynflow-treino.png');

      if (result === 'unavailable') {
        setMessage('Este aparelho não oferece a opção de compartilhar.');
      } else if (result === 'downloaded') {
        setMessage('A imagem foi baixada: é só mandar pelo app que quiser.');
      }
    } catch {
      setMessage('Não foi possível gerar a imagem. Tente de novo.');
    } finally {
      setIsSharing(false);
    }
  }

  return (
    <Screen edges={['top', 'right', 'left']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Voltar"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(app)/treino'))}
            style={({ pressed }) => [styles.iconButton, pressed ? styles.pressed : null]}>
            <Ionicons color={theme.text.primary} name="arrow-back" size={20} />
          </Pressable>
          <Text accessibilityRole="header" style={styles.title}>
            Compartilhar
          </Text>
        </View>

        <View accessibilityRole="tablist" style={styles.tabs}>
          {tabs.map((item) => (
            <Pressable
              accessibilityRole="tab"
              aria-selected={selected === item.key}
              key={item.key}
              onPress={() => setTab(item.key)}
              style={({ pressed }) => [
                // Com o troféu são cinco abas: cada uma fica do tamanho do nome para "Sequência" caber.
                trophy ? styles.tabFit : styles.tab,
                selected === item.key ? styles.tabActive : null,
                pressed ? styles.pressed : null,
              ]}>
              <Text numberOfLines={1} style={[styles.tabText, selected === item.key ? styles.tabTextActive : null]}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {content ? (
          <>
            {/* A captura desenha o cartão de dentro no tamanho dele, sem a escala nem os
                cantos arredondados da prévia: a imagem sai como um retângulo cheio. */}
            <View style={[styles.preview, { height: SHARE_HEIGHT * scale, width: SHARE_WIDTH * scale }]}>
              <View style={{ transform: [{ scale }] }}>
                <View collapsable={false} ref={cardRef}>
                  <ShareCard content={content} name={session?.user.name} />
                </View>
              </View>
            </View>

            <Button
              accessibilityLabel="Compartilhar esta imagem"
              haptic
              icon="share-social"
              loading={isSharing}
              onPress={share}
              title="Compartilhar"
            />
          </>
        ) : loaded && emptyText ? (
          <Text style={styles.empty}>{emptyText}</Text>
        ) : null}

        {message ? <Text style={styles.message}>{message}</Text> : null}

        <Text style={styles.privacy}>
          A imagem é montada no seu aparelho. Ela só sai daqui quando você escolhe para onde enviar.
        </Text>
      </ScrollView>
    </Screen>
  );
}

const useStyles = makeStyles((theme) => ({
  content: {
    alignItems: 'center',
    alignSelf: 'center',
    gap: 14,
    maxWidth: MAX_WIDTH,
    paddingBottom: 40,
    paddingHorizontal: GUTTER,
    paddingTop: 12,
    width: '100%',
  },
  header: {
    alignItems: 'center',
    alignSelf: 'stretch',
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
  tabs: {
    alignSelf: 'stretch',
    backgroundColor: theme.bg.surface,
    borderRadius: radius.pill,
    flexDirection: 'row',
    padding: 4,
  },
  tab: {
    borderRadius: radius.pill,
    flex: 1,
    paddingHorizontal: 6,
    paddingVertical: 10,
  },
  tabFit: {
    borderRadius: radius.pill,
    flexGrow: 1,
    flexShrink: 1,
    paddingHorizontal: 6,
    paddingVertical: 10,
  },
  tabActive: {
    backgroundColor: theme.accent.primary,
  },
  tabText: {
    color: theme.text.secondary,
    fontFamily: fonts.semibold,
    fontSize: 13,
    textAlign: 'center',
  },
  tabTextActive: {
    color: theme.accent.onPrimary,
  },
  preview: {
    alignItems: 'center',
    borderRadius: radius.lg,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  empty: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  message: {
    color: theme.status.warning,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 19,
  },
  privacy: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
}));
