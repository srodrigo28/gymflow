import { StyleSheet } from 'react-native';

import type { Theme } from '@/src/theme/types';
import { useTheme } from '@/src/theme/useTheme';

type NamedStyles<T> = StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>;

// Cria um hook de estilos que depende do tema.
// Os temas são objetos fixos, então cada combinação tema + fábrica é criada uma única vez.
export function makeStyles<T extends NamedStyles<T>>(factory: (theme: Theme) => T & NamedStyles<any>) {
  const cache = new WeakMap<Theme, T>();

  return function useStyles(): T {
    const { theme } = useTheme();
    let styles = cache.get(theme);

    if (!styles) {
      styles = StyleSheet.create(factory(theme));
      cache.set(theme, styles);
    }

    return styles;
  };
}
