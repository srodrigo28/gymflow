import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { z } from 'zod';

import { AuthScreenLayout } from '@/src/components/auth/AuthScreenLayout';
import { PasswordStrength } from '@/src/components/auth/PasswordStrength';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { signUp } from '@/src/services/auth';
import { fonts, makeStyles } from '@/src/theme';
import type { SignUpPayload } from '@/src/types/auth';

const signUpSchema = z
  .object({
    name: z.string().trim().min(2, 'Informe seu nome.'),
    email: z.string().trim().toLowerCase().min(1, 'Informe seu e-mail.').email('Informe um e-mail válido.'),
    password: z.string().min(6, 'A senha precisa ter pelo menos 6 caracteres.'),
    passwordConfirmation: z.string().min(1, 'Confirme sua senha.'),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: 'As senhas precisam ser iguais.',
    path: ['passwordConfirmation'],
  });

export default function SignUpScreen() {
  const styles = useStyles();
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    watch,
  } = useForm<SignUpPayload>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      passwordConfirmation: '',
    },
  });
  const password = watch('password');

  async function handleSignUp(payload: SignUpPayload) {
    try {
      await signUp(payload);
      router.replace('/(onboarding)/start');
    } catch (error) {
      setError('root', {
        message: error instanceof Error ? error.message : 'Não foi possível criar sua conta.',
      });
    }
  }

  return (
    <AuthScreenLayout
      footerAction="Entrar"
      footerText="Já tem conta?"
      onFooterPress={() => router.replace('/(auth)/login')}
      subtitle="Leva menos de um minuto."
      title="Comece sua evolução">
      <View style={styles.form}>
        <Animated.View entering={FadeInDown.delay(160).duration(450)}>
          <Controller
            control={control}
            name="name"
            render={({ field: { onBlur, onChange, value } }) => (
              <Input
                autoCapitalize="words"
                autoComplete="name"
                error={errors.name?.message}
                icon="person-outline"
                onBlur={onBlur}
                onChangeText={onChange}
                placeholder="Nome"
                textContentType="name"
                value={value}
              />
            )}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(210).duration(450)}>
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

        <Animated.View entering={FadeInDown.delay(260).duration(450)} style={styles.passwordGroup}>
          <Controller
            control={control}
            name="password"
            render={({ field: { onBlur, onChange, value } }) => (
              <Input
                autoCapitalize="none"
                autoComplete="new-password"
                error={errors.password?.message}
                icon="lock-closed-outline"
                onBlur={onBlur}
                onChangeText={onChange}
                placeholder="Senha"
                secureTextEntry
                textContentType="newPassword"
                value={value}
              />
            )}
          />
          <PasswordStrength password={password} />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(310).duration(450)}>
          <Controller
            control={control}
            name="passwordConfirmation"
            render={({ field: { onBlur, onChange, value } }) => (
              <Input
                autoCapitalize="none"
                autoComplete="new-password"
                error={errors.passwordConfirmation?.message}
                icon="shield-checkmark-outline"
                onBlur={onBlur}
                onChangeText={onChange}
                onSubmitEditing={handleSubmit(handleSignUp)}
                placeholder="Confirme a senha"
                returnKeyType="go"
                secureTextEntry
                textContentType="newPassword"
                value={value}
              />
            )}
          />
        </Animated.View>

        {errors.root?.message ? (
          <Animated.Text accessibilityLiveRegion="polite" entering={FadeIn} style={styles.error}>
            {errors.root.message}
          </Animated.Text>
        ) : null}

        <Animated.View entering={FadeInDown.delay(360).duration(450)} style={styles.submit}>
          <Button
            disabled={isSubmitting}
            haptic
            icon="arrow-forward"
            iconPosition="right"
            loading={isSubmitting}
            onPress={handleSubmit(handleSignUp)}
            title="Criar minha conta"
          />
          <Text style={styles.terms}>
            Ao criar a conta você concorda com os Termos de Uso e a Política de Privacidade.
          </Text>
        </Animated.View>
      </View>
    </AuthScreenLayout>
  );
}

const useStyles = makeStyles((theme) => ({
  form: {
    gap: 14,
  },
  passwordGroup: {
    gap: 10,
  },
  submit: {
    gap: 12,
    marginTop: 6,
  },
  terms: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },
  error: {
    color: theme.status.danger,
    fontFamily: fonts.medium,
    fontSize: 14,
    textAlign: 'center',
  },
}));
