import { Redirect } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

// No web, o banco local precisa da página isolada de outras origens (os cabeçalhos do metro.config.js). O
// servidor de desenvolvimento do Expo responde a raiz antes de mandar esses cabeçalhos, e as outras rotas
// recebem; então, aberta pela raiz sem isolamento, a página carrega a splash de novo, pela rede.
const needsIsolatedReload = Platform.OS === 'web' && typeof window !== 'undefined' && !window.crossOriginIsolated;

export default function Index() {
  useEffect(() => {
    if (needsIsolatedReload) {
      window.location.replace('/splash');
    }
  }, []);

  return needsIsolatedReload ? null : <Redirect href="/(auth)/splash" />;
}
