import { Text, View, type DimensionValue } from 'react-native';

import { spacing } from '@/src/constants/spacing';
import { fonts, makeStyles, radius } from '@/src/theme';

type OnboardingProgressProps = {
  current: number;
  total: number;
};

export function OnboardingProgress({ current, total }: OnboardingProgressProps) {
  const styles = useStyles();
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

const useStyles = makeStyles((theme) => ({
  wrapper: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    color: theme.text.primary,
    fontFamily: fonts.bold,
    fontSize: 14,
  },
  labelMuted: {
    color: theme.text.secondary,
    fontFamily: fonts.regular,
    fontSize: 14,
  },
  track: {
    backgroundColor: theme.bg.raised,
    borderRadius: radius.pill,
    height: 8,
    overflow: 'hidden',
  },
  bar: {
    backgroundColor: theme.accent.primary,
    borderRadius: radius.pill,
    height: '100%',
  },
}));
