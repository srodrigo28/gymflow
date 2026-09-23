import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { AuthBackground } from '@/src/components/auth/AuthBackground';
import { AuthTopBar } from '@/src/components/auth/AuthTopBar';
import { useKeyboardReveal, type AuthForm } from '@/src/components/auth/useKeyboardReveal';
import { fonts, makeStyles, typography } from '@/src/theme';

type AuthScreenLayoutProps = {
  children: (form: AuthForm) => ReactNode;
  footerAction: string;
  footerText: string;
  onFooterPress: () => void;
  subtitle: string;
  title: string;
};

// Estrutura do cadastro: voltar ao hero, marca, título, formulário e troca de tela.
// O login usa o AuthSheetLayout (foto no topo e formulário numa folha).
export function AuthScreenLayout({
  children,
  footerAction,
  footerText,
  onFooterPress,
  subtitle,
  title,
}: AuthScreenLayoutProps) {
  const styles = useStyles();
  const { form, scrollRef } = useKeyboardReveal();

  return (
    <AuthBackground>
      {/* 'padding' também no Android: com edge-to-edge (Android 15+) a janela não encolhe
          sozinha quando o teclado abre, e ele cobriria o botão de enviar. */}
      <KeyboardAvoidingView behavior="padding" style={styles.keyboard}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          ref={scrollRef}
          showsVerticalScrollIndicator={false}>
          <View style={styles.main}>
            <AuthTopBar />

            <Animated.View entering={FadeInDown.delay(80).duration(450)} style={styles.heading}>
              <Text accessibilityRole="header" style={styles.title}>
                {title}
              </Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </Animated.View>

            {children(form)}
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
