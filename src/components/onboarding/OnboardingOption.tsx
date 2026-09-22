import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text } from 'react-native';

import { spacing } from '@/src/constants/spacing';
import { fonts, makeStyles, radius, useTheme } from '@/src/theme';

type OnboardingOptionProps = {
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  selected: boolean;
};

export function OnboardingOption({ icon, label, onPress, selected }: OnboardingOptionProps) {
  const styles = useStyles();
  const { theme } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        selected ? styles.selected : null,
        pressed ? styles.pressed : null,
      ]}>
      {icon ? (
        <Ionicons color={selected ? theme.accent.primary : theme.text.secondary} name={icon} size={22} />
      ) : null}
      <Text style={[styles.label, selected ? styles.selectedLabel : null]}>{label}</Text>
    </Pressable>
  );
}

const useStyles = makeStyles((theme) => ({
  container: {
    alignItems: 'center',
    backgroundColor: theme.bg.surface,
    borderColor: theme.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 52,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  selected: {
    backgroundColor: theme.accent.soft,
    borderColor: theme.accent.primary,
  },
  label: {
    color: theme.text.secondary,
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: 15,
    lineHeight: 20,
  },
  selectedLabel: {
    color: theme.text.primary,
  },
  pressed: {
    opacity: 0.86,
  },
}));
