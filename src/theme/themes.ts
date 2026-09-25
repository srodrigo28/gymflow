import { palette as p } from '@/src/theme/palette';
import type { Theme, ThemeName } from '@/src/theme/types';

export function withAlpha(hex: string, alpha: number) {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Cores de domínio e de status são iguais em todos os temas escuros:
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

// No tema claro as mesmas cores ficam mais fechadas: as versões luminosas foram feitas para
// fundo escuro e não têm contraste suficiente sobre branco.
const lightDomain: Theme['domain'] = {
  treino: p.jade[700],
  sono: p.violet[600],
  agua: p.cyan[700],
  alimentacao: p.orange[700],
  mente: p.pink[700],
  conquista: p.amber[700],
};

const lightStatus: Theme['status'] = {
  success: p.jade[700],
  warning: p.amber[800],
  danger: p.rose[700],
  info: p.sky[700],
};

const darkBorder: Theme['border'] = {
  subtle: 'rgba(255, 255, 255, 0.07)',
  strong: 'rgba(255, 255, 255, 0.14)',
  focus: '',
};

const lightBorder: Theme['border'] = {
  subtle: 'rgba(21, 26, 35, 0.10)',
  strong: 'rgba(21, 26, 35, 0.20)',
  focus: '',
};

type ThemeConfig = Pick<Theme, 'name' | 'label' | 'description' | 'text' | 'gradient'> & {
  bg: Omit<Theme['bg'], 'overlay'>;
  accent: Omit<Theme['accent'], 'soft'>;
  scheme?: Theme['scheme'];
};

function createTheme({ accent, bg, scheme = 'dark', ...config }: ThemeConfig): Theme {
  const isLight = scheme === 'light';

  return {
    ...config,
    scheme,
    bg: {
      ...bg,
      overlay: withAlpha(bg.surface, 0.72),
    },
    border: {
      ...(isLight ? lightBorder : darkBorder),
      focus: accent.primary,
    },
    accent: {
      ...accent,
      soft: withAlpha(accent.primary, 0.14),
    },
    status: isLight ? lightStatus : status,
    domain: isLight ? lightDomain : domain,
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
  dia: createTheme({
    name: 'dia',
    label: 'Dia',
    description: 'Fundo claro para treinar sob o sol. As mesmas cores, com mais contraste.',
    scheme: 'light',
    bg: { base: p.day[50], surface: p.day[0], raised: p.day[100], high: p.day[200] },
    text: { primary: p.day[900], secondary: p.day[700], muted: p.day[500] },
    accent: {
      primary: p.jade[700],
      pressed: p.jade[800],
      onPrimary: p.day[0],
      secondary: p.cyan[700],
    },
    gradient: { aurora: [p.jade[500], p.cyan[400], p.violet[350]] },
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
