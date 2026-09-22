import { Text, View } from 'react-native';

import { fonts, makeStyles, radius, useTheme } from '@/src/theme';

type StrengthLevel = 1 | 2 | 3;

export function getPasswordStrength(password: string): StrengthLevel {
  let score = 0;

  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score >= 4) return 3;
  if (score >= 2) return 2;
  return 1;
}

// Só orienta; não bloqueia o envio (a regra mínima continua no schema).
export function PasswordStrength({ password }: { password: string }) {
  const styles = useStyles();
  const { theme } = useTheme();

  if (!password) {
    return null;
  }

  const level = getPasswordStrength(password);
  const { color, label } = {
    1: { color: theme.status.danger, label: 'Senha fraca' },
    2: { color: theme.status.warning, label: 'Senha média' },
    3: { color: theme.status.success, label: 'Senha forte' },
  }[level];

  return (
    <View accessibilityLabel={label} accessible style={styles.container}>
      <View style={styles.bars}>
        {[1, 2, 3].map((bar) => (
          <View
            key={bar}
            style={[styles.bar, { backgroundColor: bar <= level ? color : theme.bg.raised }]}
          />
        ))}
      </View>
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
}

const useStyles = makeStyles(() => ({
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginTop: -4,
  },
  bars: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
  },
  bar: {
    borderRadius: radius.pill,
    flex: 1,
    height: 4,
  },
  label: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    minWidth: 78,
    textAlign: 'right',
  },
}));
