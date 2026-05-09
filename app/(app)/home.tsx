import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/src/components/ui/Screen';
import { colors } from '@/src/constants/colors';
import { spacing } from '@/src/constants/spacing';

export default function HomeScreen() {
  return (
    <Screen style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Ola,</Text>
          <Text style={styles.name}>Rodrigo Goncalves</Text>
        </View>
        <MaterialCommunityIcons name="logout" size={32} color={colors.textSecondary} />
      </View>

      <View style={styles.emptyState}>
        <MaterialCommunityIcons name="weight-lifter" size={48} color={colors.primary} />
        <Text style={styles.title}>Fluxo autenticado pronto</Text>
        <Text style={styles.description}>
          Esta tela minima confirma o login/cadastro. Na proxima etapa entram treino, historico e
          perfil conectados na API.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  greeting: {
    color: colors.textSecondary,
    fontSize: 18,
  },
  name: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
    justifyContent: 'center',
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  description: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
});
