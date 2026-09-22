import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, Text, View } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { Screen } from '@/src/components/ui/Screen';
import { deleteMeasurement, listMeasurements, saveMeasurement } from '@/src/services/body';
import { fonts, makeStyles, radius, typography, useTheme } from '@/src/theme';
import type { Measurement, MeasurementField } from '@/src/types/body';
import { formatShortDate } from '@/src/utils/format';

type FieldSpec = {
  helper?: string;
  icon: keyof typeof Ionicons.glyphMap;
  key: MeasurementField;
  label: string;
  unit: string;
};

// Peso primeiro porque é o que quase todo mundo registra. O resto é opcional e
// pode ficar vazio sem impedir o salvamento.
const fields: FieldSpec[] = [
  { helper: 'De manhã, em jejum, dá a leitura mais estável.', icon: 'speedometer-outline', key: 'weightKg', label: 'Peso', unit: 'kg' },
  { icon: 'pie-chart-outline', key: 'bodyFatPct', label: 'Gordura corporal', unit: '%' },
  { helper: 'Meça na altura do umbigo, sem prender a barriga.', icon: 'ellipse-outline', key: 'waistCm', label: 'Cintura', unit: 'cm' },
  { icon: 'ellipse-outline', key: 'hipCm', label: 'Quadril', unit: 'cm' },
  { icon: 'body-outline', key: 'chestCm', label: 'Peito', unit: 'cm' },
  { icon: 'barbell-outline', key: 'armCm', label: 'Braço', unit: 'cm' },
  { icon: 'walk-outline', key: 'thighCm', label: 'Coxa', unit: 'cm' },
];

const summaryFields: { key: MeasurementField; label: string; unit: string }[] = [
  { key: 'weightKg', label: 'peso', unit: 'kg' },
  { key: 'bodyFatPct', label: 'gordura', unit: '%' },
  { key: 'waistCm', label: 'cintura', unit: 'cm' },
  { key: 'hipCm', label: 'quadril', unit: 'cm' },
  { key: 'chestCm', label: 'peito', unit: 'cm' },
  { key: 'armCm', label: 'braço', unit: 'cm' },
  { key: 'thighCm', label: 'coxa', unit: 'cm' },
];

export default function MedidasScreen() {
  const styles = useStyles();
  const { theme } = useTheme();
  const [values, setValues] = useState<Partial<Record<MeasurementField, string>>>({});
  const [history, setHistory] = useState<Measurement[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    setHistory(await listMeasurements(20));
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const parsed = Object.fromEntries(
    Object.entries(values)
      .map(([key, text]) => [key, Number((text ?? '').replace(',', '.'))])
      .filter(([, value]) => Number.isFinite(value) && (value as number) > 0),
  ) as Partial<Record<MeasurementField, number>>;
  const canSave = Object.keys(parsed).length > 0;

  async function handleSave() {
    if (!canSave) {
      return;
    }

    setIsSaving(true);
    await saveMeasurement({ ...parsed, takenAt: Date.now() });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setValues({});
    setIsSaving(false);
    await load();
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
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/(app)/corpo'))}
              style={({ pressed }) => [styles.iconButton, pressed ? styles.pressed : null]}>
              <Ionicons color={theme.text.primary} name="arrow-back" size={20} />
            </Pressable>
            <Text accessibilityRole="header" style={styles.title}>
              Medidas
            </Text>
          </View>

          <Text style={styles.intro}>
            Preencha só o que mediu hoje. Uma pesagem já vale; as circunferências contam o que a balança
            não conta.
          </Text>

          {fields.map((field) => (
            <Input
              helperText={field.helper}
              icon={field.icon}
              key={field.key}
              keyboardType="decimal-pad"
              label={field.label}
              onChangeText={(text) => setValues((current) => ({ ...current, [field.key]: text }))}
              placeholder="—"
              rightText={field.unit}
              value={values[field.key] ?? ''}
            />
          ))}

          <Button
            disabled={!canSave}
            haptic
            loading={isSaving}
            onPress={handleSave}
            title="Salvar medidas de hoje"
          />

          <Text style={styles.sectionTitle}>Histórico</Text>
          {history.length ? (
            history.map((item) => (
              <View key={item.id} style={styles.historyCard}>
                <View style={styles.historyHeader}>
                  <Text style={styles.historyDate}>{formatShortDate(item.takenAt)}</Text>
                  <Pressable
                    accessibilityLabel={`Apagar medidas de ${formatShortDate(item.takenAt)}`}
                    accessibilityRole="button"
                    hitSlop={8}
                    onPress={async () => {
                      await deleteMeasurement(item.id);
                      await load();
                    }}
                    style={({ pressed }) => [pressed ? styles.pressed : null]}>
                    <Ionicons color={theme.text.muted} name="trash-outline" size={16} />
                  </Pressable>
                </View>
                <Text style={styles.historyValues}>
                  {summaryFields
                    .filter((field) => item[field.key] !== undefined)
                    .map((field) => `${field.label} ${String(item[field.key]).replace('.', ',')} ${field.unit}`)
                    .join(' · ')}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.empty}>Nenhuma medida registrada ainda.</Text>
          )}
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
  sectionTitle: {
    color: theme.text.primary,
    fontFamily: fonts.extrabold,
    fontSize: 16,
    marginTop: 8,
  },
  historyCard: {
    backgroundColor: theme.bg.surface,
    borderColor: theme.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 4,
    padding: 14,
  },
  historyHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  historyDate: {
    color: theme.text.primary,
    fontFamily: fonts.bold,
    fontSize: 14,
  },
  historyValues: {
    color: theme.text.secondary,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 19,
  },
  empty: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 14,
  },
  pressed: {
    opacity: 0.75,
  },
}));
