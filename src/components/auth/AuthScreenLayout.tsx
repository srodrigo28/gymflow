import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { AuthBackground } from '@/src/components/auth/AuthBackground';
import { BrandHeader } from '@/src/components/auth/BrandHeader';
import { fonts, makeStyles, radius, typography, useTheme } from '@/src/theme';

type AuthScreenLayoutProps = PropsWithChildren<{
  footerAction: string;
  footerText: string;
  onFooterPress: () => void;
  subtitle: string;
  title: string;
}>;

function goBackToWelcome() {
  if (router.canGoBack()) {
    router.back();
    return;
  }

  router.replace('/(auth)/welcome');
}

// Estrutura comum de login e cadastro: voltar ao hero, marca, título, formulário e troca de tela.
export function AuthScreenLayout({
  children,
  footerAction,
  footerText,
  onFooterPress,
  subtitle,
  title,
}: AuthScreenLayoutProps) {
  const styles = useStyles();
  const { theme } = useTheme();

  return (
    <AuthBackground>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.main}>
            <Animated.View entering={FadeIn.duration(300)} style={styles.topBar}>
              <Pressable
                accessibilityLabel="Voltar"
                accessibilityRole="button"
                hitSlop={8}
                onPress={goBackToWelcome}
                style={({ pressed }) => [styles.backButton, pressed ? styles.pressed : null]}>
                <Ionicons color={theme.text.primary} name="arrow-back" size={20} />
              </Pressable>
              <BrandHeader />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(80).duration(450)} style={styles.heading}>
              <Text accessibilityRole="header" style={styles.title}>
                {title}
              </Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </Animated.View>

            {children}
          </View>

          <Animated.View entering={FadeIn.delay(400).duration(400)} style={styles.footer}>
            <Text style={styles.footerText}>{footerText}</Text>
            <Pressable
              accessibilityRole="button"
              hitSlop={10}
              onPress={onFooterPress}
              style={({ pressed }) => [styles.footerButton, pressed ? styles.pressed : null]}>
              <Text style={styles.footerAction}>{footerAction}</Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </AuthBackground>
  );
}

const useStyles = makeStyles((theme) => ({
  keyboard: {
    flex: 1,
  },
  content: {
    alignSelf: 'center',
    flexGrow: 1,
    justifyContent: 'space-between',
    maxWidth: 520,
    paddingBottom: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    width: '100%',
  },
  main: {
    gap: 28,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 16,
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: theme.bg.overlay,
    borderColor: theme.border.subtle,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  heading: {
    gap: 6,
  },
  title: {
    ...typography.h1,
    color: theme.text.primary,
  },
  subtitle: {
    ...typography.body,
    color: theme.text.secondary,
  },
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    marginTop: 32,
  },
  footerText: {
    color: theme.text.secondary,
    fontFamily: fonts.medium,
    fontSize: 15,
  },
  footerButton: {
    justifyContent: 'center',
    minHeight: 44,
  },
  footerAction: {
    color: theme.accent.primary,
    fontFamily: fonts.bold,
    fontSize: 15,
  },
  pressed: {
    opacity: 0.7,
  },
}));
