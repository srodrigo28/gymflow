import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Share, Text, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { Screen } from '@/src/components/ui/Screen';
import { useSession } from '@/src/contexts/session-context';
import {
  getPersonalPhrase,
  getPhraseOfTheDay,
  PERSONAL_PHRASE_MAX_LENGTH,
  phraseShareMessage,
  pickAnotherPhrase,
  removePersonalPhrase,
  savePersonalPhrase,
} from '@/src/services/phrases';
import { fonts, makeStyles, radius, typography, useTheme, withAlpha } from '@/src/theme';
import type { PersonalPhrase } from '@/src/types/phrases';
import { formatShortDate } from '@/src/utils/format';

// De onde veio a última frase guardada, para o aviso aparecer no cartão certo.
type SavedFrom = 'daily' | 'draft';

export default function FraseScreen() {
  const styles = useStyles();
  const { theme } = useTheme();
  const { session } = useSession();
  const userId = session?.user.id;
  // Calculada a cada render: se a tela ficar aberta na virada do dia, a próxima interação já
  // mostra a frase nova.
  const daily = getPhraseOfTheDay();
  const [alternative, setAlternative] = useState<string | null>(null);
  const [personal, setPersonal] = useState<PersonalPhrase | null>(null);
  const [draft, setDraft] = useState('');
  const [draftError, setDraftError] = useState<string | null>(null);
  const [savedFrom, setSavedFrom] = useState<SavedFrom | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const current = alternative ?? daily;
  const isCurrentSaved = personal?.text === current;

  useEffect(() => {
    if (!userId) {
      return;
    }

    let active = true;

    void getPersonalPhrase(userId).then((phrase) => {
      if (active) {
        setPersonal(phrase);
      }
    });

    return () => {
      active = false;
    };
  }, [userId]);

  async function keep(text: string, from: SavedFrom) {
    if (!userId) {
      return;
    }

    setIsSaving(true);

    try {
      setPersonal(await savePersonalPhrase(userId, text));
      setDraft('');
      setDraftError(null);
      setSavedFrom(from);
    } catch (reason) {
      setDraftError(reason instanceof Error ? reason.message : 'Não foi possível guardar a frase.');
    } finally {
      setIsSaving(false);
    }
  }

  async function remove() {
    if (!userId) {
      return;
    }

    await removePersonalPhrase(userId);
    setPersonal(null);
    setSavedFrom(null);
  }

  // Só o app escolhido na folha de compartilhamento recebe o texto. Cancelar não é erro.
  function share(text: string) {
    void Share.share({ message: phraseShareMessage(text) }).catch(() => undefined);
  }

  return (
    <Screen edges={['top', 'right', 'left']}>
      {/* O campo de escrever fica no fim da tela: rola até ele quando o teclado abre. */}
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
            Frase do dia
          </Text>
        </View>

        {personal ? (
          <View style={styles.personalCard}>
            <View style={styles.cardHeader}>
              <View style={styles.headerText}>
                <View style={styles.overlineRow}>
                  <MaterialCommunityIcons color={theme.domain.mente} name="format-quote-close" size={18} />
                  <Text style={[styles.overline, { color: theme.domain.mente }]}>Minha frase</Text>
                </View>
                <Text style={styles.savedAt}>guardada em {formatShortDate(personal.savedAt)}</Text>
              </View>
              <View style={styles.actionsRow}>
                <IconAction
                  icon="share-social-outline"
                  label="Compartilhar minha frase"
                  onPress={() => share(personal.text)}
                />
                <IconAction icon="trash-outline" label="Remover minha frase" onPress={remove} />
              </View>
            </View>
            <Text style={styles.personalText}>{personal.text}</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.headerText}>
              <Text style={styles.overline}>{alternative ? 'Outra da lista' : 'Frase de hoje'}</Text>
              {alternative ? (
                <Pressable
                  accessibilityLabel="Voltar à frase de hoje"
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={() => setAlternative(null)}
                  style={({ pressed }) => (pressed ? styles.pressed : null)}>
                  <Text style={styles.linkText}>Voltar à de hoje</Text>
                </Pressable>
              ) : null}
            </View>
            <IconAction icon="share-social-outline" label="Compartilhar esta frase" onPress={() => share(current)} />
          </View>
          <Text style={styles.dailyText}>{current}</Text>
          <Button
            icon="shuffle-outline"
            onPress={() => setAlternative(pickAnotherPhrase(current))}
            title="Outra frase"
            variant="outline"
          />
          <Button
            disabled={isCurrentSaved || isSaving}
            haptic
            icon="bookmark-outline"
            onPress={() => keep(current, 'daily')}
            title={isCurrentSaved ? 'Já é a sua frase' : 'Guardar como minha frase'}
          />
          {personal && !isCurrentSaved ? <Text style={styles.hint}>Substitui a frase guardada.</Text> : null}
          {savedFrom === 'daily' ? <SavedNotice /> : null}
        </View>

        <View style={styles.card}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            Escreva a sua
          </Text>
          <Input
            autoCapitalize="sentences"
            error={draftError ?? undefined}
            helperText={`${draft.length}/${PERSONAL_PHRASE_MAX_LENGTH}`}
            label="Minha frase"
            maxLength={PERSONAL_PHRASE_MAX_LENGTH}
            onChangeText={(text) => {
              setDraft(text);
              setDraftError(null);
              setSavedFrom(null);
            }}
            onSubmitEditing={() => keep(draft, 'draft')}
            placeholder="Curta, do seu jeito"
            returnKeyType="done"
            value={draft}
          />
          <Button
            disabled={!draft.trim()}
            haptic
            loading={isSaving}
            onPress={() => keep(draft, 'draft')}
            title="Guardar minha frase"
            variant="outline"
          />
          {savedFrom === 'draft' ? <SavedNotice /> : null}
        </View>

        <Text style={styles.privacy}>
          Sua frase fica só neste aparelho. Nada é publicado enquanto você não compartilhar.
        </Text>
      </KeyboardAwareScrollView>
    </Screen>
  );
}

function IconAction({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const styles = useStyles();
  const { theme } = useTheme();

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.iconButton, pressed ? styles.pressed : null]}>
      <Ionicons color={theme.text.primary} name={icon} size={18} />
    </Pressable>
  );
}

function SavedNotice() {
  const styles = useStyles();
  const { theme } = useTheme();

  return (
    <View accessibilityLiveRegion="polite" style={styles.savedRow}>
      <Ionicons color={theme.status.success} name="checkmark-circle" size={18} />
      <Text style={styles.savedText}>Frase guardada.</Text>
    </View>
  );
}

const useStyles = makeStyles((theme) => ({
  content: {
    alignSelf: 'center',
    gap: 14,
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
  personalCard: {
    backgroundColor: withAlpha(theme.domain.mente, 0.1),
    borderColor: withAlpha(theme.domain.mente, 0.45),
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  card: {
    backgroundColor: theme.bg.surface,
    borderColor: theme.border.subtle,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  overlineRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  overline: {
    ...typography.overline,
    color: theme.text.muted,
  },
  savedAt: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 12,
  },
  personalText: {
    color: theme.text.primary,
    fontFamily: fonts.bold,
    fontSize: 20,
    lineHeight: 28,
  },
  dailyText: {
    color: theme.text.primary,
    fontFamily: fonts.extrabold,
    fontSize: 24,
    letterSpacing: -0.3,
    lineHeight: 32,
    paddingVertical: 4,
  },
  linkText: {
    color: theme.accent.primary,
    fontFamily: fonts.bold,
    fontSize: 13,
  },
  hint: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 12,
    textAlign: 'center',
  },
  sectionTitle: {
    color: theme.text.primary,
    fontFamily: fonts.extrabold,
    fontSize: 16,
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
  privacy: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  pressed: {
    opacity: 0.75,
  },
}));
