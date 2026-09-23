import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Text, View } from 'react-native';

import { fonts, makeStyles, radius, useTheme, withAlpha } from '@/src/theme';

export type Benefit = {
  icon: ComponentProps<typeof MaterialCommunityIcons>['name'];
  subtitle?: string;
  title: string;
};

// Benefício do topo do login: selo redondo de vidro com o ícone e uma ou duas linhas de texto.
export function BenefitRow({ icon, subtitle, title }: Benefit) {
  const styles = useStyles();
  const { theme } = useTheme();

  return (
    <View
      accessibilityLabel={[title, subtitle].filter(Boolean).join('. ').replace(/\n/g, ' ')}
      accessible
      style={styles.row}>
      <View style={styles.badge}>
        <MaterialCommunityIcons color={theme.accent.primary} name={icon} size={20} />
      </View>
      <View style={styles.copy}>
        <Text maxFontSizeMultiplier={1.3} style={styles.title}>
          {title}
        </Text>
        {subtitle ? (
          <Text maxFontSizeMultiplier={1.3} style={styles.subtitle}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const useStyles = makeStyles((theme) => ({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
  },
  badge: {
    alignItems: 'center',
    backgroundColor: withAlpha(theme.accent.primary, 0.1),
    borderColor: withAlpha(theme.accent.primary, 0.24),
    borderRadius: radius.pill,
    borderWidth: 1,
    boxShadow: `0 0 18px ${withAlpha(theme.accent.primary, 0.16)}`,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  copy: {
    flexShrink: 1,
    gap: 1,
  },
  title: {
    color: theme.text.primary,
    fontFamily: fonts.semibold,
    fontSize: 14,
    lineHeight: 19,
  },
  subtitle: {
    color: theme.text.secondary,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
  },
}));
