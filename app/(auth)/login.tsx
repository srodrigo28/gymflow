import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { z } from 'zod';

import { AuthScreenLayout } from '@/src/components/auth/AuthScreenLayout';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { signIn } from '@/src/services/auth';
import { fonts, makeStyles } from '@/src/theme';
import type { SignInPayload } from '@/src/types/auth';

const signInSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, 'Informe seu e-mail.').email('Informe um e-mail válido.'),
  password: z.string().min(1, 'Informe sua senha.'),
});

export default function LoginScreen() {
  const styles = useStyles();
  const [showRecoveryNotice, setShowRecoveryNotice] = useState(false);
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
      await signIn(payload);
      router.replace('/(app)/home');
    } catch (error) {
      setError('root', {
        message: error instanceof Error ? error.message : 'Não foi possível acessar sua conta.',
      });
    }
  }

  return (
    <AuthScreenLayout
      footerAction="Criar conta"
      footerText="Não tem conta?"
      onFooterPress={() => router.replace('/(auth)/sign-up')}
      subtitle="Continue de onde parou."
      title="Bem-vindo de volta">
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
                placeholder="E-mail"
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

        <Animated.View entering={FadeInDown.delay(300).duration(450)}>
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
    </AuthScreenLayout>
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
}));
