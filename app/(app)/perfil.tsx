import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Image, Platform, Pressable, Text, View, type TextInput } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { PasswordStrength } from '@/src/components/auth/PasswordStrength';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { Screen } from '@/src/components/ui/Screen';
import { AuroraBackground } from '@/src/components/visual/AuroraBackground';
import { useSession } from '@/src/contexts/session-context';
import { BODY_LIMITS } from '@/src/schemas/onboarding';
import { ApiError } from '@/src/services/api';
import { changePassword } from '@/src/services/auth';
import { getBodyTrend, saveMeasurement } from '@/src/services/body';
import { getOnboardingProfile, updateOnboardingProfile } from '@/src/services/onboarding';
import { getProfilePhoto, pickProfilePhoto, removeProfilePhoto } from '@/src/services/profile-photo';
import { fonts, makeStyles, radius, typography, useTheme, withAlpha } from '@/src/theme';
import {
  currentJourneyLevel,
  hasJourneyAnswers,
  journeyLabel,
  journeyLevels,
  targetJourneyLevel,
  type JourneyLevel,
} from '@/src/utils/journey';

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

  return (
    <Screen edges={['top', 'right', 'left']}>
      {/* Rola até o campo em foco e deixa o botão de baixo à vista, mesmo com a mensagem de
          erro entre os dois. */}
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

        <CoverPhotoCard />
        <NameCard />
        <BodyGoalCard />
        <PasswordCard />
        <DeleteAccountCard />
      </KeyboardAwareScrollView>
    </Screen>
  );
}

function CoverPhotoCard() {
  const styles = useStyles();
  const { session } = useSession();
  const userId = session?.user.id;
  const [uri, setUri] = useState<string | null>(null);
  const [isPicking, setIsPicking] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (userId) {
        void getProfilePhoto(userId).then(setUri);
      }
    }, [userId]),
  );

  async function choose() {
    if (!userId) {
      return;
    }

    setIsPicking(true);

    try {
      const picked = await pickProfilePhoto(userId);

      if (picked) {
        setUri(picked);
      }
    } catch {
      Alert.alert('Foto de capa', 'Não foi possível usar essa imagem. Tente outra.');
    } finally {
      setIsPicking(false);
    }
  }

  async function remove() {
    if (userId) {
      await removeProfilePhoto(userId);
      setUri(null);
    }
  }

  return (
    <View style={styles.card}>
      <Text accessibilityRole="header" style={styles.cardTitle}>
        Foto de capa
      </Text>
      <View style={styles.cover}>
        {uri ? (
          <Image
            accessibilityIgnoresInvertColors
            accessibilityLabel="Sua foto de capa"
            resizeMode="cover"
            source={{ uri }}
            style={styles.coverImage}
          />
        ) : (
          // Sem foto, a capa da home é a luz aurora do tema.
          <AuroraBackground intensity="hero" />
        )}
      </View>
      <Text style={styles.cardText}>Aparece no topo da tela inicial e fica só neste aparelho.</Text>
      <Button
        icon="image-outline"
        loading={isPicking}
        onPress={choose}
        title={uri ? 'Trocar foto' : 'Escolher foto'}
        variant="outline"
      />
      {uri ? <Button onPress={remove} title="Remover foto" variant="ghost" /> : null}
    </View>
  );
}

function NameCard() {
  const styles = useStyles();
  const { theme } = useTheme();
  const { session, updateName } = useSession();
  const savedName = session?.user.name ?? '';
  const [name, setName] = useState(savedName);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  function changeName(text: string) {
    setName(text);
    setError(null);
    setIsSaved(false);
  }

  async function handleSave() {
    const trimmed = name.trim();

    if (trimmed.length < 2) {
      setError('Informe seu nome.');
      return;
    }

    setIsSaving(true);

    try {
      await updateName(trimmed);
      setName(trimmed);
      setIsSaved(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível salvar o nome.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <View style={styles.card}>
      <Input
        autoCapitalize="words"
        autoComplete="name"
        error={error ?? undefined}
        helperText="É o nome que aparece no placar dos desafios."
        label="Nome"
        maxLength={80}
        onChangeText={changeName}
        onSubmitEditing={handleSave}
        returnKeyType="done"
        textContentType="name"
        value={name}
      />
      <Button
        disabled={name.trim() === savedName}
        loading={isSaving}
        onPress={handleSave}
        title="Salvar nome"
        variant="outline"
      />
      {isSaved ? (
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
  );
}

type BodyGoal = { heightCm?: number; targetLevel: JourneyLevel; weightKg?: number };
type BodyGoalErrors = { form?: string; height?: string; weight?: string };

// "82,5" → 82.5. Vazio, ou o que não for número, vira undefined.
function parseDecimal(text: string) {
  const value = Number(text.trim().replace(',', '.'));
  return text.trim() && Number.isFinite(value) ? value : undefined;
}

function decimalText(value?: number) {
  return value === undefined ? '' : String(value).replace('.', ',');
}

// Os mesmos limites do questionário.
function validateBody(weightKg?: number, heightCm?: number) {
  const errors: BodyGoalErrors = {};
  const { heightCm: height, weightKg: weight } = BODY_LIMITS;

  if (weightKg === undefined || weightKg < weight.min || weightKg > weight.max) {
    errors.weight = `Informe um peso entre ${weight.min} e ${weight.max} kg.`;
  }

  if (heightCm === undefined || heightCm < height.min || heightCm > height.max) {
    errors.height = `Informe uma altura entre ${height.min} e ${height.max} cm.`;
  }

  return errors;
}

// Peso, altura e objetivo são respostas do questionário e ficam só no aparelho. O peso mostrado é o
// atual: o da última pesagem na Evolução ou, sem nenhuma, o do questionário.
function BodyGoalCard() {
  const styles = useStyles();
  const { theme } = useTheme();
  const { session } = useSession();
  const userId = session?.user.id;
  const [saved, setSaved] = useState<BodyGoal | null>(null);
  const [currentLevel, setCurrentLevel] = useState<JourneyLevel | null>(null);
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [target, setTarget] = useState<JourneyLevel>('evolution');
  const [errors, setErrors] = useState<BodyGoalErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const weightKg = parseDecimal(weight);
  const heightCm = parseDecimal(height);
  const hasChanges =
    saved !== null && (weightKg !== saved.weightKg || heightCm !== saved.heightCm || target !== saved.targetLevel);

  useEffect(() => {
    if (!userId) {
      return;
    }

    let active = true;

    // Sem o banco local (no navegador), vale o peso do questionário.
    void Promise.all([getOnboardingProfile(userId), getBodyTrend().catch(() => null)]).then(([profile, trend]) => {
      if (!active) {
        return;
      }

      const answers = profile ?? {};
      const values: BodyGoal = {
        heightCm: answers.heightCm,
        targetLevel: targetJourneyLevel(answers),
        weightKg: trend?.latest?.weightKg ?? answers.weightKg,
      };

      setSaved(values);
      setCurrentLevel(hasJourneyAnswers(profile) ? currentJourneyLevel(profile) : null);
      setWeight(decimalText(values.weightKg));
      setHeight(decimalText(values.heightCm));
      setTarget(values.targetLevel);
    });

    return () => {
      active = false;
    };
  }, [userId]);

  function changed(field: keyof BodyGoalErrors) {
    setErrors((previous) => ({ ...previous, [field]: undefined, form: undefined }));
    setIsSaved(false);
  }

  async function handleSave() {
    const found = validateBody(weightKg, heightCm);
    setErrors(found);

    if (Object.keys(found).length > 0 || weightKg === undefined || heightCm === undefined || !saved || !userId) {
      return;
    }

    setIsSaving(true);

    try {
      // Peso diferente do atual é uma pesagem nova: entra na Evolução com a data de hoje.
      if (weightKg !== saved.weightKg) {
        await saveMeasurement({ takenAt: Date.now(), weightKg });
      }

      await updateOnboardingProfile(userId, { heightCm, targetLevel: target, weightKg });
      setSaved({ heightCm, targetLevel: target, weightKg });
      setWeight(decimalText(weightKg));
      setHeight(decimalText(heightCm));
      setIsSaved(true);
    } catch {
      setErrors({ form: 'Não foi possível salvar. Tente de novo.' });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <View style={styles.card}>
      <Text accessibilityRole="header" style={styles.cardTitle}>
        Corpo e objetivo
      </Text>
      <Text style={styles.cardText}>Vêm do questionário do início e ficam só neste aparelho.</Text>
      <Input
        error={errors.weight}
        helperText="Se mudar, o peso novo entra também na Evolução, como a pesagem de hoje."
        keyboardType="decimal-pad"
        label="Peso atual"
        maxLength={6}
        onChangeText={(text) => {
          setWeight(text);
          changed('weight');
        }}
        placeholder="Ex: 83"
        rightText="kg"
        value={weight}
      />
      <Input
        error={errors.height}
        keyboardType="decimal-pad"
        label="Altura"
        maxLength={5}
        onChangeText={(text) => {
          setHeight(text);
          changed('height');
        }}
        placeholder="Ex: 170"
        rightText="cm"
        value={height}
      />

      <View style={styles.goalGroup}>
        <Text style={styles.fieldLabel}>Objetivo</Text>
        <View accessibilityLabel="Objetivo" accessibilityRole="radiogroup" style={styles.goalGrid}>
          {journeyLevels.map((level) => {
            const isSelected = level.value === target;

            return (
              <Pressable
                accessibilityLabel={`${level.label}: ${level.description}`}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
                key={level.value}
                onPress={() => {
                  setTarget(level.value);
                  changed('form');
                }}
                style={({ pressed }) => [
                  styles.goalOption,
                  isSelected ? styles.goalOptionSelected : null,
                  pressed ? styles.pressed : null,
                ]}>
                <Text style={styles.goalLabel}>{level.label}</Text>
                <Text style={styles.goalDescription}>{level.description}</Text>
              </Pressable>
            );
          })}
        </View>
        {currentLevel ? (
          <Text style={styles.goalHint}>Pelas suas respostas, hoje você está em {journeyLabel(currentLevel)}.</Text>
        ) : null}
      </View>

      {errors.form ? (
        <Text accessibilityLiveRegion="polite" style={styles.formError}>
          {errors.form}
        </Text>
      ) : null}
      <Button disabled={!hasChanges} loading={isSaving} onPress={handleSave} title="Salvar" variant="outline" />
      {isSaved ? (
        <View accessibilityLiveRegion="polite" style={styles.savedRow}>
          <Ionicons color={theme.status.success} name="checkmark-circle" size={18} />
          <Text style={styles.savedText}>Dados atualizados.</Text>
        </View>
      ) : null}
    </View>
  );
}

type PasswordErrors = { confirmation?: string; current?: string; form?: string; next?: string };

// Mesmas regras e mensagens do cadastro e do servidor.
function validatePasswords(current: string, next: string, confirmation: string) {
  const errors: PasswordErrors = {};

  if (!current) {
    errors.current = 'Informe sua senha atual.';
  }

  if (next.length < 6) {
    errors.next = 'A senha precisa ter pelo menos 6 caracteres.';
  } else if (next === current) {
    errors.next = 'A nova senha precisa ser diferente da atual.';
  }

  if (!confirmation) {
    errors.confirmation = 'Confirme a nova senha.';
  } else if (confirmation !== next) {
    errors.confirmation = 'As senhas precisam ser iguais.';
  }

  return errors;
}

function PasswordCard() {
  const styles = useStyles();
  const { theme } = useTheme();
  const { session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [errors, setErrors] = useState<PasswordErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isChanged, setIsChanged] = useState(false);
  const nextRef = useRef<TextInput>(null);
  const confirmationRef = useRef<TextInput>(null);

  function close() {
    setIsOpen(false);
    setCurrent('');
    setNext('');
    setConfirmation('');
    setErrors({});
  }

  async function handleSave() {
    const found = validatePasswords(current, next, confirmation);
    setErrors(found);

    if (Object.keys(found).length > 0 || !session) {
      return;
    }

    setIsSaving(true);

    try {
      await changePassword(session, current, next);
      close();
      setIsChanged(true);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Não foi possível trocar a senha.';
      const code = reason instanceof ApiError ? reason.code : undefined;

      if (code === 'INVALID_CREDENTIALS') {
        setErrors({ current: message });
      } else if (code === 'SAME_PASSWORD' || code === 'INVALID_INPUT') {
        setErrors({ next: message });
      } else {
        setErrors({ form: message });
      }
    } finally {
      setIsSaving(false);
    }
  }

  if (!isOpen) {
    return (
      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.cardTitle}>
          Senha
        </Text>
        {isChanged ? (
          <View accessibilityLiveRegion="polite" style={styles.savedRow}>
            <Ionicons color={theme.status.success} name="checkmark-circle" size={18} />
            <Text style={styles.savedText}>Senha trocada.</Text>
          </View>
        ) : null}
        <Text style={styles.cardText}>
          Ao trocar a senha, quem estiver com a sua conta aberta em outro aparelho precisa entrar de novo.
        </Text>
        <Button
          icon="key-outline"
          onPress={() => {
            setIsChanged(false);
            setIsOpen(true);
          }}
          title="Trocar senha"
          variant="outline"
        />
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text accessibilityRole="header" style={styles.cardTitle}>
        Trocar senha
      </Text>
      <Input
        autoCapitalize="none"
        autoComplete="current-password"
        error={errors.current}
        label="Senha atual"
        onChangeText={(text) => {
          setCurrent(text);
          setErrors((previous) => ({ ...previous, current: undefined, form: undefined }));
        }}
        onSubmitEditing={() => nextRef.current?.focus()}
        returnKeyType="next"
        secureTextEntry
        submitBehavior="submit"
        textContentType="password"
        value={current}
      />
      <View style={styles.passwordGroup}>
        <Input
          autoCapitalize="none"
          autoComplete="new-password"
          error={errors.next}
          label="Nova senha"
          onChangeText={(text) => {
            setNext(text);
            setErrors((previous) => ({ ...previous, form: undefined, next: undefined }));
          }}
          onSubmitEditing={() => confirmationRef.current?.focus()}
          ref={nextRef}
          returnKeyType="next"
          secureTextEntry
          submitBehavior="submit"
          textContentType="newPassword"
          value={next}
        />
        <PasswordStrength password={next} />
      </View>
      <Input
        autoCapitalize="none"
        autoComplete="new-password"
        error={errors.confirmation}
        label="Confirme a nova senha"
        onChangeText={(text) => {
          setConfirmation(text);
          setErrors((previous) => ({ ...previous, confirmation: undefined, form: undefined }));
        }}
        onSubmitEditing={handleSave}
        ref={confirmationRef}
        returnKeyType="done"
        secureTextEntry
        textContentType="newPassword"
        value={confirmation}
      />
      {errors.form ? (
        <Text accessibilityLiveRegion="polite" style={styles.formError}>
          {errors.form}
        </Text>
      ) : null}
      <Button loading={isSaving} onPress={handleSave} title="Salvar nova senha" />
      <Button disabled={isSaving} onPress={close} title="Cancelar" variant="ghost" />
    </View>
  );
}

function DeleteAccountCard() {
  const styles = useStyles();
  const { deleteAccount } = useSession();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  function handleDelete() {
    if (!password) {
      setError('Digite sua senha para confirmar.');
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
        setError(reason instanceof Error ? reason.message : 'Não foi possível apagar a conta.');
        setIsDeleting(false);
      }
    });
  }

  return (
    <View style={[styles.card, styles.dangerCard]}>
      <Text accessibilityRole="header" style={styles.dangerTitle}>
        Apagar conta
      </Text>
      <Text style={styles.cardText}>
        Sua conta sai do servidor com os treinos enviados, e você deixa os desafios (eles continuam para os outros
        participantes). Neste aparelho, saem os treinos, as medidas, as fotos e as respostas do questionário. Não dá
        para desfazer.
      </Text>
      <Input
        autoCapitalize="none"
        autoComplete="current-password"
        error={error ?? undefined}
        label="Senha"
        onChangeText={(text) => {
          setPassword(text);
          setError(null);
        }}
        onSubmitEditing={handleDelete}
        placeholder="Digite sua senha para confirmar"
        returnKeyType="done"
        secureTextEntry
        textContentType="password"
        value={password}
      />
      <Button icon="trash-outline" loading={isDeleting} onPress={handleDelete} title="Apagar minha conta" variant="danger" />
    </View>
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
  cardTitle: {
    color: theme.text.primary,
    fontFamily: fonts.extrabold,
    fontSize: 18,
  },
  cardText: {
    color: theme.text.secondary,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  cover: {
    aspectRatio: 3 / 2,
    backgroundColor: theme.bg.surface,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  coverImage: {
    height: '100%',
    width: '100%',
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
  passwordGroup: {
    gap: 10,
  },
  fieldLabel: {
    ...typography.caption,
    color: theme.text.primary,
  },
  goalGroup: {
    gap: 8,
  },
  goalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  // Duas por linha: "Performance" não cabe em quatro colunas num celular de 360 dp.
  goalOption: {
    backgroundColor: theme.bg.surface,
    borderColor: theme.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    flexBasis: '40%',
    flexGrow: 1,
    gap: 2,
    minHeight: 64,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  goalOptionSelected: {
    backgroundColor: theme.accent.soft,
    borderColor: theme.accent.primary,
  },
  goalLabel: {
    color: theme.text.primary,
    fontFamily: fonts.bold,
    fontSize: 15,
  },
  goalDescription: {
    color: theme.text.secondary,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
  },
  goalHint: {
    color: theme.text.secondary,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
  },
  formError: {
    color: theme.status.danger,
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
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
  pressed: {
    opacity: 0.75,
  },
}));
