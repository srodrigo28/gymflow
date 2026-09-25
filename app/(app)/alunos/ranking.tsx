import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useState, type ComponentProps } from 'react';
import { ActivityIndicator, Linking, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';

import { signedPercent } from '@/src/components/coaching/StudentStats';
import { Button } from '@/src/components/ui/Button';
import { Screen } from '@/src/components/ui/Screen';
import { useSession } from '@/src/contexts/session-context';
import { ApiError } from '@/src/services/api';
import { getCoachRanking } from '@/src/services/coaching';
import { fonts, makeStyles, radius, typography, useTheme, withAlpha } from '@/src/theme';
import type { CoachRanking } from '@/src/types/coaching';

// Ranking de personais (22-estrategia.md, seção 2.4): nunca por peso perdido. Pela aderência dos alunos e
// pela evolução relativa média, que é o que um bom profissional entrega.

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];
type Entry = CoachRanking['entries'][number];

// Rota nova, que ainda não está nos tipos gerados do expo-router.
const studentsHref = '/(app)/alunos' as unknown as Href;

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

// As mensagens da API já vêm prontas para a tela; qualquer outro erro vira uma frase nossa.
function messageOf(reason: unknown, fallback: string) {
  return reason instanceof ApiError ? reason.message : fallback;
}

// As regras saem dos números que a API manda: se a janela ou o mínimo mudarem lá, o texto acompanha.
function rulesOf(rules: CoachRanking['rules']): { icon: IconName; text: string }[] {
  return [
    {
      icon: 'calendar-check',
      text: `A posição vem da aderência: em média, a parte das últimas ${rules.adherenceWeeks} semanas fechadas em que cada aluno bateu a própria meta de dias com treino.`,
    },
    {
      icon: 'trending-up',
      text: 'No empate, vale a evolução média de carga dos alunos no mês, cada um comparado com ele mesmo no mês anterior.',
    },
    { icon: 'scale-off', text: 'Nunca por peso perdido: o que conta é a constância e a evolução de cada aluno.' },
    {
      icon: 'account-group-outline',
      text: `Só entra quem tem pelo menos ${plural(rules.minStudents, 'aluno', 'alunos')} que compartilham os treinos, e só esses alunos contam na conta.`,
    },
  ];
}

export default function RankingScreen() {
  const styles = useStyles();
  const { theme } = useTheme();
  const { session } = useSession();
  const token = session?.token;
  const [ranking, setRanking] = useState<CoachRanking | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token) {
      return;
    }

    try {
      setRanking(await getCoachRanking(token));
      setError(null);
    } catch (reason) {
      setError(messageOf(reason, 'Não foi possível carregar o ranking de personais.'));
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function refresh() {
    setIsRefreshing(true);
    await load();
    setIsRefreshing(false);
  }

  const isRanked = ranking?.entries.some((entry) => entry.isMe) ?? false;

  return (
    <Screen edges={['top', 'right', 'left']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            colors={[theme.accent.primary]}
            onRefresh={refresh}
            refreshing={isRefreshing}
            tintColor={theme.accent.primary}
          />
        }
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Voltar"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => (router.canGoBack() ? router.back() : router.replace(studentsHref))}
            style={({ pressed }) => [styles.iconButton, pressed ? styles.pressed : null]}>
            <Ionicons color={theme.text.primary} name="arrow-back" size={20} />
          </Pressable>
          <Text accessibilityRole="header" style={styles.title}>
            Ranking de personais
          </Text>
        </View>

        <Text style={styles.intro}>
          Quem faz os alunos treinarem com constância e evoluírem, cada um contra ele mesmo. Toque num nome para abrir a
          página do profissional.
        </Text>

        {error ? (
          <Text accessibilityLiveRegion="polite" style={styles.error}>
            {error}
          </Text>
        ) : null}

        {!ranking && !error ? (
          <ActivityIndicator accessibilityLabel="Carregando o ranking" color={theme.accent.primary} style={styles.loading} />
        ) : null}

        {!ranking && error ? (
          <Button icon="refresh" loading={isRefreshing} onPress={refresh} title="Tentar de novo" variant="outline" />
        ) : null}

        {ranking && !isRanked ? (
          <View style={[styles.banner, { backgroundColor: withAlpha(theme.accent.primary, 0.1) }]}>
            <MaterialCommunityIcons color={theme.accent.primary} name="account-plus-outline" size={22} />
            <Text style={styles.bannerText}>
              Você entra no ranking com {plural(ranking.rules.minStudents, 'aluno', 'alunos')} que compartilham os
              treinos com você.
            </Text>
          </View>
        ) : null}

        {ranking ? (
          ranking.entries.length ? (
            <View style={styles.board}>
              {ranking.entries.map((entry) => (
                <EntryRow entry={entry} key={entry.slug} />
              ))}
            </View>
          ) : (
            <View style={styles.card}>
              <MaterialCommunityIcons color={theme.text.muted} name="podium" size={30} style={styles.emptyIcon} />
              <Text style={styles.emptyText}>
                Ainda não há personais no ranking. Ele começa quando alguém tiver{' '}
                {plural(ranking.rules.minStudents, 'aluno', 'alunos')} que compartilham os treinos.
              </Text>
            </View>
          )
        ) : null}

        {ranking ? (
          <View style={styles.card}>
            <Text accessibilityRole="header" style={styles.cardTitle}>
              Como funciona
            </Text>
            {rulesOf(ranking.rules).map((rule) => (
              <View accessibilityLabel={rule.text} accessible key={rule.icon} style={styles.ruleRow}>
                <View style={styles.ruleIcon}>
                  <MaterialCommunityIcons color={theme.accent.primary} name={rule.icon} size={18} />
                </View>
                <Text style={styles.ruleText}>{rule.text}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function EntryRow({ entry }: { entry: Entry }) {
  const styles = useStyles();
  const { theme } = useTheme();
  // O pódio ganha a cor das conquistas; o resto, a cor comum.
  const rankColor = entry.rank <= 3 ? theme.domain.conquista : theme.text.secondary;
  const progress = entry.progress === null ? null : signedPercent(entry.progress);
  const spoken = [
    `${entry.rank}º lugar: ${entry.isMe ? `você, ${entry.name}` : entry.name}`,
    plural(entry.students, 'aluno', 'alunos'),
    `aderência de ${entry.adherence}%`,
    progress ? `evolução média de ${progress} no mês` : 'evolução do mês ainda sem medida',
  ].join(', ');

  return (
    <Pressable
      accessibilityHint="Abre a página do profissional no navegador"
      accessibilityLabel={`${spoken}.`}
      accessibilityRole="link"
      onPress={() => void Linking.openURL(entry.pageUrl).catch(() => undefined)}
      style={({ pressed }) => [
        styles.row,
        entry.isMe ? { backgroundColor: withAlpha(theme.accent.primary, 0.12), borderLeftColor: theme.accent.primary } : null,
        pressed ? styles.pressed : null,
      ]}>
      <Text style={[styles.rank, { color: rankColor }]}>{entry.rank}º</Text>
      <View style={styles.flex}>
        <Text numberOfLines={1} style={[styles.name, entry.isMe ? styles.nameMe : null]}>
          {entry.isMe ? `${entry.name} (você)` : entry.name}
        </Text>
        <Text numberOfLines={1} style={styles.meta}>
          {plural(entry.students, 'aluno', 'alunos')} · evolução {progress ?? '–'}
        </Text>
      </View>
      <View style={styles.adherence}>
        <Text style={styles.adherenceValue}>{entry.adherence}%</Text>
        <Text style={styles.adherenceLabel}>aderência</Text>
      </View>
      <Ionicons color={theme.text.muted} name="open-outline" size={16} />
    </Pressable>
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
    ...typography.h2,
    color: theme.text.primary,
    flex: 1,
  },
  intro: {
    color: theme.text.secondary,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  loading: {
    marginVertical: 32,
  },
  error: {
    color: theme.status.danger,
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 20,
  },
  banner: {
    alignItems: 'center',
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  bannerText: {
    color: theme.text.primary,
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: 14,
    lineHeight: 20,
  },
  board: {
    backgroundColor: theme.bg.surface,
    borderColor: theme.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    alignItems: 'center',
    borderBottomColor: theme.border.subtle,
    borderBottomWidth: 1,
    borderLeftColor: 'transparent',
    borderLeftWidth: 3,
    flexDirection: 'row',
    gap: 10,
    minHeight: 60,
    paddingLeft: 10,
    paddingRight: 12,
    paddingVertical: 10,
  },
  rank: {
    fontFamily: fonts.extrabold,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
    minWidth: 30,
  },
  flex: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: theme.text.primary,
    fontFamily: fonts.semibold,
    fontSize: 15,
  },
  nameMe: {
    fontFamily: fonts.extrabold,
  },
  meta: {
    color: theme.text.muted,
    fontFamily: fonts.medium,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  adherence: {
    alignItems: 'flex-end',
  },
  adherenceValue: {
    color: theme.text.primary,
    fontFamily: fonts.extrabold,
    fontSize: 17,
    fontVariant: ['tabular-nums'],
  },
  adherenceLabel: {
    color: theme.text.muted,
    fontFamily: fonts.medium,
    fontSize: 11,
  },
  card: {
    backgroundColor: theme.bg.surface,
    borderColor: theme.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  cardTitle: {
    color: theme.text.primary,
    fontFamily: fonts.extrabold,
    fontSize: 16,
    lineHeight: 22,
  },
  emptyIcon: {
    alignSelf: 'center',
  },
  emptyText: {
    color: theme.text.secondary,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  ruleRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
  },
  ruleIcon: {
    alignItems: 'center',
    backgroundColor: theme.accent.soft,
    borderRadius: radius.sm,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  ruleText: {
    color: theme.text.secondary,
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  pressed: {
    opacity: 0.75,
  },
}));
