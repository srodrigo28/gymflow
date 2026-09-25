export type ThemeName = 'flow' | 'dia' | 'meiaNoite' | 'aurora' | 'brasa';

export type DomainName = 'treino' | 'sono' | 'agua' | 'alimentacao' | 'mente' | 'conquista';

export type StatusName = 'success' | 'warning' | 'danger' | 'info';

export type Theme = {
  name: ThemeName;
  label: string;
  description: string;
  scheme: 'dark' | 'light';
  bg: {
    base: string;
    surface: string;
    raised: string;
    high: string;
    overlay: string;
  };
  text: {
    primary: string;
    secondary: string;
    muted: string;
  };
  border: {
    subtle: string;
    strong: string;
    focus: string;
  };
  accent: {
    primary: string;
    pressed: string;
    soft: string;
    onPrimary: string;
    secondary: string;
  };
  status: Record<StatusName, string>;
  domain: Record<DomainName, string>;
  gradient: {
    aurora: readonly string[];
  };
};
