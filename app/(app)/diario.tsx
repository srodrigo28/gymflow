import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ComponentProps } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { DailyLogConsentCard } from '@/src/components/daily/DailyLogConsentCard';
import { Screen } from '@/src/components/ui/Screen';
import { useSession } from '@/src/contexts/session-context';
import {
  adjustDailySleep,
  clearDailySleep,
  getDailyLogDay,
  onDailyLogSynced,
  setDailyMood,
  SLEEP_MAX_MINUTES,
  SLEEP_START_MINUTES,
  SLEEP_STEP_MINUTES,
  type DailyLogDay,
} from '@/src/services/daily-log';
import { GLASS_ML } from '@/src/services/daily-log-api';
import { adjustWaterGlasses, WATER_GOAL } from '@/src/services/nutrition';
import { fonts, makeStyles, radius, typography, useTheme, withAlpha } from '@/src/theme';
import type { Mood } from '@/src/types/daily-log';
import { dayKey, dayLabel, shiftDayKey, weekdayDateLabel } from '@/src/utils/format';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

// Hoje e os 6 dias anteriores: dá para completar a semana sem virar um diário retroativo sem fim.
const PAST_DAYS = 6;

const moods: { icon: IconName; label: string; value: Mood }[] = [
  { icon: 'emoticon-cry-outline', label: 'Muito mal', value: 1 },
  { icon: 'emoticon-sad-outline', label: 'Mal', value: 2 },
  { icon: 'emoticon-neutral-outline', label: 'Ok', value: 3 },
  { icon: 'emoticon-happy-outline', label: 'Bem', value: 4 },
  { icon: 'emoticon-excited-outline', label: 'Muito bem', value: 5 },
];

/** 450 → "7h30"; 420 → "7h". */
function sleepText(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  return rest ? `${hours}h${String(rest).padStart(2, '0')}` : `${hours}h`;
}

/** Para o leitor de tela: 450 → "7 horas e 30 minutos". */
function sleepSpoken(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const hoursText = `${hours} ${hours === 1 ? 'hora' : 'horas'}`;

  return rest ? `${hoursText} e ${rest} minutos` : hoursText;
}

// O mesmo texto da Alimentação: a água é uma só.
function waterText(glasses: number) {
  return glasses >= WATER_GOAL ? `${glasses} copos · meta do dia feita` : `${glasses} de ${WATER_GOAL} copos`;
}

export default function DiarioScreen() {
  const styles = useStyles();
  const { theme } = useTheme();
  const { session } = useSession();
  const userId = session?.user.id;
  // Sem consentimento, o cartão dele abre a tela: é a escolha que decide para onde o diário vai. Com o
  // consentimento, ele fica no fim, à mão para retirar. A posição vale enquanto a tela está aberta: quem
  // aceita aqui vê o mesmo cartão mudar e o diário subir, sem ele pular para o fim.
  const [consentCardOnTop] = useState(() => !session?.user.dailyLogConsentAt);
  // A data é lida a cada foco: quem deixa a tela aberta de um dia para o outro vê o dia certo ao voltar.
  const [today, setToday] = useState(() => dayKey());
  // 0 é hoje; 1 a 6, os dias anteriores.
  const [offset, setOffset] = useState(0);
  const [log, setLog] = useState<DailyLogDay | null>(null);
  // Só a resposta do último pedido vale: trocar de dia rápido não deixa um dia antigo por cima.
  const lastRequest = useRef(0);
  const day = shiftDayKey(today, -offset);
  // Enquanto o dia novo carrega, os botões esperam: os valores na tela ainda seriam do dia anterior.
  const current = log?.day === day ? log : null;
  const sleep = current?.sleepMinutes ?? null;
  const glasses = current?.waterGlasses ?? 0;
  const canLowerSleep = Boolean(current) && sleep !== null && sleep > 0;
  const canRaiseSleep = Boolean(current) && (sleep === null || sleep < SLEEP_MAX_MINUTES);
  const isComplete = current !== null && sleep !== null && glasses > 0 && current.mood !== null;

  const load = useCallback(async () => {
    if (!userId) {
      return;
    }

    lastRequest.current += 1;
    const request = lastRequest.current;
    const next = await getDailyLogDay(userId, day);

    if (request === lastRequest.current) {
      setLog(next);
    }
  }, [day, userId]);

  useFocusEffect(
    useCallback(() => {
      setToday(dayKey());
      void load();
    }, [load]),
  );

  // Num aparelho novo, o diário da conta pode chegar depois de a tela abrir.
  useEffect(() => onDailyLogSynced(() => void load()), [load]);

  // Cada escrita devolve o que ficou gravado; só entra na tela se ela ainda mostra o mesmo dia.
  function applyToDay(target: string, change: Partial<DailyLogDay>) {
    setLog((previous) => (previous?.day === target ? { ...previous, ...change } : previous));
  }

  async function changeSleep(delta: number) {
    if (!userId || !current) {
      return;
    }

    const target = current.day;
    applyToDay(target, { sleepMinutes: await adjustDailySleep(userId, target, delta) });
  }

  async function removeSleep() {
    if (!userId || !current) {
      return;
    }

    const target = current.day;
    await clearDailySleep(userId, target);
    applyToDay(target, { sleepMinutes: null });
  }

  async function changeWater(delta: number) {
    if (!userId || !current) {
      return;
    }

    const target = current.day;
    applyToDay(target, { waterGlasses: await adjustWaterGlasses(userId, target, delta) });
  }

  async function chooseMood(value: Mood) {
    if (!userId || !current) {
      return;
    }

    const target = current.day;
    // Tocar de novo no humor marcado limpa: registrar é sempre opcional.
    applyToDay(target, { mood: await setDailyMood(userId, target, current.mood === value ? null : value) });
  }

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
            Diário do dia
          </Text>
        </View>

        <Text style={styles.intro}>
          Sono, água e humor em menos de um minuto. Registre só o que quiser: nenhum item é obrigatório.
        </Text>

        {consentCardOnTop ? <DailyLogConsentCard /> : null}

        <View style={styles.dayNav}>
          <Pressable
            accessibilityLabel="Dia anterior"
            accessibilityRole="button"
            accessibilityState={{ disabled: offset >= PAST_DAYS }}
            disabled={offset >= PAST_DAYS}
            hitSlop={8}
            onPress={() => setOffset((value) => Math.min(value + 1, PAST_DAYS))}
            style={({ pressed }) => [
              styles.navButton,
              offset >= PAST_DAYS ? styles.disabled : null,
              pressed ? styles.pressed : null,
            ]}>
            <MaterialCommunityIcons color={theme.text.primary} name="chevron-left" size={24} />
          </Pressable>
          <View accessibilityLiveRegion="polite" style={styles.dayCenter}>
            <Text style={styles.dayName}>{dayLabel(day)}</Text>
            <Text style={styles.dayDate}>{offset <= 1 ? weekdayDateLabel(day) : `há ${offset} dias`}</Text>
          </View>
          <Pressable
            accessibilityLabel="Próximo dia"
            accessibilityRole="button"
            accessibilityState={{ disabled: offset === 0 }}
            disabled={offset === 0}
            hitSlop={8}
            onPress={() => setOffset((value) => Math.max(value - 1, 0))}
            style={({ pressed }) => [
              styles.navButton,
              offset === 0 ? styles.disabled : null,
              pressed ? styles.pressed : null,
            ]}>
            <MaterialCommunityIcons color={theme.text.primary} name="chevron-right" size={24} />
          </Pressable>
        </View>

        <View style={styles.card}>
          <View style={styles.itemHeader}>
            <View style={[styles.itemIcon, { backgroundColor: withAlpha(theme.domain.sono, 0.16) }]}>
              <MaterialCommunityIcons color={theme.domain.sono} name="power-sleep" size={20} />
            </View>
            <View style={styles.itemText}>
              <Text style={styles.itemTitle}>Sono</Text>
              <Text style={styles.itemHint}>Quanto você dormiu na noite anterior.</Text>
            </View>
            {sleep !== null ? (
              <Pressable
                accessibilityLabel="Limpar o sono deste dia"
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => void removeSleep()}
                style={({ pressed }) => [styles.clearButton, pressed ? styles.pressed : null]}>
                <Text style={styles.clearText}>Limpar</Text>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.stepper}>
            <Pressable
              accessibilityLabel={`Menos ${SLEEP_STEP_MINUTES} minutos de sono`}
              accessibilityRole="button"
              accessibilityState={{ disabled: !canLowerSleep }}
              disabled={!canLowerSleep}
              hitSlop={4}
              onPress={() => void changeSleep(-SLEEP_STEP_MINUTES)}
              style={({ pressed }) => [
                styles.stepButton,
                !canLowerSleep ? styles.disabled : null,
                pressed ? styles.pressed : null,
              ]}>
              <Ionicons color={theme.text.primary} name="remove" size={22} />
            </Pressable>
            <View
              accessibilityLabel={sleep !== null ? `Sono: ${sleepSpoken(sleep)}` : 'Sono sem registro'}
              accessibilityLiveRegion="polite"
              accessible
              style={styles.stepValue}>
              <Text style={[styles.stepValueText, sleep === null ? styles.stepValueEmpty : null]}>
                {sleep !== null ? sleepText(sleep) : 'Sem registro'}
              </Text>
            </View>
            <Pressable
              accessibilityLabel={
                sleep === null
                  ? `Registrar o sono, começando em ${sleepSpoken(SLEEP_START_MINUTES)}`
                  : `Mais ${SLEEP_STEP_MINUTES} minutos de sono`
              }
              accessibilityRole="button"
              accessibilityState={{ disabled: !canRaiseSleep }}
              disabled={!canRaiseSleep}
              hitSlop={4}
              onPress={() => void changeSleep(SLEEP_STEP_MINUTES)}
              style={({ pressed }) => [
                styles.stepButton,
                !canRaiseSleep ? styles.disabled : null,
                pressed ? styles.pressed : null,
              ]}>
              <Ionicons color={theme.text.primary} name="add" size={22} />
            </Pressable>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.itemHeader}>
            <View style={[styles.itemIcon, { backgroundColor: withAlpha(theme.domain.agua, 0.16) }]}>
              <MaterialCommunityIcons color={theme.domain.agua} name="cup-water" size={20} />
            </View>
            <View style={styles.itemText}>
              <Text style={styles.itemTitle}>Água</Text>
              <Text accessibilityLiveRegion="polite" style={styles.itemHint}>
                {waterText(glasses)}
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Tirar um copo de água"
              accessibilityRole="button"
              accessibilityState={{ disabled: !current || glasses === 0 }}
              disabled={!current || glasses === 0}
              hitSlop={4}
              onPress={() => void changeWater(-1)}
              style={({ pressed }) => [
                styles.stepButton,
                !current || glasses === 0 ? styles.disabled : null,
                pressed ? styles.pressed : null,
              ]}>
              <Ionicons color={theme.text.primary} name="remove" size={20} />
            </Pressable>
            <Pressable
              accessibilityLabel="Adicionar um copo de água"
              accessibilityRole="button"
              accessibilityState={{ disabled: !current }}
              disabled={!current}
              hitSlop={4}
              onPress={() => void changeWater(1)}
              style={({ pressed }) => [
                styles.stepButton,
                !current ? styles.disabled : null,
                pressed ? styles.pressed : null,
              ]}>
              <Ionicons color={theme.text.primary} name="add" size={20} />
            </Pressable>
          </View>
          {/* Só reforça o número acima; para o leitor de tela seria repetição. */}
          <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.waterDots}>
            {Array.from({ length: WATER_GOAL }, (_, index) => (
              <View
                key={index}
                style={[styles.waterDot, index < glasses ? { backgroundColor: theme.domain.agua } : null]}
              />
            ))}
          </View>
          <Text style={styles.caption}>Os mesmos copos da Alimentação, de {GLASS_ML} ml cada.</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.itemHeader}>
            <View style={[styles.itemIcon, { backgroundColor: withAlpha(theme.domain.mente, 0.16) }]}>
              <MaterialCommunityIcons color={theme.domain.mente} name="emoticon-outline" size={20} />
            </View>
            <View style={styles.itemText}>
              <Text style={styles.itemTitle}>Humor</Text>
              <Text style={styles.itemHint}>Como foi o dia, de modo geral. Tocar de novo limpa.</Text>
            </View>
          </View>

          <View accessibilityLabel="Humor do dia" accessibilityRole="radiogroup" style={styles.moods}>
            {moods.map((item) => {
              const isSelected = current?.mood === item.value;

              return (
                <Pressable
                  accessibilityLabel={item.label}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isSelected, disabled: !current }}
                  disabled={!current}
                  key={item.value}
                  onPress={() => void chooseMood(item.value)}
                  style={({ pressed }) => [
                    styles.mood,
                    isSelected
                      ? { backgroundColor: withAlpha(theme.domain.mente, 0.16), borderColor: theme.domain.mente }
                      : null,
                    pressed ? styles.pressed : null,
                  ]}>
                  <MaterialCommunityIcons
                    color={isSelected ? theme.domain.mente : theme.text.secondary}
                    name={item.icon}
                    size={28}
                  />
                  <Text numberOfLines={2} style={[styles.moodText, isSelected ? styles.moodTextActive : null]}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {isComplete ? (
          <View style={[styles.highlight, { backgroundColor: withAlpha(theme.status.success, 0.12) }]}>
            <MaterialCommunityIcons color={theme.status.success} name="check-circle" size={20} />
            <Text style={styles.highlightText}>Sono, água e humor registrados neste dia.</Text>
          </View>
        ) : null}

        <View style={styles.balance}>
          <MaterialCommunityIcons color={theme.text.muted} name="scale-balance" size={18} />
          <Text style={styles.balanceText}>
            O Equilíbrio da temporada conta os dias com treino e com sono, água e humor registrados.
          </Text>
        </View>

        {!consentCardOnTop ? <DailyLogConsentCard /> : null}
      </ScrollView>
    </Screen>
  );
}

const useStyles = makeStyles((theme) => ({
  content: {
    alignSelf: 'center',
    gap: 14,
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
  intro: {
    color: theme.text.secondary,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  dayNav: {
    alignItems: 'center',
    backgroundColor: theme.bg.surface,
    borderColor: theme.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    padding: 10,
  },
  navButton: {
    alignItems: 'center',
    backgroundColor: theme.bg.raised,
    borderRadius: radius.pill,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  dayCenter: {
    alignItems: 'center',
    flex: 1,
    gap: 2,
    justifyContent: 'center',
    minHeight: 44,
  },
  dayName: {
    color: theme.text.primary,
    fontFamily: fonts.extrabold,
    fontSize: 18,
    textAlign: 'center',
  },
  dayDate: {
    color: theme.text.muted,
    fontFamily: fonts.semibold,
    fontSize: 13,
    textAlign: 'center',
  },
  card: {
    backgroundColor: theme.bg.surface,
    borderColor: theme.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  itemHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  itemIcon: {
    alignItems: 'center',
    borderRadius: radius.sm,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  itemText: {
    flex: 1,
    gap: 2,
  },
  itemTitle: {
    color: theme.text.primary,
    fontFamily: fonts.bold,
    fontSize: 15,
  },
  itemHint: {
    color: theme.text.secondary,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  clearButton: {
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 8,
  },
  clearText: {
    color: theme.accent.primary,
    fontFamily: fonts.semibold,
    fontSize: 14,
  },
  stepper: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  stepButton: {
    alignItems: 'center',
    backgroundColor: theme.bg.raised,
    borderColor: theme.border.subtle,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  stepValue: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
  },
  stepValueText: {
    color: theme.text.primary,
    fontFamily: fonts.extrabold,
    fontSize: 28,
    fontVariant: ['tabular-nums'],
  },
  stepValueEmpty: {
    color: theme.text.muted,
    fontFamily: fonts.semibold,
    fontSize: 16,
  },
  waterDots: {
    flexDirection: 'row',
    gap: 6,
  },
  waterDot: {
    backgroundColor: theme.bg.high,
    borderRadius: radius.pill,
    flex: 1,
    height: 6,
  },
  caption: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  moods: {
    flexDirection: 'row',
    gap: 6,
  },
  mood: {
    alignItems: 'center',
    backgroundColor: theme.bg.raised,
    borderColor: theme.border.subtle,
    borderRadius: radius.sm,
    borderWidth: 1,
    flex: 1,
    gap: 4,
    justifyContent: 'center',
    minHeight: 76,
    paddingHorizontal: 2,
    paddingVertical: 8,
  },
  moodText: {
    color: theme.text.secondary,
    fontFamily: fonts.semibold,
    fontSize: 12,
    lineHeight: 15,
    textAlign: 'center',
  },
  moodTextActive: {
    color: theme.text.primary,
    fontFamily: fonts.bold,
  },
  highlight: {
    alignItems: 'center',
    borderRadius: radius.sm,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  highlightText: {
    color: theme.text.primary,
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: 14,
    lineHeight: 20,
  },
  balance: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 4,
  },
  balanceText: {
    color: theme.text.muted,
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  disabled: {
    opacity: 0.35,
  },
  pressed: {
    opacity: 0.75,
  },
}));
