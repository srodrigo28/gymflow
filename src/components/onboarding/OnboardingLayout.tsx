import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { OnboardingIllustration } from '@/src/components/onboarding/OnboardingIllustration';
import { OnboardingProgress } from '@/src/components/onboarding/OnboardingProgress';
import { Screen } from '@/src/components/ui/Screen';
import { colors } from '@/src/constants/colors';
import { spacing } from '@/src/constants/spacing';

type IllustrationName = Parameters<typeof OnboardingIllustration>[0]['name'];

type OnboardingLayoutProps = PropsWithChildren<{
  currentStep: number;
  description: string;
  footer?: React.ReactNode;
  illustration: IllustrationName;
  title: string;
  totalSteps: number;
}>;

export function OnboardingLayout({
  children,
  currentStep,
  description,
  footer,
  illustration,
  title,
  totalSteps,
}: OnboardingLayoutProps) {
  const { height, width } = useWindowDimensions();
  const isCompact = height < 720;
  const isNarrow = width < 390;

  return (
    <Screen style={styles.screen}>
      <View style={[styles.frame, isNarrow ? styles.frameNarrow : null]}>
        <View style={[styles.fixedHeader, isCompact ? styles.fixedHeaderCompact : null]}>
          <OnboardingProgress current={currentStep} total={totalSteps} />
          <View style={[styles.illustrationArea, isCompact ? styles.illustrationAreaCompact : null]}>
            <OnboardingIllustration compact={isCompact} name={illustration} />
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, isCompact ? styles.contentCompact : null]}
          keyboardShouldPersistTaps="handled"
          persistentScrollbar
          scrollIndicatorInsets={{ bottom: 116, top: 8 }}
          showsVerticalScrollIndicator>
          <View style={[styles.header, isCompact ? styles.headerCompact : null]}>
            <Text style={[styles.title, isCompact ? styles.titleCompact : null]}>{title}</Text>
            <Text style={[styles.description, isCompact ? styles.descriptionCompact : null]}>
              {description}
            </Text>
          </View>
          <View style={styles.body}>{children}</View>
        </ScrollView>
        {footer ? <View style={styles.footerSlot}>{footer}</View> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  frame: {
    flex: 1,
    maxWidth: 520,
    paddingHorizontal: spacing.md,
    width: '100%',
  },
  frameNarrow: {
    paddingHorizontal: spacing.md,
  },
  fixedHeader: {
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  fixedHeaderCompact: {
    gap: 6,
    paddingTop: spacing.sm,
  },
  illustrationArea: {
    alignItems: 'center',
    height: 156,
    justifyContent: 'center',
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  illustrationAreaCompact: {
    height: 108,
    marginBottom: 4,
    marginTop: 4,
  },
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.lg,
    paddingTop: spacing.lg,
  },
  contentCompact: {
    gap: spacing.md,
    paddingBottom: spacing.md,
    paddingTop: spacing.md,
  },
  footerSlot: {
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
  },
  header: {
    gap: spacing.sm,
  },
  headerCompact: {
    gap: 4,
  },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 32,
  },
  titleCompact: {
    fontSize: 23,
    lineHeight: 28,
  },
  description: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 24,
  },
  descriptionCompact: {
    fontSize: 14,
    lineHeight: 20,
  },
  body: {
    gap: spacing.sm,
  },
});
