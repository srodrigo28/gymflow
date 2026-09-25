import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, Text, View } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { Screen } from '@/src/components/ui/Screen';
import { NUTRITION_DISCLAIMER } from '@/src/constants/eating-styles';
import { mealFeelingLabel, mealFeelings, mealTypeLabel, mealTypes } from '@/src/constants/meals';
import { useSession } from '@/src/contexts/session-context';
import {
  addMeal,
  adjustWaterGlasses,
  copyMeals,
  deleteMeal,
  getNutritionDay,
  getPreviousNutritionDays,
  MEAL_DESCRIPTION_MAX,
  WATER_GOAL,
} from '@/src/services/nutrition';
import { getOnboardingProfile } from '@/src/services/onboarding';
import { fonts, makeStyles, radius, typography, useTheme, withAlpha } from '@/src/theme';
import type { Meal, MealFeeling, MealType, NutritionDay } from '@/src/types/nutrition';
import { dayKey, dayLabel, weekdayDateLabel } from '@/src/utils/format';
import { defaultMealType, foodMonitoringSummary } from '@/src/utils/nutrition';

// "3 refeições · 6 copos de água", ou "Sem registro" para um dia em branco.
function daySummary(day: NutritionDay) {
  const meals = day.meals.length;
  const glasses = day.waterGlasses;

  if (!meals && !glasses) {
    return 'Sem registro';
  }

  return `${meals} ${meals === 1 ? 'refeição' : 'refeições'} · ${glasses} ${glasses === 1 ? 'copo' : 'copos'} de água`;
}

export default function AlimentacaoScreen() {
  const styles = useStyles();
  const { theme } = useTheme();
  const { session } = useSession();
  const userId = session?.user.id;
  const [today, setToday] = useState<NutritionDay | null>(null);
  const [history, setHistory] = useState<NutritionDay[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [type, setType] = useState<MealType>(() => defaultMealType());
  const [description, setDescription] = useState('');
  const [feeling, setFeeling] = useState<MealFeeling | undefined>();
  const [notice, setNotice] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    if (!userId) {
      return;
    }

    // A data é lida a cada foco: quem deixa a tela aberta de um dia para o outro vê o dia certo ao voltar.
    const date = dayKey();
    const [day, previous, profile] = await Promise.all([
      getNutritionDay(userId, date),
      getPreviousNutritionDays(userId, 7, date),
      getOnboardingProfile(userId),
    ]);

    setToday(day);
    setHistory(previous);
    setSummary(foodMonitoringSummary(profile));
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const yesterday = history[0];
  const canRepeatYesterday = Boolean(yesterday?.meals.length);
  const glasses = today?.waterGlasses ?? 0;
  const waterText =
    glasses >= WATER_GOAL ? `${glasses} copos · meta do dia feita` : `${glasses} de ${WATER_GOAL} copos`;

  async function handleAdd() {
    if (!userId || !today || !description.trim()) {
      return;
    }

    setIsSaving(true);
    setNotice(null);
    await addMeal(userId, { date: today.date, description, feeling, type });
    setDescription('');
    setFeeling(undefined);
    setIsSaving(false);
    await load();
  }

  async function handleDelete(meal: Meal) {
    if (!userId) {
      return;
    }

    await deleteMeal(userId, meal.id);
    await load();
  }

  async function handleRepeatYesterday() {
    if (!userId || !today || !yesterday) {
      return;
    }

    const copied = await copyMeals(userId, yesterday.date, today.date);
    setNotice(
      copied === 0
        ? 'As refeições de ontem já estão aqui.'
        : `${copied} ${copied === 1 ? 'refeição copiada' : 'refeições copiadas'} de ontem.`,
    );
    await load();
  }

  async function handleWater(delta: number) {
    if (!userId || !today) {
      return;
    }

    const total = await adjustWaterGlasses(userId, today.date, delta);
    // Vale o que ficou gravado: com toques rápidos as respostas chegam em ordem, e a última é a certa.
    setToday((current) => (current ? { ...current, waterGlasses: total } : current));
  }

  return (
    <Screen edges={['top', 'right', 'left']}>
      <KeyboardAvoidingView behavior="padding" style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
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
              Alimentações diárias
            </Text>
          </View>

          <Text style={styles.intro}>
            Anote o que comeu e a água do dia, do seu jeito. Sem contar calorias: é só para você enxergar a
            própria rotina.
          </Text>

          {summary ? <Text style={styles.summary}>{summary}</Text> : null}

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.sectionTitle}>Hoje</Text>
              {today ? <Text style={styles.cardDate}>{weekdayDateLabel(today.date)}</Text> : null}
            </View>

            {today?.meals.length ? (
              today.meals.map((meal) => (
                <View key={meal.id} style={styles.mealRow}>
                  <View style={styles.mealIcon}>
                    <MaterialCommunityIcons
                      color={theme.domain.alimentacao}
                      name={mealTypes.find((item) => item.value === meal.type)?.icon ?? 'food-outline'}
                      size={18}
                    />
                  </View>
                  <View style={styles.mealText}>
                    <Text style={styles.mealType}>
                      {mealTypeLabel(meal.type)}
                      {meal.feeling ? ` · ${mealFeelingLabel(meal.feeling).toLowerCase()}` : ''}
                    </Text>
                    <Text style={styles.mealDescription}>{meal.description}</Text>
                  </View>
                  <Pressable
                    accessibilityLabel={`Apagar ${mealTypeLabel(meal.type)}: ${meal.description}`}
                    accessibilityRole="button"
                    hitSlop={8}
                    onPress={() => handleDelete(meal)}
                    style={({ pressed }) => [styles.trashButton, pressed ? styles.pressed : null]}>
                    <Ionicons color={theme.text.muted} name="trash-outline" size={18} />
                  </Pressable>
                </View>
              ))
            ) : today ? (
              <Text style={styles.empty}>Nenhuma refeição registrada hoje.</Text>
            ) : null}

            <View style={styles.divider} />

            <View style={styles.waterRow}>
              <View style={styles.waterIcon}>
                <MaterialCommunityIcons color={theme.domain.agua} name="cup-water" size={20} />
              </View>
              <View style={styles.waterText}>
                <Text style={styles.waterTitle}>Água</Text>
                <Text accessibilityLiveRegion="polite" style={styles.waterCount}>
                  {waterText}
                </Text>
              </View>
              <Pressable
                accessibilityLabel="Tirar um copo de água"
                accessibilityRole="button"
                accessibilityState={{ disabled: glasses === 0 }}
                disabled={!today || glasses === 0}
                hitSlop={4}
                onPress={() => handleWater(-1)}
                style={({ pressed }) => [
                  styles.waterButton,
                  glasses === 0 ? styles.waterButtonDisabled : null,
                  pressed ? styles.pressed : null,
                ]}>
                <Ionicons color={theme.text.primary} name="remove" size={20} />
              </Pressable>
              <Pressable
                accessibilityLabel="Adicionar um copo de água"
                accessibilityRole="button"
                disabled={!today}
                hitSlop={4}
                onPress={() => handleWater(1)}
                style={({ pressed }) => [styles.waterButton, pressed ? styles.pressed : null]}>
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
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Nova refeição</Text>

            <Text style={styles.label}>Refeição</Text>
            <View accessibilityRole="radiogroup" style={styles.chips}>
              {mealTypes.map((item) => {
                const isSelected = item.value === type;

                return (
                  <Pressable
                    accessibilityLabel={item.label}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: isSelected }}
                    key={item.value}
                    onPress={() => setType(item.value)}
                    style={({ pressed }) => [
                      styles.chip,
                      isSelected ? styles.chipActive : null,
                      pressed ? styles.pressed : null,
                    ]}>
                    <MaterialCommunityIcons
                      color={isSelected ? theme.accent.onPrimary : theme.text.secondary}
                      name={item.icon}
                      size={16}
                    />
                    <Text style={[styles.chipText, isSelected ? styles.chipTextActive : null]}>{item.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Input
              autoCapitalize="sentences"
              label="O que comeu"
              maxLength={MEAL_DESCRIPTION_MAX}
              onChangeText={setDescription}
              onSubmitEditing={handleAdd}
              placeholder="Ex.: pão com ovo e café"
              returnKeyType="done"
              value={description}
            />

            <Text style={styles.label}>Como se sentiu (opcional)</Text>
            <View style={styles.chips}>
              {mealFeelings.map((item) => {
                const isSelected = item.value === feeling;

                return (
                  <Pressable
                    accessibilityLabel={item.label}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    key={item.value}
                    // Tocar de novo limpa: sentir algo não é obrigatório para registrar.
                    onPress={() => setFeeling(isSelected ? undefined : item.value)}
                    style={({ pressed }) => [
                      styles.chip,
                      isSelected ? styles.chipActive : null,
                      pressed ? styles.pressed : null,
                    ]}>
                    <Text style={[styles.chipText, isSelected ? styles.chipTextActive : null]}>{item.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Button disabled={!description.trim()} haptic loading={isSaving} onPress={handleAdd} title="Adicionar" />
            <Button
              disabled={!canRepeatYesterday}
              icon="copy-outline"
              onPress={handleRepeatYesterday}
              title="Repetir ontem"
              variant="outline"
            />
            {notice ? (
              <Text accessibilityLiveRegion="polite" style={styles.notice}>
                {notice}
              </Text>
            ) : null}
            {today && !canRepeatYesterday ? (
              <Text style={styles.hint}>Ontem não tem refeições para repetir.</Text>
            ) : null}
          </View>

          <Text style={styles.historyTitle}>Últimos 7 dias</Text>
          {history.map((day) => (
            <View
              accessibilityLabel={`${dayLabel(day.date)}: ${daySummary(day)}`}
              accessible
              key={day.date}
              style={styles.historyCard}>
              <Text style={styles.historyDay}>{dayLabel(day.date)}</Text>
              <Text style={styles.historyValues}>{daySummary(day)}</Text>
            </View>
          ))}

          <Text style={styles.footnote}>{NUTRITION_DISCLAIMER} O diário fica só neste aparelho.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const useStyles = makeStyles((theme) => ({
  flex: {
    flex: 1,
  },
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
  summary: {
    backgroundColor: withAlpha(theme.domain.alimentacao, 0.1),
    borderRadius: radius.md,
    color: theme.text.secondary,
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 19,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  card: {
    backgroundColor: theme.bg.surface,
    borderColor: theme.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: theme.text.primary,
    fontFamily: fonts.extrabold,
    fontSize: 16,
  },
  cardDate: {
    color: theme.text.muted,
    fontFamily: fonts.semibold,
    fontSize: 13,
  },
  mealRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  mealIcon: {
    alignItems: 'center',
    backgroundColor: withAlpha(theme.domain.alimentacao, 0.16),
    borderRadius: radius.sm,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  mealText: {
    flex: 1,
    gap: 2,
  },
  mealType: {
    color: theme.text.muted,
    fontFamily: fonts.semibold,
    fontSize: 12,
  },
  mealDescription: {
    color: theme.text.primary,
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 19,
  },
  trashButton: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  empty: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  divider: {
    backgroundColor: theme.border.subtle,
    height: 1,
  },
  waterRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  waterIcon: {
    alignItems: 'center',
    backgroundColor: withAlpha(theme.domain.agua, 0.16),
    borderRadius: radius.sm,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  waterText: {
    flex: 1,
    gap: 2,
  },
  waterTitle: {
    color: theme.text.primary,
    fontFamily: fonts.bold,
    fontSize: 14,
  },
  waterCount: {
    color: theme.text.secondary,
    fontFamily: fonts.regular,
    fontSize: 13,
  },
  waterButton: {
    alignItems: 'center',
    backgroundColor: theme.bg.raised,
    borderColor: theme.border.subtle,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  waterButtonDisabled: {
    opacity: 0.4,
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
  label: {
    color: theme.text.secondary,
    fontFamily: fonts.semibold,
    fontSize: 14,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    alignItems: 'center',
    backgroundColor: theme.bg.raised,
    borderColor: theme.border.subtle,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chipActive: {
    backgroundColor: theme.accent.primary,
    borderColor: theme.accent.primary,
  },
  chipText: {
    color: theme.text.primary,
    fontFamily: fonts.semibold,
    fontSize: 14,
  },
  chipTextActive: {
    color: theme.accent.onPrimary,
  },
  notice: {
    color: theme.accent.primary,
    fontFamily: fonts.semibold,
    fontSize: 13,
    textAlign: 'center',
  },
  hint: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 13,
    textAlign: 'center',
  },
  historyTitle: {
    color: theme.text.primary,
    fontFamily: fonts.extrabold,
    fontSize: 16,
    marginTop: 8,
  },
  historyCard: {
    alignItems: 'center',
    backgroundColor: theme.bg.surface,
    borderColor: theme.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  historyDay: {
    color: theme.text.primary,
    fontFamily: fonts.bold,
    fontSize: 14,
  },
  historyValues: {
    color: theme.text.secondary,
    flexShrink: 1,
    fontFamily: fonts.regular,
    fontSize: 13,
    textAlign: 'right',
  },
  footnote: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  pressed: {
    opacity: 0.75,
  },
}));
