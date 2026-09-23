import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, Text, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { Screen } from '@/src/components/ui/Screen';
import { useSession } from '@/src/contexts/session-context';
import { fonts, makeStyles, radius, typography, useTheme, withAlpha } from '@/src/theme';

const DELETE_TITLE = 'Apagar a conta?';
const DELETE_MESSAGE = 'Não dá para desfazer: a conta, os treinos, as medidas e as fotos saem para sempre.';

// No navegador, o Alert do React Native não mostra nada; lá a confirmação é a do próprio navegador.
function confirmDeletion(onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${DELETE_TITLE}\n\n${DELETE_MESSAGE}`)) {
      onConfirm();
    }

    return;
  }

  Alert.alert(DELETE_TITLE, DELETE_MESSAGE, [
    { style: 'cancel', text: 'Cancelar' },
    { onPress: onConfirm, style: 'destructive', text: 'Apagar' },
  ]);
}

export default function PerfilScreen() {
  const styles = useStyles();
  const { theme } = useTheme();
  const { deleteAccount, session, updateName } = useSession();
  const savedName = session?.user.name ?? '';
  const [name, setName] = useState(savedName);
  const [nameError, setNameError] = useState<string | null>(null);
  const [isNameSaved, setIsNameSaved] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  function changeName(text: string) {
    setName(text);
    setNameError(null);
    setIsNameSaved(false);
  }

  async function handleSaveName() {
    const trimmed = name.trim();

    if (trimmed.length < 2) {
      setNameError('Informe seu nome.');
      return;
    }

    setIsSavingName(true);

    try {
      await updateName(trimmed);
      setName(trimmed);
      setIsNameSaved(true);
    } catch (reason) {
      setNameError(reason instanceof Error ? reason.message : 'Não foi possível salvar o nome.');
    } finally {
      setIsSavingName(false);
    }
  }

  function handleDelete() {
    if (!password) {
      setPasswordError('Digite sua senha para confirmar.');
      return;
    }

    confirmDeletion(async () => {
      setIsDeleting(true);

      try {
        await deleteAccount(password);
        // A tela já saiu: o aviso aparece sobre a de boas-vindas.
        if (Platform.OS !== 'web') {
          Alert.alert('Conta apagada', 'Sua conta e os dados dela neste aparelho foram apagados.');
        }
      } catch (reason) {
        setPasswordError(reason instanceof Error ? reason.message : 'Não foi possível apagar a conta.');
        setIsDeleting(false);
      }
    });
  }

  return (
    <Screen edges={['top', 'right', 'left']}>
      {/* O campo de senha fica no fim da tela: rola até ele e deixa o botão à vista, mesmo
          com a mensagem de erro entre os dois. */}
      <KeyboardAwareScrollView
        bottomOffset={120}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Voltar"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(app)/home'))}
            style={({ pressed }) => [styles.iconButton, pressed ? styles.pressed : null]}>
            <Ionicons color={theme.text.primary} name="arrow-back" size={20} />
          </Pressable>
          <Text accessibilityRole="header" style={styles.title}>
            Perfil
          </Text>
        </View>

        <View style={styles.card}>
          <Input
            autoCapitalize="words"
            autoComplete="name"
            error={nameError ?? undefined}
            helperText="É o nome que aparece no placar dos desafios."
            label="Nome"
            maxLength={80}
            onChangeText={changeName}
            onSubmitEditing={handleSaveName}
            returnKeyType="done"
            textContentType="name"
            value={name}
          />
          <Button
            disabled={name.trim() === savedName}
            loading={isSavingName}
            onPress={handleSaveName}
            title="Salvar nome"
            variant="outline"
          />
          {isNameSaved ? (
            <View accessibilityLiveRegion="polite" style={styles.savedRow}>
              <Ionicons color={theme.status.success} name="checkmark-circle" size={18} />
              <Text style={styles.savedText}>Nome atualizado.</Text>
            </View>
          ) : null}

          <View style={styles.divider} />

          <View accessible style={styles.infoRow}>
            <Text style={styles.infoLabel}>E-mail</Text>
            <Text selectable style={styles.infoValue}>
              {session?.user.email}
            </Text>
          </View>
        </View>

        <View style={[styles.card, styles.dangerCard]}>
          <Text accessibilityRole="header" style={styles.dangerTitle}>
            Apagar conta
          </Text>
          <Text style={styles.dangerText}>
            Sua conta sai do servidor com os treinos enviados, e você deixa os desafios (eles continuam para os
            outros participantes). Neste aparelho, saem os treinos, as medidas, as fotos de evolução e as
            respostas do questionário. Não dá para desfazer.
          </Text>
          <Input
            autoCapitalize="none"
            autoComplete="current-password"
            error={passwordError ?? undefined}
            label="Senha"
            onChangeText={(text) => {
              setPassword(text);
              setPasswordError(null);
            }}
            onSubmitEditing={handleDelete}
            placeholder="Digite sua senha para confirmar"
            returnKeyType="done"
            secureTextEntry
            textContentType="password"
            value={password}
          />
          <Button
            icon="trash-outline"
            loading={isDeleting}
            onPress={handleDelete}
            title="Apagar minha conta"
            variant="danger"
          />
        </View>
      </KeyboardAwareScrollView>
    </Screen>
  );
}

const useStyles = makeStyles((theme) => ({
  content: {
    alignSelf: 'center',
    gap: 16,
    maxWidth: 560,
    paddingBottom: 40,
    paddingHorizontal: 20,
    paddingTop: 12,
    width: '100%',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: theme.bg.surface,
    borderColor: theme.border.subtle,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  title: {
    ...typography.h1,
    color: theme.text.primary,
    flex: 1,
  },
  card: {
    backgroundColor: theme.bg.raised,
    borderColor: theme.border.subtle,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: 14,
    padding: 16,
  },
  savedRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
  },
  savedText: {
    color: theme.status.success,
    fontFamily: fonts.semibold,
    fontSize: 14,
  },
  divider: {
    backgroundColor: theme.border.subtle,
    height: 1,
  },
  infoRow: {
    gap: 4,
  },
  infoLabel: {
    ...typography.caption,
    color: theme.text.secondary,
  },
  infoValue: {
    color: theme.text.primary,
    fontFamily: fonts.medium,
    fontSize: 16,
  },
  dangerCard: {
    backgroundColor: withAlpha(theme.status.danger, 0.06),
    borderColor: withAlpha(theme.status.danger, 0.4),
  },
  dangerTitle: {
    color: theme.status.danger,
    fontFamily: fonts.extrabold,
    fontSize: 18,
  },
  dangerText: {
    color: theme.text.secondary,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  pressed: {
    opacity: 0.75,
  },
}));
