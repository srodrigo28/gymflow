import { StyleSheet, Text, View, type DimensionValue } from 'react-native';

import { colors } from '@/src/constants/colors';
import { spacing } from '@/src/constants/spacing';

type OnboardingProgressProps = {
  current: number;
  total: number;
};

export function OnboardingProgress({ current, total }: OnboardingProgressProps) {
  const progress = `${(current / total) * 100}%` as DimensionValue;

  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        <Text style={styles.label}>Etapa {current}</Text>
        <Text style={styles.labelMuted}>de {total}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.bar, { width: progress }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  labelMuted: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  track: {
    backgroundColor: colors.surface,
    borderRadius: 999,
    height: 8,
    overflow: 'hidden',
  },
  bar: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    height: '100%',
  },
});
