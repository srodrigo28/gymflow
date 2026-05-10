import { StyleSheet, View } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { spacing } from '@/src/constants/spacing';

type OnboardingFooterProps = {
  canGoBack: boolean;
  canGoNext: boolean;
  loading?: boolean;
  nextLabel?: string;
  onBack: () => void;
  onNext: () => void;
};

export function OnboardingFooter({
  canGoBack,
  canGoNext,
  loading,
  nextLabel = 'Continuar',
  onBack,
  onNext,
}: OnboardingFooterProps) {
  if (!canGoBack) {
    return (
      <View style={styles.container}>
        <Button
          disabled={!canGoNext}
          icon={nextLabel === 'Finalizar' ? 'checkmark-circle-outline' : 'arrow-forward-outline'}
          loading={loading}
          onPress={onNext}
          style={styles.footerButton}
          title={nextLabel}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, styles.row]}>
      <View style={styles.backButton}>
        <Button
          icon="arrow-back-outline"
          onPress={onBack}
          style={styles.footerButton}
          title="Voltar"
          variant="outline"
        />
      </View>
      <View style={styles.nextButton}>
        <Button
          disabled={!canGoNext}
          icon={nextLabel === 'Finalizar' ? 'checkmark-circle-outline' : 'arrow-forward-outline'}
          loading={loading}
          onPress={onNext}
          style={styles.footerButton}
          title={nextLabel}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
  },
  footerButton: {
    height: 52,
  },
  backButton: {
    flex: 0.9,
  },
  nextButton: {
    flex: 1.1,
  },
});
