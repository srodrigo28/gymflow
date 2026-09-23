import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { z } from 'zod';

import { AuthSheetLayout } from '@/src/components/auth/AuthSheetLayout';
import type { Benefit } from '@/src/components/auth/BenefitRow';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { useRedirectAfterSignIn, useSession } from '@/src/contexts/session-context';
import { fonts, makeStyles, radius, withAlpha } from '@/src/theme';
import type { SignInPayload } from '@/src/types/auth';

const signInSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, 'Informe seu e-mail.').email('Informe um e-mail válido.'),
  password: z.string().min(1, 'Informe sua senha.'),
});

const benefits: Benefit[] = [
  { icon: 'chart-bar', subtitle: 'A cada treino', title: 'Mais progresso' },
  { icon: 'heart-outline', subtitle: 'Todos os dias', title: 'Mais saúde' },
  { icon: 'lightning-bolt', title: 'Uma versão\nmais forte de você' },
];

export default function LoginScreen() {
  const styles = useStyles();
  const [showRecoveryNotice, setShowRecoveryNotice] = useState(false);
  const passwordRef = useRef<TextInput>(null);
  const { signIn } = useSession();
  const redirectAfterSignIn = useRedirectAfterSignIn();
  // Veio de um convite: volta para ele depois de entrar.
  const { convite } = useLocalSearchParams<{ convite?: string }>();
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<SignInPayload>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function handleSignIn(payload: SignInPayload) {
    try {
      redirectAfterSignIn(convite ? { params: { code: convite }, pathname: '/convite/[code]' } : '/(app)/home');
      await signIn(payload);
    } catch (error) {
      redirectAfterSignIn(null);
      setError('root', {
        message: error instanceof Error ? error.message : 'Não foi possível acessar sua conta.',
      });
    }
  }

  return (
    <AuthSheetLayout
      benefits={benefits}
      footerAction="Criar conta"
      footerText="Não tem conta?"
      // Com o foco em qualquer um dos dois campos, a folha inteira fica acima do teclado.
      keyboardOffset={200}
      onFooterPress={() =>
        router.replace(convite ? { params: { convite }, pathname: '/(auth)/sign-up' } : '/(auth)/sign-up')
      }
      subtitle="Continue de onde parou."
      title={['Bem-vindo\nde ', 'volta', '']}>
      <View style={styles.form}>
        <Animated.View entering={FadeInDown.delay(160).duration(450)}>
          <Controller
            control={control}
            name="email"
            render={({ field: { onBlur, onChange, value } }) => (
              <Input
                autoCapitalize="none"
                autoComplete="email"
                error={errors.email?.message}
                icon="mail-outline"
                keyboardType="email-address"
                onBlur={onBlur}
                onChangeText={onChange}
                onSubmitEditing={() => passwordRef.current?.focus()}
                placeholder="E-mail"
                returnKeyType="next"
                submitBehavior="submit"
                textContentType="emailAddress"
                value={value}
              />
            )}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(220).duration(450)}>
          <Controller
            control={control}
            name="password"
            render={({ field: { onBlur, onChange, value } }) => (
              <Input
                autoCapitalize="none"
                autoComplete="current-password"
                error={errors.password?.message}
                icon="lock-closed-outline"
                onBlur={onBlur}
                onChangeText={onChange}
                onSubmitEditing={handleSubmit(handleSignIn)}
                placeholder="Senha"
                ref={passwordRef}
                returnKeyType="go"
                secureTextEntry
                textContentType="password"
                value={value}
              />
            )}
          />
        </Animated.View>

        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => setShowRecoveryNotice(true)}
          style={styles.forgot}>
          <Text style={styles.forgotText}>Esqueci minha senha</Text>
        </Pressable>

        {showRecoveryNotice ? (
          <Animated.Text accessibilityLiveRegion="polite" entering={FadeIn} style={styles.notice}>
            A recuperação de senha chega em breve.
          </Animated.Text>
        ) : null}

        {errors.root?.message ? (
          <Animated.Text accessibilityLiveRegion="polite" entering={FadeIn} style={styles.error}>
            {errors.root.message}
          </Animated.Text>
        ) : null}

        <Animated.View entering={FadeInDown.delay(300).duration(450)} style={styles.ctaGlow}>
          <Button
            disabled={isSubmitting}
            haptic
            icon="arrow-forward"
            iconPosition="right"
            loading={isSubmitting}
            onPress={handleSubmit(handleSignIn)}
            title="Entrar"
          />
        </Animated.View>
      </View>
    </AuthSheetLayout>
  );
}

const useStyles = makeStyles((theme) => ({
  form: {
    gap: 14,
  },
  forgot: {
    alignSelf: 'flex-end',
    justifyContent: 'center',
    minHeight: 32,
  },
  forgotText: {
    color: theme.text.secondary,
    fontFamily: fonts.semibold,
    fontSize: 14,
  },
  notice: {
    color: theme.status.info,
    fontFamily: fonts.medium,
    fontSize: 14,
    textAlign: 'center',
  },
  error: {
    color: theme.status.danger,
    fontFamily: fonts.medium,
    fontSize: 14,
    textAlign: 'center',
  },
  ctaGlow: {
    borderRadius: radius.md,
    boxShadow: `0 10px 28px ${withAlpha(theme.accent.primary, 0.3)}`,
  },
}));
