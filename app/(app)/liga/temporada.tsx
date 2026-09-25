import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, Switch, Text, View } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { Screen } from '@/src/components/ui/Screen';
import { useSession } from '@/src/contexts/session-context';
import { ApiError } from '@/src/services/api';
import { formatXp, getSeason, setSeasonSharing } from '@/src/services/league';
import { syncWorkouts } from '@/src/services/sync';
import { fonts, makeStyles, radius, typography, useTheme, withAlpha } from '@/src/theme';
import type { Award, Season, SeasonCategory, SeasonEntry, SeasonUnit } from '@/src/types/league';
import { formatVolume, monthLabel } from '@/src/utils/format';

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

type CategoryItem = { category: SeasonCategory; kind: 'category' };
type CardioItem = { categories: SeasonCategory[]; kind: 'cardio' };
type ConstancyBlock = { declared?: SeasonCategory; kind: 'constancy'; verified?: SeasonCategory };
type SharedBlock = { items: (CategoryItem | CardioItem)[]; kind: 'shared' };
type Block = CategoryItem | ConstancyBlock | SharedBlock;

type ConstancyMode = 'declarado' | 'verificado';

// O mês da temporada é o de São Paulo, que não tem horário de verão desde 2019: é sempre UTC−3.
const SAO_PAULO_OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
// Quanto a tela espera os treinos subirem antes de pedir a temporada.
const SYNC_WAIT_MS = 4000;
// O placar de cada categoria mostra os dez primeiros; você aparece no fim se estiver mais abaixo.
const MAX_ENTRIES = 10;
// Tonelagem, evolução e cardio só listam quem escolheu mostrar (Season.sharing).
const SHARED_IDS = ['tonelagem', 'evolucao'];

const constancyModes: { icon: IconName; label: string; mode: ConstancyMode; spoken: string }[] = [
  { icon: 'pencil-outline', label: 'Declarado', mode: 'declarado', spoken: 'Constância declarada' },
  { icon: 'check-decagram', label: 'Verificado', mode: 'verificado', spoken: 'Constância verificada por check-in' },
];

const integerFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
const decimalFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1, minimumFractionDigits: 1 });

function formatValue(value: number, unit: SeasonUnit) {
  switch (unit) {
    case 'xp':
      return formatXp(value);
    case 'dias': {
      const days = Math.round(value);

      return `${days} ${days === 1 ? 'dia' : 'dias'}`;
    }
    case 'pontos':
      return `${decimalFormat.format(value)} pts`;
    case 'percent': {
      // Sempre com sinal: a leitura é "mudou tanto".
      const rounded = Math.round(value * 10) / 10;
      const sign = rounded > 0 ? '+' : rounded < 0 ? '−' : '';

      return `${sign}${decimalFormat.format(Math.abs(rounded))}%`;
    }
    case 'kg':
      return formatVolume(value);
    case 'minutos':
      return `${integerFormat.format(Math.round(value))} min`;
    default:
      return integerFormat.format(value);
  }
}

// As mensagens da API já vêm prontas para a tela; qualquer outro erro vira uma frase nossa.
function messageOf(reason: unknown, fallback: string) {
  return reason instanceof ApiError ? reason.message : fallback;
}

// O treino de agora há pouco precisa estar na conta para contar na temporada. A espera tem limite:
// com a rede ruim, a tela carrega com o que o servidor já tem.
function syncFirst(token: string) {
  return Promise.race([
    syncWorkouts(token).catch(() => undefined),
    new Promise<void>((resolve) => setTimeout(resolve, SYNC_WAIT_MS)),
  ]);
}

function saoPauloDay(instant: number) {
  return Math.floor((instant - SAO_PAULO_OFFSET_MS) / DAY_MS);
}

// O fim é o primeiro instante do mês seguinte e fica de fora: no último dia, a temporada fecha hoje.
function closesLabel(endsAt: string) {
  const endMs = Date.parse(endsAt);

  if (!Number.isFinite(endMs)) {
    return 'Temporada em andamento';
  }

  const days = saoPauloDay(endMs) - saoPauloDay(Date.now());

  if (days <= 0) {
    return 'Fechando';
  }

  return days === 1 ? 'Fecha hoje, à meia-noite' : `Fecha em ${days} dias`;
}

function shiftMonth(key: string, delta: number) {
  const [year, month] = key.split('-').map(Number);
  const index = year * 12 + (month - 1) + delta;

  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`;
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function friendsLabel(count: number) {
  if (count === 0) {
    return 'Só você por enquanto';
  }

  return `Você e ${count} ${count === 1 ? 'amigo' : 'amigos'}`;
}

function awardIcon(name: string): IconName {
  return name in MaterialCommunityIcons.glyphMap ? (name as IconName) : 'trophy-outline';
}

function isCardio(id: string) {
  return id.startsWith('cardio:');
}

// Mantém a ordem da API, com três agrupamentos: as duas constâncias viram um cartão só, e tonelagem,
// evolução e cardio (este sob "Cardio por modalidade") vão juntos, abaixo da escolha de mostrar.
function buildBlocks(categories: SeasonCategory[]): Block[] {
  const blocks: Block[] = [];
  let constancy: ConstancyBlock | null = null;
  let shared: SharedBlock | null = null;
  let cardio: CardioItem | null = null;

  for (const category of categories) {
    if (category.id === 'constancia' || category.id === 'constancia-verificada') {
      if (!constancy) {
        constancy = { kind: 'constancy' };
        blocks.push(constancy);
      }

      if (category.id === 'constancia') {
        constancy.declared = category;
      } else {
        constancy.verified = category;
      }
    } else if (SHARED_IDS.includes(category.id) || isCardio(category.id)) {
      if (!shared) {
        shared = { items: [], kind: 'shared' };
        blocks.push(shared);
      }

      if (isCardio(category.id)) {
        if (!cardio) {
          cardio = { categories: [], kind: 'cardio' };
          shared.items.push(cardio);
        }

        cardio.categories.push(category);
      } else {
        shared.items.push({ category, kind: 'category' });
      }
    } else {
      blocks.push({ category, kind: 'category' });
    }
  }

  // Sem nenhuma das três na resposta, a escolha de mostrar continua à mão, depois das categorias.
  if (!shared) {
    blocks.push({ items: [], kind: 'shared' });
  }

  return blocks;
}

export default function TemporadaScreen() {
  const styles = useStyles();
  const { theme } = useTheme();
  const { session } = useSession();
  // undefined é a temporada atual; as setas escolhem outro mês (AAAA-MM).
  const [month, setMonth] = useState<string | undefined>(undefined);
  const [season, setSeason] = useState<Season | null>(null);
  // O mês atual, conhecido na primeira resposta: a seta para a frente para nele.
  const [currentKey, setCurrentKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pendingSharing, setPendingSharing] = useState<boolean | null>(null);
  const [sharingError, setSharingError] = useState<string | null>(null);
  // Só a resposta do último pedido vale: trocar de mês rápido não deixa um mês antigo por cima.
  const lastRequest = useRef(0);
  const token = session?.token;

  const load = useCallback(async () => {
    if (!token) {
      return;
    }

    lastRequest.current += 1;
    const request = lastRequest.current;
    setIsLoading(true);

    if (month === undefined) {
      await syncFirst(token);

      if (request !== lastRequest.current) {
        return;
      }
    }

    try {
      const next = await getSeason(token, month);

      if (request !== lastRequest.current) {
        return;
      }

      setSeason(next);
      setError(null);

      if (month === undefined) {
        setCurrentKey(next.month.key);
      }
    } catch (reason) {
      if (request === lastRequest.current) {
        setError(messageOf(reason, 'Não foi possível carregar a temporada. Tente de novo em instantes.'));
      }
    } finally {
      if (request === lastRequest.current) {
        setIsLoading(false);
      }
    }
  }, [month, token]);

  // Carrega ao abrir, ao voltar para a tela e a cada troca de mês.
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

  const shownKey = month ?? currentKey ?? season?.month.key;
  // Os dados na tela ainda são de outro mês: ficam apagados até o mês pedido chegar.
  const isStale = Boolean(season && shownKey && season.month.key !== shownKey);
  const canGoBack = Boolean(shownKey && season && shownKey > season.firstSeasonKey);
  const canGoForward = Boolean(shownKey && currentKey && shownKey < currentKey);

  function goToMonth(delta: number) {
    if (!shownKey) {
      return;
    }

    const target = shiftMonth(shownKey, delta);
    setMonth(target === currentKey ? undefined : target);
  }

  async function applySharing(share: boolean) {
    if (!token) {
      return;
    }

    setPendingSharing(share);
    setSharingError(null);

    try {
      await setSeasonSharing(token, share);
      await load();
    } catch (reason) {
      setSharingError(messageOf(reason, 'Não foi possível salvar a sua escolha.'));
    } finally {
      setPendingSharing(null);
    }
  }

  function handleSharingSwitch(share: boolean) {
    if (share) {
      void applySharing(true);
      return;
    }

    Alert.alert(
      'Parar de mostrar aos amigos?',
      'Seus amigos deixam de ver a sua tonelagem, a sua evolução e o seu cardio, e você deixa de ver os deles nessas categorias.',
      [
        { style: 'cancel', text: 'Continuar mostrando' },
        { onPress: () => void applySharing(false), style: 'destructive', text: 'Parar de mostrar' },
      ],
    );
  }

  const blocks = season ? buildBlocks(season.categories) : [];

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
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(app)/liga'))}
            style={({ pressed }) => [styles.iconButton, pressed ? styles.pressed : null]}>
            <Ionicons color={theme.text.primary} name="arrow-back" size={20} />
          </Pressable>
          <Text accessibilityRole="header" style={styles.title}>
            {shownKey ? `Temporada de ${monthLabel(shownKey)}` : 'Temporada'}
          </Text>
        </View>

        {error ? (
          <Text accessibilityLiveRegion="polite" style={styles.error}>
            {error}
          </Text>
        ) : null}

        {!season && isLoading ? (
          <ActivityIndicator
            accessibilityLabel="Carregando a temporada"
            color={theme.accent.primary}
            style={styles.loading}
          />
        ) : null}

        {!season && !isLoading ? (
          <Button icon="refresh" loading={isRefreshing} onPress={refresh} title="Tentar de novo" variant="outline" />
        ) : null}

        {season && shownKey ? (
          <View style={styles.card}>
            <View style={styles.monthNav}>
              <Pressable
                accessibilityLabel="Mês anterior"
                accessibilityRole="button"
                accessibilityState={{ disabled: !canGoBack }}
                disabled={!canGoBack}
                hitSlop={8}
                onPress={() => goToMonth(-1)}
                style={({ pressed }) => [
                  styles.monthButton,
                  !canGoBack ? styles.disabled : null,
                  pressed ? styles.pressed : null,
                ]}>
                <MaterialCommunityIcons color={theme.text.primary} name="chevron-left" size={24} />
              </Pressable>
              <View accessibilityLiveRegion="polite" style={styles.monthCenter}>
                <Text style={styles.monthName}>{capitalize(monthLabel(shownKey))}</Text>
                {isStale && isLoading ? (
                  <ActivityIndicator accessibilityLabel="Carregando o mês" color={theme.accent.primary} size="small" />
                ) : isStale ? (
                  <Text style={[styles.monthStatus, styles.monthClosed]}>Não carregou: puxe para tentar de novo</Text>
                ) : (
                  <Text style={[styles.monthStatus, season.month.closed ? styles.monthClosed : null]}>
                    {season.month.closed ? 'Temporada fechada' : closesLabel(season.month.endsAt)}
                  </Text>
                )}
              </View>
              <Pressable
                accessibilityLabel="Próximo mês"
                accessibilityRole="button"
                accessibilityState={{ disabled: !canGoForward }}
                disabled={!canGoForward}
                hitSlop={8}
                onPress={() => goToMonth(1)}
                style={({ pressed }) => [
                  styles.monthButton,
                  !canGoForward ? styles.disabled : null,
                  pressed ? styles.pressed : null,
                ]}>
                <MaterialCommunityIcons color={theme.text.primary} name="chevron-right" size={24} />
              </Pressable>
            </View>

            <View style={styles.friendsRow}>
              <MaterialCommunityIcons color={theme.text.secondary} name="account-multiple-outline" size={18} />
              <Text style={styles.friendsText}>{friendsLabel(season.friendsCount)}</Text>
            </View>

            {season.friendsCount === 0 ? (
              <View style={styles.invite}>
                <Text style={styles.inviteText}>Chame amigos para disputar a temporada</Text>
                <Button
                  icon="person-add-outline"
                  onPress={() => router.push('/(app)/amigos')}
                  title="Convidar amigos"
                  variant="outline"
                />
              </View>
            ) : null}
          </View>
        ) : null}

        {season ? (
          <View style={[styles.stack, isStale ? styles.stale : null]}>
            {season.awards.length ? (
              <View style={styles.card}>
                <Text accessibilityRole="header" style={styles.cardTitle}>
                  Troféus deste mês
                </Text>
                {season.awards.map((award) => (
                  <AwardRow award={award} key={award.id} />
                ))}
              </View>
            ) : null}

            {blocks.map((block) => {
              if (block.kind === 'constancy') {
                return <ConstancyCard declared={block.declared} key="constancia" verified={block.verified} />;
              }

              if (block.kind === 'shared') {
                return (
                  <SharedGroup
                    busy={pendingSharing !== null}
                    error={sharingError}
                    items={block.items}
                    key="compartilhadas"
                    onChange={handleSharingSwitch}
                    sharing={season.sharing}
                    value={pendingSharing ?? season.sharing}
                  />
                );
              }

              return <CategoryCard category={block.category} key={block.category.id} locked={false} />;
            })}

            {season.unavailable.length ? (
              <View style={[styles.card, styles.mutedCard]}>
                <Text accessibilityRole="header" style={styles.mutedTitle}>
                  Ainda sem medição
                </Text>
                {season.unavailable.map((item) => (
                  <View key={item.id} style={styles.unavailableRow}>
                    <Text style={styles.unavailableTitle}>{item.title}</Text>
                    <Text style={styles.caption}>{item.reason}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

type SharedGroupProps = {
  busy: boolean;
  error: string | null;
  items: (CategoryItem | CardioItem)[];
  onChange: (share: boolean) => void;
  // O que o servidor já aplicou: é o que decide se os amigos aparecem nas categorias.
  sharing: boolean;
  // O que o botão mostra, já com a escolha que está sendo salva.
  value: boolean;
};

function SharedGroup({ busy, error, items, onChange, sharing, value }: SharedGroupProps) {
  const styles = useStyles();
  const { theme } = useTheme();

  return (
    <View style={styles.stack}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>
        Volume, evolução e cardio
      </Text>

      <View style={[styles.card, { borderColor: withAlpha(theme.accent.primary, 0.35) }]}>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Mostrar volume, evolução e cardio aos amigos</Text>
          <Switch
            accessibilityLabel="Mostrar volume, evolução e cardio aos amigos"
            disabled={busy}
            ios_backgroundColor={theme.bg.high}
            onValueChange={onChange}
            thumbColor={value ? theme.accent.primary : theme.text.muted}
            trackColor={{ false: theme.bg.high, true: withAlpha(theme.accent.primary, 0.45) }}
            value={value}
          />
        </View>
        <Text style={styles.secondary}>
          Seus amigos veem sua tonelagem do mês, sua evolução em % e seus minutos de cardio, e você vê os deles. Nunca
          as cargas de cada série, nem os treinos.
        </Text>
        {error ? (
          <Text accessibilityLiveRegion="polite" style={styles.error}>
            {error}
          </Text>
        ) : null}
      </View>

      {items.map((item) =>
        item.kind === 'cardio' ? (
          <View key="cardio" style={styles.stack}>
            <Text accessibilityRole="header" style={styles.subheading}>
              Cardio por modalidade
            </Text>
            {item.categories.map((category) => (
              <CategoryCard category={category} key={category.id} locked={!sharing} />
            ))}
          </View>
        ) : (
          <CategoryCard category={item.category} key={item.category.id} locked={!sharing} />
        ),
      )}
    </View>
  );
}

// Declarado e verificado lado a lado, num cartão só: a troca deixa claro que são placares separados.
function ConstancyCard({ declared, verified }: { declared?: SeasonCategory; verified?: SeasonCategory }) {
  const styles = useStyles();
  const { theme } = useTheme();
  const [mode, setMode] = useState<ConstancyMode>('declarado');

  if (!declared || !verified) {
    const single = declared ?? verified;

    return single ? <CategoryCard category={single} locked={false} /> : null;
  }

  const category = mode === 'verificado' ? verified : declared;

  return (
    <View style={styles.card}>
      <View accessibilityRole="tablist" style={styles.segmented}>
        {constancyModes.map((item) => {
          const isActive = item.mode === mode;

          return (
            <Pressable
              accessibilityLabel={item.spoken}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              key={item.mode}
              onPress={() => setMode(item.mode)}
              style={({ pressed }) => [
                styles.segment,
                isActive ? styles.segmentActive : null,
                pressed ? styles.pressed : null,
              ]}>
              <MaterialCommunityIcons
                color={isActive ? theme.accent.onPrimary : theme.text.secondary}
                name={item.icon}
                size={16}
              />
              <Text style={[styles.segmentText, isActive ? styles.segmentTextActive : null]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <CategoryBody category={category} locked={false} />
    </View>
  );
}

function CategoryCard({ category, locked }: { category: SeasonCategory; locked: boolean }) {
  const styles = useStyles();

  return (
    <View style={styles.card}>
      <CategoryBody category={category} locked={locked} />
    </View>
  );
}

// `locked`: categoria que só lista quem mostra, com a pessoa sem mostrar. A lista vem vazia de propósito.
function CategoryBody({ category, locked }: { category: SeasonCategory; locked: boolean }) {
  const styles = useStyles();
  const { theme } = useTheme();
  const { entries, me, pending, unit } = category;
  const top = entries.slice(0, MAX_ENTRIES);
  const mine = entries.find((entry) => entry.isMe);
  const mineBelow = mine && !top.includes(mine) ? mine : null;
  const myValue = me.value !== null ? formatValue(me.value, unit) : null;
  const total = Math.max(entries.length, me.rank ?? 0);

  return (
    <>
      <View style={styles.categoryHead}>
        <Text accessibilityRole="header" style={styles.cardTitle}>
          {category.title}
        </Text>
        <Text style={styles.description}>{category.description}</Text>
        <View style={styles.scopeRow}>
          <MaterialCommunityIcons color={theme.text.muted} name="account-group-outline" size={14} />
          <Text style={styles.caption}>{category.scope}</Text>
        </View>
      </View>

      {myValue !== null || me.rank !== null ? (
        <View
          accessibilityLabel={`Você: ${myValue ?? 'sem marca'}${me.rank !== null ? `, ${me.rank}º de ${total}` : ''}.${
            me.rank === null && me.hint ? ` ${me.hint}` : ''
          }`}
          accessible
          style={styles.meBox}>
          <View style={styles.meRow}>
            <Text style={styles.meLabel}>Você</Text>
            {myValue !== null ? <Text style={styles.meValue}>{myValue}</Text> : null}
            {me.rank !== null ? (
              <View style={styles.rankPill}>
                <Text style={styles.rankPillText}>
                  {me.rank}º de {total}
                </Text>
              </View>
            ) : null}
          </View>
          {me.rank === null && me.hint ? <Text style={styles.caption}>{me.hint}</Text> : null}
        </View>
      ) : (
        <View style={styles.meBox}>
          <Text style={styles.caption}>{me.hint ?? 'Você ainda não tem marca nesta categoria neste mês.'}</Text>
        </View>
      )}

      {top.length ? (
        <View style={styles.board}>
          {top.map((entry) => (
            <EntryRow entry={entry} key={entry.userId} unit={unit} />
          ))}
          {mineBelow ? (
            <>
              <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.gapRow}>
                <MaterialCommunityIcons color={theme.text.muted} name="dots-horizontal" size={18} />
              </View>
              <EntryRow entry={mineBelow} unit={unit} />
            </>
          ) : null}
        </View>
      ) : locked && me.hint ? null : (
        // Sem mostrar, a dica do servidor já explica como entrar; sem dica, fica a nossa.
        <Text style={styles.caption}>
          {locked
            ? 'Ligue a opção de mostrar, acima, para ver aqui os amigos que também mostram.'
            : 'Ninguém marcou nesta categoria ainda.'}
        </Text>
      )}

      {pending.length ? (
        <View
          style={[
            styles.pendingBox,
            {
              backgroundColor: withAlpha(theme.status.warning, 0.1),
              borderColor: withAlpha(theme.status.warning, 0.4),
            },
          ]}>
          {pending.map((item, index) => (
            <View accessibilityLabel={`${item}, a confirmar`} accessible key={`${index}-${item}`} style={styles.pendingRow}>
              <MaterialCommunityIcons color={theme.status.warning} name="alert-circle-outline" size={16} />
              <Text style={styles.pendingText}>{item}</Text>
              <Text style={[styles.pendingTag, { color: theme.status.warning }]}>a confirmar</Text>
            </View>
          ))}
          <Text style={styles.caption}>
            Uma marca muito acima das anteriores fica a confirmar e não conta por enquanto.
          </Text>
        </View>
      ) : null}
    </>
  );
}

function EntryRow({ entry, unit }: { entry: SeasonEntry; unit: SeasonUnit }) {
  const styles = useStyles();
  const { theme } = useTheme();
  const value = formatValue(entry.value, unit);
  const isFirst = entry.rank === 1;

  return (
    <View
      accessibilityLabel={`${entry.rank}º lugar: ${entry.isMe ? `você, ${entry.name}` : entry.name}, ${value}.`}
      accessible
      style={[styles.row, entry.isMe ? { backgroundColor: withAlpha(theme.accent.primary, 0.12) } : null]}>
      <View style={[styles.rank, isFirst ? styles.rankFirst : null]}>
        {isFirst ? (
          <MaterialCommunityIcons color={theme.domain.conquista} name="crown" size={15} />
        ) : (
          <Text style={styles.rankText}>{entry.rank}º</Text>
        )}
      </View>
      <Text numberOfLines={1} style={[styles.name, entry.isMe ? styles.nameMe : null]}>
        {entry.isMe ? `${entry.name} (você)` : entry.name}
      </Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

function AwardRow({ award }: { award: Award }) {
  const styles = useStyles();
  const { theme } = useTheme();

  return (
    <View accessibilityLabel={`${award.title}. ${award.description}`} accessible style={styles.awardRow}>
      <View style={[styles.awardIcon, { backgroundColor: withAlpha(theme.domain.conquista, 0.18) }]}>
        <MaterialCommunityIcons color={theme.domain.conquista} name={awardIcon(award.icon)} size={24} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.awardTitle}>{award.title}</Text>
        <Text style={styles.description}>{award.description}</Text>
      </View>
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
    ...typography.h2,
    color: theme.text.primary,
    flex: 1,
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
  stack: {
    gap: 14,
  },
  stale: {
    opacity: 0.45,
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
  sectionTitle: {
    color: theme.text.primary,
    fontFamily: fonts.extrabold,
    fontSize: 18,
    marginTop: 6,
  },
  subheading: {
    ...typography.overline,
    color: theme.text.secondary,
    marginTop: 4,
  },
  flex: {
    flex: 1,
    gap: 2,
  },
  secondary: {
    color: theme.text.secondary,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  description: {
    color: theme.text.secondary,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  caption: {
    color: theme.text.muted,
    flexShrink: 1,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  monthNav: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  monthButton: {
    alignItems: 'center',
    backgroundColor: theme.bg.raised,
    borderRadius: radius.pill,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  monthCenter: {
    alignItems: 'center',
    flex: 1,
    gap: 2,
    justifyContent: 'center',
    minHeight: 44,
  },
  monthName: {
    color: theme.text.primary,
    fontFamily: fonts.extrabold,
    fontSize: 18,
    textAlign: 'center',
  },
  monthStatus: {
    color: theme.accent.primary,
    fontFamily: fonts.bold,
    fontSize: 13,
    textAlign: 'center',
  },
  monthClosed: {
    color: theme.text.muted,
  },
  friendsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  friendsText: {
    color: theme.text.secondary,
    fontFamily: fonts.semibold,
    fontSize: 14,
  },
  invite: {
    borderTopColor: theme.border.subtle,
    borderTopWidth: 1,
    gap: 10,
    paddingTop: 12,
  },
  inviteText: {
    color: theme.text.primary,
    fontFamily: fonts.bold,
    fontSize: 15,
    textAlign: 'center',
  },
  switchRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  switchLabel: {
    color: theme.text.primary,
    flex: 1,
    fontFamily: fonts.bold,
    fontSize: 15,
    lineHeight: 20,
  },
  segmented: {
    backgroundColor: theme.bg.raised,
    borderRadius: radius.pill,
    flexDirection: 'row',
    padding: 4,
  },
  segment: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: 10,
  },
  segmentActive: {
    backgroundColor: theme.accent.primary,
  },
  segmentText: {
    color: theme.text.secondary,
    fontFamily: fonts.semibold,
    fontSize: 14,
  },
  segmentTextActive: {
    color: theme.accent.onPrimary,
  },
  categoryHead: {
    gap: 4,
  },
  scopeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginTop: 2,
  },
  meBox: {
    backgroundColor: theme.bg.raised,
    borderRadius: radius.sm,
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  meRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  meLabel: {
    color: theme.text.secondary,
    fontFamily: fonts.semibold,
    fontSize: 14,
  },
  meValue: {
    color: theme.text.primary,
    flexGrow: 1,
    fontFamily: fonts.extrabold,
    fontSize: 18,
    fontVariant: ['tabular-nums'],
  },
  rankPill: {
    backgroundColor: theme.accent.soft,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  rankPillText: {
    color: theme.accent.primary,
    fontFamily: fonts.bold,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  board: {
    borderColor: theme.border.subtle,
    borderRadius: radius.sm,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    alignItems: 'center',
    borderBottomColor: theme.border.subtle,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  gapRow: {
    alignItems: 'center',
    borderBottomColor: theme.border.subtle,
    borderBottomWidth: 1,
    paddingVertical: 2,
  },
  rank: {
    alignItems: 'center',
    backgroundColor: theme.bg.raised,
    borderRadius: radius.pill,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  rankFirst: {
    backgroundColor: withAlpha(theme.domain.conquista, 0.18),
  },
  rankText: {
    color: theme.text.secondary,
    fontFamily: fonts.bold,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  name: {
    color: theme.text.primary,
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: 15,
  },
  nameMe: {
    fontFamily: fonts.extrabold,
  },
  value: {
    color: theme.text.primary,
    fontFamily: fonts.extrabold,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  pendingBox: {
    borderRadius: radius.sm,
    borderWidth: 1,
    gap: 8,
    padding: 12,
  },
  pendingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  pendingText: {
    color: theme.text.primary,
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 19,
  },
  pendingTag: {
    fontFamily: fonts.bold,
    fontSize: 12,
  },
  awardRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  awardIcon: {
    alignItems: 'center',
    borderRadius: radius.md,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  awardTitle: {
    color: theme.text.primary,
    fontFamily: fonts.bold,
    fontSize: 15,
  },
  mutedCard: {
    backgroundColor: theme.bg.base,
  },
  mutedTitle: {
    color: theme.text.secondary,
    fontFamily: fonts.bold,
    fontSize: 15,
  },
  unavailableRow: {
    gap: 2,
  },
  unavailableTitle: {
    color: theme.text.secondary,
    fontFamily: fonts.semibold,
    fontSize: 14,
  },
  disabled: {
    opacity: 0.35,
  },
  pressed: {
    opacity: 0.75,
  },
}));
