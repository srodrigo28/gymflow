import { View } from 'react-native';

import { BrandMark } from '@/src/components/brand/BrandMark';
import { BrandWordmark } from '@/src/components/brand/BrandWordmark';
import { makeStyles } from '@/src/theme';

// Marca compacta usada no topo das telas de autenticação.
export function BrandHeader() {
  const styles = useStyles();

  return (
    <View style={styles.container}>
      <BrandMark width={46} />
      <BrandWordmark align="left" size="sm" />
    </View>
  );
}

const useStyles = makeStyles(() => ({
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
}));
