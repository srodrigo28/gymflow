import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import type { TextStyle } from 'react-native';

export const fontAssets = {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
};

// Com fonte customizada o peso vem da família; não combine com fontWeight
// (no Android isso faz o sistema trocar a fonte).
export const fonts = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
} as const;

export const typography = {
  display: { fontFamily: fonts.extrabold, fontSize: 36, letterSpacing: -0.6, lineHeight: 42 },
  h1: { fontFamily: fonts.extrabold, fontSize: 28, letterSpacing: -0.4, lineHeight: 34 },
  h2: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 28 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 24 },
  caption: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18 },
  overline: {
    fontFamily: fonts.bold,
    fontSize: 12,
    letterSpacing: 1.6,
    lineHeight: 16,
    textTransform: 'uppercase',
  },
  metric: { fontFamily: fonts.extrabold, fontSize: 44, fontVariant: ['tabular-nums'], lineHeight: 48 },
} satisfies Record<string, TextStyle>;
