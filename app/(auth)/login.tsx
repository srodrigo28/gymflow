import { zodResolver } from '@hookform/resolvers/zod';
import { Link, router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';

import { AuthBackground } from '@/src/components/auth/AuthBackground';
import { BrandHeader } from '@/src/components/auth/BrandHeader';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { colors } from '@/src/constants/colors';
import { spacing } from '@/src/constants/spacing';
import { signIn } from '@/src/services/auth';
import type { SignInPayload } from '@/src/types/auth';

const signInSchema = z.object({
  email: z.string().min(1, 'Informe seu e-mail.').email('Informe um e-mail valido.'),
  password: z.string().min(1, 'Informe sua senha.'),
});

export default function LoginScreen() {
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
    <AuthBackground>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboard}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <BrandHeader />

          <View style={styles.form}>
            <Text style={styles.heading}>Acesse sua conta</Text>

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
                  value={value}
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { onBlur, onChange, value } }) => (
                <Input
                  autoCapitalize="none"
                  error={errors.password?.message}
                  icon="lock-closed-outline"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  placeholder="Senha"
                  secureTextEntry
                  value={value}
                />
              )}
            />

            {errors.root?.message ? <Text style={styles.error}>{errors.root.message}</Text> : null}

            <Button
              disabled={isSubmitting}
              icon="log-in-outline"
              loading={isSubmitting}
              onPress={handleSubmit(handleSignIn)}
              title="Acessar"
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Ainda não tem acesso?</Text>
            <Link href="/(auth)/sign-up" asChild>
              <Button icon="person-add-outline" title="Criar conta" variant="outline" />
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </AuthBackground>
  );
}

const styles = StyleSheet.create({
  keyboard: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  form: {
    gap: spacing.md,
  },
  heading: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    textAlign: 'center',
  },
  footer: {
    gap: spacing.md,
    marginTop: spacing.xxl,
  },
  footerText: {
    color: colors.textSecondary,
    fontSize: 18,
    textAlign: 'center',
  },
});
