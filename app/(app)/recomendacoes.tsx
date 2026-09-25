import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState, type ComponentProps } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { Screen } from '@/src/components/ui/Screen';
import { useSession } from '@/src/contexts/session-context';
import { getRecommendations, type Recommendation } from '@/src/services/recommendations';
import { fonts, makeStyles, radius, typography, useTheme, withAlpha, type DomainName } from '@/src/theme';

const toneIcon: Record<DomainName, ComponentProps<typeof MaterialCommunityIcons>['name']> = {
  agua: 'cup-water',
  alimentacao: 'food-apple-outline',
  conquista: 'trophy-outline',
  mente: 'head-heart-outline',
  sono: 'sleep',
  treino: 'dumbbell',
};

export default function RecomendacoesScreen() {
  const styles = useStyles();
  const { theme } = useTheme();
  const { session } = useSession();
  const [items, setItems] = useState<Recommendation[] | null>(null);
  const userId = session?.user.id;
  const consentAt = session?.user.bodyDataConsentAt ?? null;

  useFocusEffect(
    useCallback(() => {
      if (!userId) {
        return;
      }

      let isActive = true;
      getRecommendations({ consentAt, userId })
        .then((list) => {
          if (isActive) {
            setItems(list);
          }
        })
        .catch(() => {
          if (isActive) {
            setItems([]);
          }
        });

      return () => {
        isActive = false;
      };
    }, [consentAt, userId]),
  );

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
            Recomendações
          </Text>
        </View>

        <Text style={styles.intro}>
          Sugestões a partir do que você registrou aqui e respondeu no questionário. São regras simples,
          calculadas no seu aparelho: nada sai dele e nenhuma IA entra nesta etapa.
        </Text>

        {items === null ? null : items.length ? (
          items.map((item) => <RecommendationCard item={item} key={item.id} />)
        ) : (
          <View style={styles.empty}>
            <MaterialCommunityIcons color={theme.accent.primary} name="check-decagram-outline" size={28} />
            <Text style={styles.emptyTitle}>Tudo em dia</Text>
            <Text style={styles.emptyText}>
              Nada a sugerir agora. Volte depois do próximo treino ou da próxima pesagem.
            </Text>
          </View>
        )}

        <Text style={styles.footnote}>
          Isto não substitui a orientação de um profissional de saúde ou de educação física. Em caso de
          dor, tontura ou mal-estar, pare e procure ajuda.
        </Text>
      </ScrollView>
    </Screen>
  );
}

function RecommendationCard({ item }: { item: Recommendation }) {
  const styles = useStyles();
  const { theme } = useTheme();
  const color = theme.domain[item.tone];

  return (
    <View accessibilityLabel={`${item.title}. ${item.body}`} accessible style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconWrap, { backgroundColor: withAlpha(color, 0.16) }]}>
          <MaterialCommunityIcons color={color} name={toneIcon[item.tone]} size={20} />
        </View>
        <Text style={styles.cardTitle}>{item.title}</Text>
      </View>
      <Text style={styles.cardBody}>{item.body}</Text>
      {item.action ? (
        <Button
          accessibilityLabel={item.action.label}
          onPress={() => router.push(item.action!.href)}
          title={item.action.label}
          variant="outline"
        />
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((theme) => ({
  content: {
    alignSelf: 'center',
    gap: 12,
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
  },
  intro: {
    color: theme.text.secondary,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  card: {
    backgroundColor: theme.bg.surface,
    borderColor: theme.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  cardTitle: {
    color: theme.text.primary,
    flex: 1,
    fontFamily: fonts.extrabold,
    fontSize: 16,
    lineHeight: 22,
  },
  cardBody: {
    color: theme.text.secondary,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  empty: {
    alignItems: 'center',
    backgroundColor: theme.bg.surface,
    borderColor: theme.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 8,
    padding: 24,
  },
  emptyTitle: {
    color: theme.text.primary,
    fontFamily: fonts.extrabold,
    fontSize: 16,
  },
  emptyText: {
    color: theme.text.secondary,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  footnote: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 8,
  },
  pressed: {
    opacity: 0.75,
  },
}));
