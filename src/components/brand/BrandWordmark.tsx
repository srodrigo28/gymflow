import { Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { fonts, makeStyles, typography } from '@/src/theme';

export const brandName = 'Gyn Flow';
export const brandTagline = 'Treino · Saúde · Bem-estar';

type BrandWordmarkProps = {
  align?: 'center' | 'left';
  size?: 'sm' | 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
  tagline?: boolean;
};

export function BrandWordmark({ align = 'center', size = 'md', style, tagline = false }: BrandWordmarkProps) {
  const styles = useStyles();

  return (
    <View style={[align === 'center' ? styles.center : styles.left, style]}>
      <Text accessibilityRole="header" style={[styles.title, styles[size]]}>
        Gyn <Text style={styles.accent}>Flow</Text>
      </Text>
      {tagline ? <Text style={styles.tagline}>{brandTagline}</Text> : null}
    </View>
  );
}

const useStyles = makeStyles((theme) => ({
  center: {
    alignItems: 'center',
    gap: 6,
  },
  left: {
    alignItems: 'flex-start',
    gap: 4,
  },
  title: {
    color: theme.text.primary,
    fontFamily: fonts.extrabold,
    letterSpacing: -0.8,
  },
  accent: {
    color: theme.accent.primary,
  },
  sm: {
    fontSize: 20,
    lineHeight: 24,
  },
  md: {
    fontSize: 28,
    lineHeight: 34,
  },
  lg: {
    fontSize: 40,
    lineHeight: 46,
  },
  tagline: {
    ...typography.overline,
    color: theme.text.secondary,
  },
}));
