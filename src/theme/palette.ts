// Primitivas: valores crus da paleta. As telas nunca importam daqui;
// elas usam os tokens semânticos do tema (useTheme / makeStyles).
export const palette = {
  slate: {
    50: '#F4F7FB',
    300: '#B9C1D0',
    400: '#8E97AA',
    700: '#323B4D',
    800: '#283040',
    900: '#1E2531',
    950: '#151A23',
  },
  ink: {
    0: '#FFFFFF',
    300: '#C4C6CE',
    400: '#8A8C98',
    700: '#2B2D35',
    800: '#212329',
    900: '#18191E',
    950: '#0E0F12',
  },
  indigo: {
    50: '#F5F3FF',
    300: '#C3BFE0',
    400: '#9A95BD',
    700: '#36325A',
    800: '#2B2849',
    900: '#201E3A',
    950: '#16152B',
  },
  ember: {
    50: '#FFF7F3',
    300: '#D6C6BF',
    400: '#A8978F',
    700: '#3C3332',
    800: '#312A29',
    900: '#262020',
    950: '#1B1717',
  },
  mint: {
    400: '#34E3A4',
    500: '#22C98C',
    950: '#05231A',
  },
  jade: {
    400: '#1FD99A',
    500: '#12B981',
    700: '#0F8C6A',
    950: '#04200F',
  },
  violet: {
    300: '#A597FF',
    350: '#9D8CFF',
    400: '#8E7DF5',
    950: '#15103A',
  },
  coral: {
    400: '#FF8A5B',
    500: '#F2703F',
    950: '#2B0F04',
  },
  cyan: {
    400: '#4FD6F2',
  },
  amber: {
    300: '#FFD35C',
    350: '#FFC65C',
    400: '#FFC23D',
  },
  orange: {
    400: '#FFA65C',
  },
  pink: {
    400: '#F58BD8',
  },
  rose: {
    400: '#FF7A85',
    450: '#FF6B7A',
  },
  sky: {
    400: '#6CB8FF',
  },
} as const;
