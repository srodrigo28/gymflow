import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { Screen } from '@/src/components/ui/Screen';
import {
  dayExampleMeals,
  eatingStyles,
  findEatingStyle,
  NUTRITION_DISCLAIMER,
} from '@/src/constants/eating-styles';
import { useSession } from '@/src/contexts/session-context';
import { getEatingStyle, setEatingStyle } from '@/src/services/nutrition';
import { getOnboardingProfile } from '@/src/services/onboarding';
import { fonts, makeStyles, radius, typography, useTheme, withAlpha } from '@/src/theme';
import type { EatingStyle, EatingStyleId, EatingStyleSuggestion } from '@/src/types/nutrition';
import { suggestEatingStyle } from '@/src/utils/nutrition';

const styleIcons: Record<EatingStyleId, keyof typeof MaterialCommunityIcons.glyphMap> = {
  equilibrada: 'scale-balance',
  mais_proteina: 'egg-outline',
  mediterranea: 'fish',
  menos_acucar: 'cup-off-outline',
  pratica: 'clock-fast',
  vegetariana: 'leaf',
};

export default function AlimentacaoIdealScreen() {
  const styles = useStyles();
  const { theme } = useTheme();
  const { session } = useSession();
  const userId = session?.user.id;
  const [chosen, setChosen] = useState<EatingStyleId | null>(null);
  const [suggestion, setSuggestion] = useState<EatingStyleSuggestion | null>(null);
  const [declinedTips, setDeclinedTips] = useState(false);
  const [expanded, setExpanded] = useState<EatingStyleId | null>(null);
  const hasOpened = useRef(false);

  const load = useCallback(async () => {
    if (!userId) {
      return;
    }

    const [saved, profile] = await Promise.all([getEatingStyle(userId), getOnboardingProfile(userId)]);
    const suggested = suggestEatingStyle(profile);

    setChosen(saved);
    setSuggestion(suggested);
    setDeclinedTips(profile?.wantsNutritionTips === 'no');

    // O escolhido abre expandido; sem escolha, abre o sugerido. Só na primeira carga, para não
    // fechar o que a pessoa abriu quando a tela volta ao foco.
    if (!hasOpened.current) {
      hasOpened.current = true;
      setExpanded(saved ?? suggested?.id ?? null);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function handleChoose(id: EatingStyleId) {
    if (!userId) {
      return;
    }

    const next = chosen === id ? null : id;
    setChosen(next);
    await setEatingStyle(userId, next);
  }

  const suggestedStyle = suggestion ? findEatingStyle(suggestion.id) : undefined;

  return (
    <Screen edges={['top', 'right', 'left']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
            Alimentação ideal
          </Text>
        </View>

        <Text style={styles.intro}>
          Seis jeitos de comer, sem dieta e sem contar calorias. Escolha um como o seu para ver as trocas práticas
          e um dia de exemplo.
        </Text>

        {suggestion && suggestedStyle ? (
          <View
            accessibilityLabel={`Sugestão para você: ${suggestedStyle.title}. ${suggestion.reason}`}
            accessible
            style={styles.suggestion}>
            <View style={styles.suggestionHeader}>
              <Ionicons color={theme.domain.alimentacao} name="sparkles-outline" size={16} />
              <Text style={styles.suggestionOverline}>Sugestão para você</Text>
            </View>
            <Text style={styles.suggestionTitle}>{suggestedStyle.title}</Text>
            <Text style={styles.suggestionReason}>{suggestion.reason}</Text>
          </View>
        ) : null}

        {declinedTips ? (
          <Text style={styles.quiet}>
            Você pediu para não receber dicas de alimentação agora, então nada fica em destaque. A lista está
            aqui se quiser olhar.
          </Text>
        ) : null}

        {eatingStyles.map((eatingStyle) => (
          <StyleCard
            eatingStyle={eatingStyle}
            isChosen={chosen === eatingStyle.id}
            isExpanded={expanded === eatingStyle.id}
            isSuggested={suggestion?.id === eatingStyle.id}
            key={eatingStyle.id}
            onChoose={() => handleChoose(eatingStyle.id)}
            onToggle={() => setExpanded((current) => (current === eatingStyle.id ? null : eatingStyle.id))}
          />
        ))}

        <Button
          icon="journal-outline"
          onPress={() => router.push('/(app)/alimentacao')}
          title="Ver diário"
          variant="outline"
        />

        <Text style={styles.footnote}>
          {NUTRITION_DISCLAIMER} Se faz acompanhamento de saúde, combine mudanças com quem acompanha você.
        </Text>
      </ScrollView>
    </Screen>
  );
}

type StyleCardProps = {
  eatingStyle: EatingStyle;
  isChosen: boolean;
  isExpanded: boolean;
  isSuggested: boolean;
  onChoose: () => void;
  onToggle: () => void;
};

function StyleCard({ eatingStyle, isChosen, isExpanded, isSuggested, onChoose, onToggle }: StyleCardProps) {
  const styles = useStyles();
  const { theme } = useTheme();
  const tags = [isChosen ? 'o meu' : null, isSuggested ? 'sugerido para você' : null].filter(Boolean).join(', ');

  return (
    <View
      style={[
        styles.styleCard,
        isSuggested ? styles.styleCardSuggested : null,
        isChosen ? styles.styleCardChosen : null,
      ]}>
      <Pressable
        accessibilityHint={
          isExpanded ? 'Recolhe os detalhes' : 'Mostra quando faz sentido, trocas práticas e um dia de exemplo'
        }
        accessibilityLabel={`${eatingStyle.title}${tags ? ` (${tags})` : ''}. ${eatingStyle.summary}`}
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
        onPress={onToggle}
        style={({ pressed }) => [styles.styleHeader, pressed ? styles.pressed : null]}>
        <View style={styles.styleIcon}>
          <MaterialCommunityIcons color={theme.domain.alimentacao} name={styleIcons[eatingStyle.id]} size={22} />
        </View>
        <View style={styles.styleText}>
          <View style={styles.styleTitleRow}>
            <Text style={styles.styleTitle}>{eatingStyle.title}</Text>
            {/* A etiqueta não é só cor: o texto diz o que o destaque significa. */}
            {isChosen ? (
              <View style={[styles.badge, { backgroundColor: theme.accent.soft }]}>
                <Text style={[styles.badgeText, { color: theme.accent.primary }]}>O meu</Text>
              </View>
            ) : isSuggested ? (
              <View style={[styles.badge, { backgroundColor: withAlpha(theme.domain.alimentacao, 0.16) }]}>
                <Text style={[styles.badgeText, { color: theme.domain.alimentacao }]}>Sugerido</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.styleSummary}>{eatingStyle.summary}</Text>
        </View>
        <Ionicons color={theme.text.muted} name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} />
      </Pressable>

      {isExpanded ? (
        <View style={styles.styleBody}>
          <Text style={styles.blockTitle}>Quando faz sentido</Text>
          <Text style={styles.blockText}>{eatingStyle.whenItFits}</Text>

          <Text style={styles.blockTitle}>Trocas práticas</Text>
          {eatingStyle.swaps.map((swap) => (
            <View
              accessibilityLabel={`Trocar ${swap.from} por ${swap.to}`}
              accessible
              key={swap.from}
              style={styles.swapRow}>
              <Ionicons color={theme.domain.alimentacao} name="swap-horizontal" size={16} style={styles.swapIcon} />
              <Text style={styles.swapText}>
                <Text style={styles.swapFrom}>{swap.from}</Text> → {swap.to}
              </Text>
            </View>
          ))}

          <Text style={styles.blockTitle}>Um dia de exemplo</Text>
          {dayExampleMeals.map((meal) => (
            <View
              accessibilityLabel={`${meal.label}: ${eatingStyle.dayExample[meal.key]}`}
              accessible
              key={meal.key}
              style={styles.exampleRow}>
              <Text style={styles.exampleLabel}>{meal.label}</Text>
              <Text style={styles.exampleText}>{eatingStyle.dayExample[meal.key]}</Text>
            </View>
          ))}

          <View style={styles.chooseButton}>
            <Button
              haptic
              icon={isChosen ? 'close' : 'checkmark'}
              onPress={onChoose}
              title={isChosen ? 'Deixar de ser o meu' : 'Escolher como o meu'}
              variant={isChosen ? 'outline' : 'primary'}
            />
          </View>
        </View>
      ) : null}
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
  intro: {
    color: theme.text.secondary,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  suggestion: {
    backgroundColor: withAlpha(theme.domain.alimentacao, 0.1),
    borderColor: withAlpha(theme.domain.alimentacao, 0.35),
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 4,
    padding: 16,
  },
  suggestionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  suggestionOverline: {
    ...typography.overline,
    color: theme.domain.alimentacao,
  },
  suggestionTitle: {
    color: theme.text.primary,
    fontFamily: fonts.extrabold,
    fontSize: 18,
    marginTop: 4,
  },
  suggestionReason: {
    color: theme.text.secondary,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  quiet: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 19,
  },
  styleCard: {
    backgroundColor: theme.bg.surface,
    borderColor: theme.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  styleCardSuggested: {
    borderColor: withAlpha(theme.domain.alimentacao, 0.45),
  },
  styleCardChosen: {
    borderColor: theme.accent.primary,
  },
  styleHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  styleIcon: {
    alignItems: 'center',
    backgroundColor: withAlpha(theme.domain.alimentacao, 0.16),
    borderRadius: radius.sm,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  styleText: {
    flex: 1,
    gap: 2,
  },
  styleTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  styleTitle: {
    color: theme.text.primary,
    flexShrink: 1,
    fontFamily: fonts.extrabold,
    fontSize: 16,
    lineHeight: 21,
  },
  badge: {
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    fontFamily: fonts.bold,
    fontSize: 11,
  },
  styleSummary: {
    color: theme.text.secondary,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  styleBody: {
    borderTopColor: theme.border.subtle,
    borderTopWidth: 1,
    gap: 8,
    padding: 14,
  },
  blockTitle: {
    color: theme.text.primary,
    fontFamily: fonts.bold,
    fontSize: 14,
    marginTop: 6,
  },
  blockText: {
    color: theme.text.secondary,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  swapRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 8,
  },
  swapIcon: {
    marginTop: 2,
  },
  swapText: {
    color: theme.text.secondary,
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  swapFrom: {
    color: theme.text.primary,
    fontFamily: fonts.semibold,
  },
  exampleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  exampleLabel: {
    color: theme.text.muted,
    fontFamily: fonts.semibold,
    fontSize: 13,
    lineHeight: 20,
    width: 60,
  },
  exampleText: {
    color: theme.text.secondary,
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  chooseButton: {
    marginTop: 6,
  },
  footnote: {
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
