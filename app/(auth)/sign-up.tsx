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
import { signUp } from '@/src/services/auth';
import type { SignUpPayload } from '@/src/types/auth';

const signUpSchema = z
  .object({
    name: z.string().min(2, 'Informe seu nome.'),
    email: z.string().min(1, 'Informe seu e-mail.').email('Informe um e-mail valido.'),
    password: z.string().min(6, 'A senha precisa ter pelo menos 6 caracteres.'),
    passwordConfirmation: z.string().min(1, 'Confirme sua senha.'),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: 'As senhas precisam ser iguais.',
    path: ['passwordConfirmation'],
  });

export default function SignUpScreen() {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<SignUpPayload>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      passwordConfirmation: '',
    },
  });

  async function handleSignUp(payload: SignUpPayload) {
    try {
      await signUp(payload);
      router.replace('/(app)/home');
    } catch (error) {
      setError('root', {
        message: error instanceof Error ? error.message : 'Nao foi possivel criar sua conta.',
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
          <BrandHeader compact />

          <View style={styles.form}>
            <Text style={styles.heading}>Crie sua conta</Text>

            <Controller
              control={control}
              name="name"
              render={({ field: { onBlur, onChange, value } }) => (
                <Input
                  autoCapitalize="words"
                  error={errors.name?.message}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  placeholder="Nome"
                  value={value}
                />
              )}
            />

            <Controller
              control={control}
              name="email"
              render={({ field: { onBlur, onChange, value } }) => (
                <Input
                  autoCapitalize="none"
                  autoComplete="email"
                  error={errors.email?.message}
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
                  onBlur={onBlur}
                  onChangeText={onChange}
                  placeholder="Senha"
                  secureTextEntry
                  value={value}
                />
              )}
            />

            <Controller
              control={control}
              name="passwordConfirmation"
              render={({ field: { onBlur, onChange, value } }) => (
                <Input
                  autoCapitalize="none"
                  error={errors.passwordConfirmation?.message}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  placeholder="Confirme a senha"
                  secureTextEntry
                  value={value}
                />
              )}
            />

            {errors.root?.message ? <Text style={styles.error}>{errors.root.message}</Text> : null}

            <Button
              disabled={isSubmitting}
              loading={isSubmitting}
              onPress={handleSubmit(handleSignUp)}
              title="Criar e acessar"
            />
          </View>

          <Link href="/(auth)/login" asChild>
            <Button title="Voltar para o login" variant="outline" />
          </Link>
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
});
