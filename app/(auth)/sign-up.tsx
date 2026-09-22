import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { z } from 'zod';

import { AuthScreenLayout } from '@/src/components/auth/AuthScreenLayout';
import { PasswordStrength } from '@/src/components/auth/PasswordStrength';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { useRedirectAfterSignIn, useSession } from '@/src/contexts/session-context';
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
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmationRef = useRef<TextInput>(null);
  const { signUp } = useSession();
  const redirectAfterSignIn = useRedirectAfterSignIn();

  async function handleSignUp(payload: SignUpPayload) {
    try {
      redirectAfterSignIn('/(onboarding)/start');
      await signUp(payload);
    } catch (error) {
      redirectAfterSignIn(null);
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
      {({ revealSubmit }) => (
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
                  onSubmitEditing={() => emailRef.current?.focus()}
                  placeholder="Nome"
                  returnKeyType="next"
                  submitBehavior="submit"
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
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  placeholder="E-mail"
                  ref={emailRef}
                  returnKeyType="next"
                  submitBehavior="submit"
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
                  onSubmitEditing={() => confirmationRef.current?.focus()}
                  placeholder="Senha"
                  ref={passwordRef}
                  returnKeyType="next"
                  secureTextEntry
                  submitBehavior="submit"
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
                  onFocus={revealSubmit}
                  onSubmitEditing={handleSubmit(handleSignUp)}
                  placeholder="Confirme a senha"
                  ref={confirmationRef}
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
      )}
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
