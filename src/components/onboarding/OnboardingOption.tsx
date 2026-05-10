import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors } from '@/src/constants/colors';
import { spacing } from '@/src/constants/spacing';

type OnboardingOptionProps = {
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  selected: boolean;
};

export function OnboardingOption({ icon, label, onPress, selected }: OnboardingOptionProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        selected ? styles.selected : null,
        pressed ? styles.pressed : null,
      ]}>
      {icon ? (
        <Ionicons color={selected ? colors.primary : colors.textSecondary} name={icon} size={22} />
      ) : null}
      <Text style={[styles.label, selected ? styles.selectedLabel : null]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: 'transparent',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 52,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  selected: {
    backgroundColor: '#13231E',
    borderColor: colors.primary,
  },
  label: {
    color: colors.textSecondary,
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  selectedLabel: {
    color: colors.text,
  },
  pressed: {
    opacity: 0.86,
  },
});
