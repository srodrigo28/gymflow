import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/src/constants/colors';
import { spacing } from '@/src/constants/spacing';

type BrandHeaderProps = {
  compact?: boolean;
};

export function BrandHeader({ compact = false }: BrandHeaderProps) {
  return (
    <View style={[styles.container, compact ? styles.compact : null]}>
      <View style={styles.logoRow}>
        <MaterialCommunityIcons name="dumbbell" size={42} color={colors.primary} />
        <Text style={styles.title}>Ignite Gym</Text>
      </View>
      <Text style={styles.subtitle}>Treine sua mente e o seu corpo</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xxl,
    marginTop: spacing.xl,
  },
  compact: {
    marginBottom: spacing.xl,
    marginTop: spacing.md,
  },
  logoRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 18,
    textAlign: 'center',
  },
});
