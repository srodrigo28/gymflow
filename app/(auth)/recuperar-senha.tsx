import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { AuthSheetLayout } from '@/src/components/auth/AuthSheetLayout';
import { PasswordStrength } from '@/src/components/auth/PasswordStrength';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { confirmPasswordReset, requestPasswordReset } from '@/src/services/auth';
import { fonts, makeStyles, radius, withAlpha } from '@/src/theme';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Step = 'email' | 'code' | 'done';

// Recuperar a senha em dois passos na mesma tela: o e-mail recebe um código de 6 números, e o
// código libera a senha nova. A API responde igual com ou sem conta, então a tela também não
// diz se o e-mail existe.
export default function RecuperarSenhaScreen() {
  const styles = useStyles();
  const params = useLocalSearchParams<{ email?: string }>();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState(params.email ?? '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const passwordRef = useRef<TextInput>(null);
  const confirmationRef = useRef<TextInput>(null);
  const normalizedEmail = email.trim().toLowerCase();

  async function sendCode() {
    if (!EMAIL.test(normalizedEmail)) {
      setError('Informe um e-mail válido.');
      return;
    }

    setError(null);
    setIsBusy(true);

    try {
      setNotice(await requestPasswordReset(normalizedEmail));
      setStep('code');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível enviar o código.');
    } finally {
      setIsBusy(false);
    }
  }

  async function saveNewPassword() {
    if (!/^\d{6}$/.test(code.trim())) {
      setError('O código tem 6 números.');
      return;
    }

    if (password.length < 6) {
      setError('A senha precisa ter pelo menos 6 caracteres.');
      return;
    }

    if (password !== confirmation) {
      setError('As senhas precisam ser iguais.');
      return;
    }

    setError(null);
    setIsBusy(true);

    try {
      await confirmPasswordReset(normalizedEmail, code.trim(), password);
      setNotice(null);
      setStep('done');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível trocar a senha.');
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <AuthSheetLayout
      footerAction="Entrar"
      footerText="Lembrou a senha?"
      keyboardOffset={200}
      onFooterPress={() => router.replace('/(auth)/login')}
      subtitle={
        step === 'email'
          ? 'Enviamos um código para o seu e-mail.'
          : step === 'code'
            ? 'Digite o código e escolha a senha nova.'
            : 'Pronto. Entre com a senha nova.'
      }
      title={['Nova\n', 'senha', '']}>
      <View style={styles.form}>
        {step === 'email' ? (
          <>
            <Animated.View entering={FadeInDown.delay(160).duration(450)}>
              <Input
                autoCapitalize="none"
                autoComplete="email"
                icon="mail-outline"
                keyboardType="email-address"
                onChangeText={(text) => {
                  setEmail(text);
                  setError(null);
                }}
                onSubmitEditing={() => void sendCode()}
                placeholder="E-mail da conta"
                returnKeyType="send"
                textContentType="emailAddress"
                value={email}
              />
            </Animated.View>
            <Text style={styles.hint}>
              O código vale por 15 minutos. Se você não tiver conta com este e-mail, nada chega, e a tela
              segue igual: é assim que ninguém descobre quem tem cadastro.
            </Text>
          </>
        ) : null}

        {step === 'code' ? (
          <>
            <Animated.View entering={FadeInDown.duration(400)}>
              <Input
                autoComplete="one-time-code"
                icon="key-outline"
                keyboardType="number-pad"
                maxLength={6}
                onChangeText={(text) => {
                  setCode(text.replace(/\D/g, ''));
                  setError(null);
                }}
                onSubmitEditing={() => passwordRef.current?.focus()}
                placeholder="Código de 6 números"
                returnKeyType="next"
                submitBehavior="submit"
                textContentType="oneTimeCode"
                value={code}
              />
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(60).duration(400)} style={styles.passwordGroup}>
              <Input
                autoCapitalize="none"
                autoComplete="new-password"
                icon="lock-closed-outline"
                onChangeText={(text) => {
                  setPassword(text);
                  setError(null);
                }}
                onSubmitEditing={() => confirmationRef.current?.focus()}
                placeholder="Nova senha"
                ref={passwordRef}
                returnKeyType="next"
                secureTextEntry
                submitBehavior="submit"
                textContentType="newPassword"
                value={password}
              />
              <PasswordStrength password={password} />
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(120).duration(400)}>
              <Input
                autoCapitalize="none"
                autoComplete="new-password"
                icon="shield-checkmark-outline"
                onChangeText={(text) => {
                  setConfirmation(text);
                  setError(null);
                }}
                onSubmitEditing={() => void saveNewPassword()}
                placeholder="Confirme a nova senha"
                ref={confirmationRef}
                returnKeyType="go"
                secureTextEntry
                textContentType="newPassword"
                value={confirmation}
              />
            </Animated.View>
          </>
        ) : null}

        {notice ? (
          <Animated.Text accessibilityLiveRegion="polite" entering={FadeIn} style={styles.notice}>
            {notice}
          </Animated.Text>
        ) : null}

        {error ? (
          <Animated.Text accessibilityLiveRegion="polite" entering={FadeIn} style={styles.error}>
            {error}
          </Animated.Text>
        ) : null}

        <Animated.View entering={FadeInDown.delay(300).duration(450)} style={styles.ctaGlow}>
          {step === 'email' ? (
            <Button haptic icon="mail-outline" loading={isBusy} onPress={() => void sendCode()} title="Enviar código" />
          ) : step === 'code' ? (
            <Button haptic icon="checkmark" loading={isBusy} onPress={() => void saveNewPassword()} title="Salvar nova senha" />
          ) : (
            <Button
              haptic
              icon="arrow-forward"
              iconPosition="right"
              onPress={() => router.replace({ params: { email: normalizedEmail }, pathname: '/(auth)/login' })}
              title="Entrar com a senha nova"
            />
          )}
        </Animated.View>

        {step === 'code' ? (
          <Text
            accessibilityRole="button"
            onPress={() => void sendCode()}
            style={styles.resend}>
            Não chegou? Enviar outro código
          </Text>
        ) : null}
      </View>
    </AuthSheetLayout>
  );
}

const useStyles = makeStyles((theme) => ({
  form: {
    gap: 14,
  },
  passwordGroup: {
    gap: 10,
  },
  hint: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 19,
  },
  notice: {
    color: theme.status.info,
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 20,
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
  resend: {
    color: theme.text.secondary,
    fontFamily: fonts.semibold,
    fontSize: 14,
    paddingVertical: 8,
    textAlign: 'center',
  },
}));
