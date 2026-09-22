import { palette as p } from '@/src/theme/palette';
import type { Theme, ThemeName } from '@/src/theme/types';

export function withAlpha(hex: string, alpha: number) {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Cores de domínio e de status são iguais em todos os temas:
// cada cor tem um único significado no app inteiro.
const domain: Theme['domain'] = {
  treino: p.mint[400],
  sono: p.violet[350],
  agua: p.cyan[400],
  alimentacao: p.orange[400],
  mente: p.pink[400],
  conquista: p.amber[300],
};

const status: Theme['status'] = {
  success: p.mint[400],
  warning: p.amber[400],
  danger: p.rose[450],
  info: p.sky[400],
};

type ThemeConfig = Pick<Theme, 'name' | 'label' | 'description' | 'text' | 'gradient'> & {
  bg: Omit<Theme['bg'], 'overlay'>;
  accent: Omit<Theme['accent'], 'soft'>;
};

function createTheme({ accent, bg, ...config }: ThemeConfig): Theme {
  return {
    ...config,
    scheme: 'dark',
    bg: {
      ...bg,
      overlay: withAlpha(bg.surface, 0.72),
    },
    border: {
      subtle: 'rgba(255, 255, 255, 0.07)',
      strong: 'rgba(255, 255, 255, 0.14)',
      focus: accent.primary,
    },
    accent: {
      ...accent,
      soft: withAlpha(accent.primary, 0.14),
    },
    status,
    domain,
  };
}

export const themes: Record<ThemeName, Theme> = {
  flow: createTheme({
    name: 'flow',
    label: 'Flow',
    description: 'A identidade do Gyn Flow com mais luz: escuro e respirável.',
    bg: { base: p.slate[950], surface: p.slate[900], raised: p.slate[800], high: p.slate[700] },
    text: { primary: p.slate[50], secondary: p.slate[300], muted: p.slate[400] },
    accent: {
      primary: p.mint[400],
      pressed: p.mint[500],
      onPrimary: p.mint[950],
      secondary: p.cyan[400],
    },
    gradient: { aurora: [p.mint[400], p.cyan[400], p.violet[350]] },
  }),
  meiaNoite: createTheme({
    name: 'meiaNoite',
    label: 'Meia-noite',
    description: 'Mais denso e profundo. Ótimo em telas OLED e à noite.',
    bg: { base: p.ink[950], surface: p.ink[900], raised: p.ink[800], high: p.ink[700] },
    text: { primary: p.ink[0], secondary: p.ink[300], muted: p.ink[400] },
    accent: {
      primary: p.jade[400],
      pressed: p.jade[500],
      onPrimary: p.jade[950],
      secondary: p.cyan[400],
    },
    gradient: { aurora: [p.jade[400], p.jade[700], p.jade[400]] },
  }),
  aurora: createTheme({
    name: 'aurora',
    label: 'Aurora',
    description: 'Violeta e ciano. Calmo, noturno e um pouco mais tech.',
    bg: { base: p.indigo[950], surface: p.indigo[900], raised: p.indigo[800], high: p.indigo[700] },
    text: { primary: p.indigo[50], secondary: p.indigo[300], muted: p.indigo[400] },
    accent: {
      primary: p.violet[300],
      pressed: p.violet[400],
      onPrimary: p.violet[950],
      secondary: p.cyan[400],
    },
    gradient: { aurora: [p.violet[300], p.pink[400], p.cyan[400]] },
  }),
  brasa: createTheme({
    name: 'brasa',
    label: 'Brasa',
    description: 'Coral quente. Energia para os dias de treino intenso.',
    bg: { base: p.ember[950], surface: p.ember[900], raised: p.ember[800], high: p.ember[700] },
    text: { primary: p.ember[50], secondary: p.ember[300], muted: p.ember[400] },
    accent: {
      primary: p.coral[400],
      pressed: p.coral[500],
      onPrimary: p.coral[950],
      secondary: p.amber[350],
    },
    gradient: { aurora: [p.coral[400], p.amber[350], p.rose[400]] },
  }),
};

export const themeNames = Object.keys(themes) as ThemeName[];

export const defaultThemeName: ThemeName = 'flow';

export function isThemeName(value: unknown): value is ThemeName {
  return typeof value === 'string' && value in themes;
}

// Cor de fundo da splash nativa (app.json). Precisa ser igual à base do Flow.
export const nativeSplashBackground = p.slate[950];
