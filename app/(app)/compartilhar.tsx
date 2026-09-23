import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { SHARE_HEIGHT, SHARE_WIDTH, ShareCard, type ShareContent } from '@/src/components/share/ShareCard';
import { Button } from '@/src/components/ui/Button';
import { Screen } from '@/src/components/ui/Screen';
import { useSession } from '@/src/contexts/session-context';
import { getPeriodSummary, listPersonalRecords } from '@/src/services/training';
import { fonts, makeStyles, radius, typography, useTheme } from '@/src/theme';
import { startOfWeek } from '@/src/utils/format';

type Tab = 'recorde' | 'semana';

const MAX_WIDTH = 560;
const GUTTER = 20;

export default function CompartilharScreen() {
  const styles = useStyles();
  const { theme } = useTheme();
  const { session } = useSession();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ tipo?: Tab }>();
  const [tab, setTab] = useState<Tab>(params.tipo === 'semana' ? 'semana' : 'recorde');
  const [record, setRecord] = useState<ShareContent | null>(null);
  const [week, setWeek] = useState<ShareContent | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const cardRef = useRef<View>(null);
  // A prévia encolhe para caber na tela; a imagem exportada sai sempre com 360 × 450.
  const scale = Math.min(1, (Math.min(width, MAX_WIDTH) - GUTTER * 2) / SHARE_WIDTH);

  useEffect(() => {
    void (async () => {
      const [records, summary] = await Promise.all([
        listPersonalRecords(1),
        getPeriodSummary(startOfWeek(), Date.now()),
      ]);

      const best = records[0];
      setRecord(
        best
          ? { exercise: best.exercise, kind: 'recorde', reps: best.reps, weightKg: best.weightKg }
          : null,
      );
      setWeek(
        summary.sessionCount > 0
          ? {
              cardioMinutes: summary.cardioMinutes,
              kind: 'semana',
              sessionCount: summary.sessionCount,
              volumeKg: summary.volumeKg,
            }
          : null,
      );
      setLoaded(true);
    })();
  }, []);

  const content = tab === 'recorde' ? record : week;

  async function share() {
    if (!cardRef.current) {
      return;
    }

    if (!(await Sharing.isAvailableAsync())) {
      setMessage('Este aparelho não oferece a opção de compartilhar.');
      return;
    }

    setMessage(null);
    setIsSharing(true);

    try {
      // Gera a imagem no aparelho. Só o app escolhido na folha de compartilhamento
      // recebe o arquivo — nada é publicado por conta própria.
      const uri = await captureRef(cardRef, { format: 'png', quality: 1, result: 'tmpfile' });
      await Sharing.shareAsync(uri, { UTI: 'public.png', mimeType: 'image/png' });
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
          {(['recorde', 'semana'] as Tab[]).map((item) => (
            <Pressable
              accessibilityRole="tab"
              aria-selected={tab === item}
              key={item}
              onPress={() => setTab(item)}
              style={({ pressed }) => [
                styles.tab,
                tab === item ? styles.tabActive : null,
                pressed ? styles.pressed : null,
              ]}>
              <Text style={[styles.tabText, tab === item ? styles.tabTextActive : null]}>
                {item === 'recorde' ? 'Recorde' : 'Semana'}
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
        ) : loaded ? (
          <Text style={styles.empty}>
            {tab === 'recorde'
              ? 'Você ainda não tem um recorde registrado. Conclua uma série com carga e repetições para o primeiro aparecer aqui.'
              : 'Ainda não há treinos nesta semana.'}
          </Text>
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
    paddingVertical: 10,
  },
  tabActive: {
    backgroundColor: theme.accent.primary,
  },
  tabText: {
    color: theme.text.secondary,
    fontFamily: fonts.semibold,
    fontSize: 14,
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
