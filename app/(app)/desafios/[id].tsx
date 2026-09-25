import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useFocusEffect, useLocalSearchParams, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/src/components/ui/Button';
import { Screen } from '@/src/components/ui/Screen';
import { useSession } from '@/src/contexts/session-context';
import { ApiError } from '@/src/services/api';
import {
  challengeTiming,
  deleteChallengeCheckin,
  getChallenge,
  hideChallengeCheckin,
  inviteMessage,
  leaveChallenge,
  listChallengeCheckins,
} from '@/src/services/challenges';
import { registerPushToken } from '@/src/services/push';
import { syncWorkouts } from '@/src/services/sync';
import { fonts, makeStyles, radius, typography, useTheme, withAlpha } from '@/src/theme';
import type { Challenge, ChallengeCheckin, ChallengeCheckinDay, Standing } from '@/src/types/challenges';
import { showAlert } from '@/src/utils/alert';
import { dayKey, formatClockTime, parseDayKey, shiftDayKey, weekdayDateLabel } from '@/src/utils/format';
import { shareText } from '@/src/utils/share-text';

const DAY = 86_400_000;
const NO_PHOTOS = 'O servidor ainda não está guardando fotos. O treino do dia continua valendo ponto.';
// As URLs das fotos valem 10 minutos. Com menos de 30 segundos de folga, o dia é pedido de novo antes de
// abrir a foto inteira.
const URL_MARGIN = 30_000;

// 'idle' até a primeira resposta; 'error' quando ela falhou (sem internet, por exemplo) e ainda não se sabe
// se já fiz o de hoje; 'unavailable' quando o servidor não guarda fotos (503).
type CheckinsState = 'idle' | 'ready' | 'error' | 'unavailable';

// A rota é nova: os typed routes só são regerados pelo `expo start`, e o cast segura o typecheck até lá.
const checkinHref = (challenge: Challenge) =>
  ({ params: { id: challenge.id, name: challenge.name }, pathname: '/(app)/desafios/checkin' }) as unknown as Href;

const isNoPhotos = (reason: unknown) => reason instanceof ApiError && reason.code === 'FOTOS_NAO_CONFIGURADAS';

const messageOf = (reason: unknown, fallback: string) => (reason instanceof Error ? reason.message : fallback);

/** O dia (AAAA-MM-DD) de um instante no fuso do desafio, que é como o servidor conta os check-ins. */
function challengeDayKey(timestamp: number, timeZone: string) {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      day: '2-digit',
      month: '2-digit',
      timeZone,
      year: 'numeric',
    }).formatToParts(new Date(timestamp));
    const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value;
    const [year, month, day] = [part('year'), part('month'), part('day')];

    if (year && month && day) {
      return `${year}-${month}-${day}`;
    }
  } catch {
    // Aparelho sem fusos no Intl: vale o relógio do aparelho.
  }

  return dayKey(timestamp);
}

/** Primeiro e último dia do desafio, no fuso dele. O fim é exclusivo: o último dia é o do instante anterior. */
function challengeSpan(challenge: Challenge) {
  return {
    first: challengeDayKey(Date.parse(challenge.startsAt), challenge.timezone),
    last: challengeDayKey(Date.parse(challenge.endsAt) - 1, challenge.timezone),
  };
}

/** "Hoje", "Ontem" ou "seg, 22 set", contando pelo hoje do desafio, não pelo do aparelho. */
function muralDayLabel(key: string, today: string) {
  if (key === today) return 'Hoje';
  if (key === shiftDayKey(today, -1)) return 'Ontem';

  return weekdayDateLabel(key);
}

function daysBetween(from: string, to: string) {
  return Math.round((parseDayKey(to).getTime() - parseDayKey(from).getTime()) / DAY);
}

// A foto de um check-in nunca muda: a chave do cache é o id, não a URL, que ganha outra assinatura a cada
// consulta. Assim a miniatura já vista não baixa de novo.
function photoSource(checkin: ChallengeCheckin, size: 'full' | 'thumb') {
  const uri = size === 'full' ? checkin.url : checkin.thumbUrl;

  return uri ? { cacheKey: `desafio-checkin-${checkin.id}-${size}`, uri } : null;
}

function isExpiring(checkin: ChallengeCheckin) {
  return checkin.expiresAt !== null && Date.parse(checkin.expiresAt) - Date.now() < URL_MARGIN;
}

function withoutCheckin(day: ChallengeCheckinDay, checkinId: string): ChallengeCheckinDay {
  return {
    ...day,
    checkins: day.checkins.filter((item) => item.id !== checkinId),
    mine: day.mine?.id === checkinId ? null : day.mine,
  };
}

function withCheckin(day: ChallengeCheckinDay, checkin: ChallengeCheckin): ChallengeCheckinDay {
  return { ...day, checkins: day.checkins.map((item) => (item.id === checkin.id ? checkin : item)) };
}

// No navegador o Alert do React Native não aparece; lá vale a confirmação do próprio navegador.
function askToConfirm(title: string, message: string, action: string, onConfirm: () => void, cancel = 'Cancelar') {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }

    return;
  }

  Alert.alert(title, message, [
    { style: 'cancel', text: cancel },
    { onPress: onConfirm, style: 'destructive', text: action },
  ]);
}

export default function DesafioScreen() {
  const styles = useStyles();
  const { theme } = useTheme();
  const { session } = useSession();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [leaderboard, setLeaderboard] = useState<Standing[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  // Check-in com foto: o mural do dia escolhido nas setas e o meu de hoje, que decide entre o botão e o meu.
  const [checkinsState, setCheckinsState] = useState<CheckinsState>('idle');
  const [mural, setMural] = useState<ChallengeCheckinDay | null>(null);
  const [myToday, setMyToday] = useState<ChallengeCheckin | null>(null);
  const [todayKey, setTodayKey] = useState<string | null>(null);
  // O dia escolhido nas setas; null é o dia de abertura (hoje ou, num desafio que terminou, o último). As
  // refs acompanham o estado para descartar a resposta que chega depois de a pessoa andar nas setas.
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const selectedDayRef = useRef<string | null>(null);
  const openingDayRef = useRef<string | null>(null);
  const [muralError, setMuralError] = useState<string | null>(null);
  const [muralNotice, setMuralNotice] = useState<string | null>(null);
  // O check-in com apagar ou ocultar em andamento, e o erro da ação, que aparece na linha dele.
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);
  // O check-in fica guardado ao fechar a foto, para o modal sumir com ela ainda na tela.
  const [viewer, setViewer] = useState<ChallengeCheckin | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const token = session?.token;

  // Um dia do mural (sem `day`, hoje no fuso do desafio). O 503 quer dizer que o servidor não guarda fotos:
  // o botão some e fica a linha que explica. Os erros seguem para quem pediu mostrar onde couber.
  const fetchDay = useCallback(
    async (day?: string) => {
      try {
        const data = await listChallengeCheckins(token ?? '', id ?? '', day);
        setCheckinsState('ready');
        return data;
      } catch (reason) {
        setCheckinsState((current) => (isNoPhotos(reason) ? 'unavailable' : current === 'idle' ? 'error' : current));
        throw reason;
      }
    },
    [id, token],
  );

  // A resposta de um dia só vira o mural se ainda for o dia escolhido.
  const showDay = useCallback((data: ChallengeCheckinDay) => {
    if (data.day === (selectedDayRef.current ?? openingDayRef.current)) {
      setMural(data);
      setMuralError(null);
    }
  }, []);

  const loadCheckins = useCallback(
    async (current: Challenge) => {
      // Antes de começar não há check-in.
      if (current.status === 'upcoming') {
        return;
      }

      try {
        let loaded: string | null = null;

        if (current.status === 'active') {
          // Hoje vem sempre: é a resposta que diz se já fiz o meu.
          const today = await fetchDay();
          openingDayRef.current = today.day;
          loaded = today.day;
          setTodayKey(today.day);
          setMyToday(today.mine);
          showDay(today);
        } else {
          // Terminado, o mural abre no último dia.
          openingDayRef.current = challengeSpan(current).last;
          setTodayKey(challengeDayKey(Date.now(), current.timezone));
        }

        const wanted = selectedDayRef.current ?? openingDayRef.current;

        if (wanted && wanted !== loaded) {
          showDay(await fetchDay(wanted));
        }
      } catch (reason) {
        if (!isNoPhotos(reason)) {
          setMuralError(messageOf(reason, 'Não foi possível carregar o mural.'));
        }
      }
    },
    [fetchDay, showDay],
  );

  const load = useCallback(async () => {
    if (!token || !id) {
      return;
    }

    // O treino de agora há pouco precisa estar na conta para contar no placar.
    await syncWorkouts(token).catch(() => undefined);

    try {
      const data = await getChallenge(token, id);
      setChallenge(data.challenge);
      setLeaderboard(data.leaderboard);
      setError(null);
      // O mural vem depois do desafio: o dia de abertura depende de ele estar em andamento ou terminado.
      // Voltar a esta tela pede a lista de novo, e com ela URLs novas (as antigas valem 10 minutos).
      await loadCheckins(data.challenge);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível carregar o desafio.');
    }
  }, [id, loadCheckins, token]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  // Quem acabou de criar ou entrar num desafio passa por aqui: é a hora de registrar o aparelho
  // para o lembrete do dia e o placar final.
  useEffect(() => {
    if (session && challenge) {
      void registerPushToken(session).catch(() => undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.id, challenge?.id]);

  async function refresh() {
    setIsRefreshing(true);
    await load();
    setIsRefreshing(false);
  }

  function invite() {
    if (challenge) {
      void shareText(inviteMessage(challenge)).catch(() => undefined);
    }
  }

  function confirmLeave() {
    showAlert('Sair do desafio?', 'Você sai do placar. Dá para voltar depois pelo mesmo convite.', [
      { style: 'cancel', text: 'Ficar' },
      {
        onPress: async () => {
          if (!token || !id) {
            return;
          }

          try {
            await leaveChallenge(token, id);
            router.replace('/(app)/desafios');
          } catch (reason) {
            setError(reason instanceof Error ? reason.message : 'Não foi possível sair do desafio.');
          }
        },
        style: 'destructive',
        text: 'Sair',
      },
    ]);
  }

  async function goToDay(day: string) {
    selectedDayRef.current = day;
    setSelectedDay(day);
    setMuralError(null);
    setMuralNotice(null);
    setRowError(null);

    try {
      const data = await fetchDay(day);
      showDay(data);

      // De volta a hoje, a resposta também atualiza o meu de hoje.
      if (challenge?.status === 'active' && data.day === todayKey) {
        setMyToday(data.mine);
      }
    } catch (reason) {
      if (!isNoPhotos(reason) && selectedDayRef.current === day) {
        setMuralError(messageOf(reason, 'Não foi possível carregar o mural.'));
      }
    }
  }

  async function openPhoto(checkin: ChallengeCheckin) {
    let target: ChallengeCheckin | undefined = checkin;

    // A URL assinada vale 10 minutos: vencida, o dia vem de novo antes de abrir a foto.
    if (isExpiring(checkin)) {
      setRowError(null);

      try {
        const fresh = await fetchDay(checkin.day);
        showDay(fresh);

        if (challenge?.status === 'active' && fresh.day === todayKey) {
          setMyToday(fresh.mine);
        }

        target = fresh.checkins.find((item) => item.id === checkin.id);
      } catch (reason) {
        if (!isNoPhotos(reason)) {
          setRowError({ id: checkin.id, message: messageOf(reason, 'Não foi possível abrir a foto.') });
        }

        return;
      }
    }

    if (target?.url) {
      setViewer(target);
      setIsViewerOpen(true);
    }
  }

  function confirmDelete(checkin: ChallengeCheckin) {
    const canRedo = challenge?.status === 'active' && checkin.day === todayKey;

    askToConfirm(
      'Apagar seu check-in?',
      `A foto sai do servidor e do mural do grupo. Se você concluiu um treino nesse dia, ele continua valendo o ponto.${
        canRedo ? ' Dá para fazer outro check-in hoje.' : ''
      }`,
      'Apagar',
      () => void removeCheckin(checkin),
      'Manter',
    );
  }

  async function removeCheckin(checkin: ChallengeCheckin) {
    if (!token || !id) {
      return;
    }

    setBusyId(checkin.id);
    setRowError(null);

    try {
      await deleteChallengeCheckin(token, id, checkin.id);
      // Some daqui na hora; a recarga traz o placar, porque o dia pode deixar de contar.
      setMural((current) => (current ? withoutCheckin(current, checkin.id) : current));
      setMyToday((current) => (current?.id === checkin.id ? null : current));
      await load();
    } catch (reason) {
      await handleRowFailure(checkin, reason, 'Não foi possível apagar o check-in.');
    } finally {
      setBusyId(null);
    }
  }

  function confirmHide(checkin: ChallengeCheckin, isOwner: boolean) {
    if (isOwner) {
      askToConfirm(
        'Ocultar este check-in?',
        `Quem criou o desafio oculta na hora: como o desafio é seu, a foto de ${checkin.name} some agora para todo o grupo e o check-in deixa de contar no placar. Entre os participantes, os pedidos se somam, e com 2 a foto some para todos.`,
        'Ocultar',
        () => void hideCheckin(checkin),
      );
      return;
    }

    askToConfirm(
      'Pedir para ocultar?',
      `Quem criou o desafio oculta na hora. Entre os participantes, os pedidos se somam: com 2, a foto de ${
        checkin.name
      } some para todos e o check-in deixa de contar no placar. ${
        checkin.flags > 0 ? 'Já existe um pedido: com o seu, a foto some agora.' : 'O seu é o primeiro pedido.'
      }`,
      'Pedir para ocultar',
      () => void hideCheckin(checkin),
    );
  }

  async function hideCheckin(checkin: ChallengeCheckin) {
    if (!token || !id) {
      return;
    }

    setBusyId(checkin.id);
    setRowError(null);
    setMuralNotice(null);

    try {
      const updated = await hideChallengeCheckin(token, id, checkin.id);

      if (updated.hidden) {
        // Oculto para todo o grupo, inclusive aqui; o placar muda, porque o check-in deixa de contar.
        setMural((current) => (current ? withoutCheckin(current, checkin.id) : current));
        setMuralNotice(`O check-in de ${checkin.name} foi ocultado para todo o grupo.`);
        await load();
      } else {
        // Só o meu pedido por enquanto: a linha passa a mostrar que eu pedi.
        setMural((current) => (current ? withCheckin(current, updated) : current));
      }
    } catch (reason) {
      await handleRowFailure(checkin, reason, 'Não foi possível ocultar o check-in.');
    } finally {
      setBusyId(null);
    }
  }

  // Erro ao apagar ou ocultar. O 404 quer dizer que o check-in já saiu do mural (apagado ou ocultado em
  // outro aparelho): a recarga mostra como ficou, em vez de deixar um erro numa linha que nem existe mais.
  async function handleRowFailure(checkin: ChallengeCheckin, reason: unknown, fallback: string) {
    if (isNoPhotos(reason)) {
      setCheckinsState('unavailable');
    } else if (reason instanceof ApiError && reason.status === 404) {
      setMuralNotice('Esse check-in já não está no mural.');
      await load();
    } else {
      setRowError({ id: checkin.id, message: messageOf(reason, fallback) });
    }
  }

  const leader = leaderboard[0];
  const span = useMemo(() => (challenge ? challengeSpan(challenge) : null), [challenge]);
  const today = todayKey ?? (challenge ? challengeDayKey(Date.now(), challenge.timezone) : null);
  const displayedDay = selectedDay ?? mural?.day ?? (challenge?.status === 'ended' ? span?.last : today) ?? null;
  const dayData = mural && mural.day === displayedDay ? mural : null;
  // O mural vai do primeiro dia do desafio até hoje, ou até o último dia, se ele já terminou.
  const lastDay = span && today ? (today < span.last ? today : span.last) : null;
  const canGoBack = Boolean(span && displayedDay && displayedDay > span.first);
  const canGoForward = Boolean(lastDay && displayedDay && displayedDay < lastDay);
  const dayLabel = displayedDay ? muralDayLabel(displayedDay, today ?? displayedDay) : '';
  const dayHint =
    challenge && span && displayedDay ? `Dia ${daysBetween(span.first, displayedDay) + 1} de ${challenge.days}` : '';
  const showMural =
    challenge !== null &&
    challenge.status !== 'upcoming' &&
    (checkinsState === 'ready' || checkinsState === 'error') &&
    displayedDay !== null;

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
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(app)/desafios'))}
            style={({ pressed }) => [styles.iconButton, pressed ? styles.pressed : null]}>
            <Ionicons color={theme.text.primary} name="arrow-back" size={20} />
          </Pressable>
          <Text accessibilityRole="header" numberOfLines={2} style={styles.title}>
            {challenge?.name ?? 'Desafio'}
          </Text>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {challenge ? (
          <>
            <View style={styles.summary}>
              <Chip text={challengeTiming(challenge)} tone={challenge.status === 'ended' ? 'muted' : 'accent'} />
              <Chip text={`${challenge.days} dias`} tone="muted" />
              <Chip
                text={`${challenge.memberCount} ${challenge.memberCount === 1 ? 'pessoa' : 'pessoas'}`}
                tone="muted"
              />
            </View>

            {/* O check-in com foto de hoje: o botão enquanto não fiz; depois, o meu, com a opção de apagar. */}
            {challenge.status === 'active' && checkinsState !== 'idle' ? (
              <View style={styles.card}>
                {checkinsState === 'unavailable' ? (
                  <View style={styles.cardLine}>
                    <MaterialCommunityIcons color={theme.text.muted} name="camera-off-outline" size={20} />
                    <Text style={styles.cardLineText}>{NO_PHOTOS}</Text>
                  </View>
                ) : myToday ? (
                  <>
                    <View style={styles.cardLine}>
                      <MaterialCommunityIcons
                        color={myToday.hidden ? theme.text.muted : theme.domain.treino}
                        name={myToday.hidden ? 'camera-outline' : 'check-circle'}
                        size={20}
                      />
                      <Text style={styles.cardTitle}>
                        {myToday.hidden ? 'Seu check-in de hoje' : 'Check-in de hoje feito'}
                      </Text>
                    </View>
                    <CheckinRow
                      busy={busyId === myToday.id}
                      checkin={myToday}
                      error={rowError?.id === myToday.id ? rowError.message : null}
                      onDelete={() => confirmDelete(myToday)}
                      onOpen={() => void openPhoto(myToday)}
                    />
                  </>
                ) : (
                  <>
                    <Text style={styles.cardText}>
                      Tire uma foto do treino de hoje para o grupo: o check-in com foto também vale o ponto do dia.
                    </Text>
                    <Button
                      haptic
                      icon="camera-outline"
                      onPress={() => router.push(checkinHref(challenge))}
                      title="Check-in com foto"
                    />
                  </>
                )}
              </View>
            ) : null}

            {challenge.status !== 'ended' ? (
              <View style={styles.inviteCard}>
                <Text style={styles.inviteText}>
                  {challenge.memberCount === 1
                    ? 'Só você por enquanto. Desafio bom é com a turma: mande o convite.'
                    : 'Quanto mais gente, mais difícil faltar. Chame mais alguém.'}
                </Text>
                <Button haptic icon="logo-whatsapp" onPress={invite} title="Convidar amigos" />
                <Text style={styles.code}>
                  Código do convite: <Text style={styles.codeValue}>{challenge.inviteCode}</Text>
                </Text>
              </View>
            ) : null}

            <Text style={styles.sectionTitle}>Placar</Text>
            <View style={styles.board}>
              {leaderboard.map((row) => (
                <View
                  accessibilityLabel={`${row.rank}º lugar: ${row.isMe ? 'você' : row.name}, ${row.points} ${
                    row.points === 1 ? 'ponto' : 'pontos'
                  }`}
                  key={row.userId}
                  style={[styles.row, row.isMe ? { backgroundColor: withAlpha(theme.accent.primary, 0.1) } : null]}>
                  <View style={[styles.rank, row.rank === 1 && row.points > 0 ? styles.rankFirst : null]}>
                    {row.rank === 1 && row.points > 0 ? (
                      <MaterialCommunityIcons color={theme.domain.conquista} name="crown" size={16} />
                    ) : (
                      <Text style={styles.rankText}>{row.rank}º</Text>
                    )}
                  </View>
                  <Text numberOfLines={1} style={[styles.name, row.isMe ? styles.nameMe : null]}>
                    {row.isMe ? `${row.name} (você)` : row.name}
                  </Text>
                  <Text style={styles.points}>
                    {row.points}
                    <Text style={styles.pointsUnit}> {row.points === 1 ? 'dia' : 'dias'}</Text>
                  </Text>
                </View>
              ))}
            </View>

            <Text style={styles.rules}>
              {checkinsState === 'ready'
                ? 'Cada dia vale um ponto: com treino concluído (pelo menos uma série feita) ou com check-in com foto.'
                : 'Cada dia com treino concluído vale um ponto, com pelo menos uma série feita.'}{' '}
              Seus treinos sobem sozinhos quando há internet; puxe a tela para atualizar.
              {leader && leader.points > 0 && challenge.status === 'ended' ? ` ${leader.name} fechou na frente.` : ''}
            </Text>

            {showMural && displayedDay ? (
              <>
                <Text style={styles.sectionTitle}>Mural do dia</Text>
                <View style={styles.mural}>
                  <View style={styles.dayNav}>
                    <DayArrow
                      disabled={!canGoBack}
                      icon="chevron-back"
                      label="Dia anterior"
                      onPress={() => void goToDay(shiftDayKey(displayedDay, -1))}
                    />
                    <View accessibilityLabel={`${dayLabel}, ${dayHint}`} accessible style={styles.dayNavText}>
                      <Text style={styles.dayNavLabel}>{dayLabel}</Text>
                      {dayHint ? <Text style={styles.dayNavHint}>{dayHint}</Text> : null}
                    </View>
                    <DayArrow
                      disabled={!canGoForward}
                      icon="chevron-forward"
                      label="Próximo dia"
                      onPress={() => void goToDay(shiftDayKey(displayedDay, 1))}
                    />
                  </View>

                  {muralNotice ? (
                    <Text accessibilityLiveRegion="polite" style={styles.notice}>
                      {muralNotice}
                    </Text>
                  ) : null}

                  {dayData ? (
                    dayData.checkins.length > 0 ? (
                      dayData.checkins.map((checkin) => (
                        <CheckinRow
                          busy={busyId === checkin.id}
                          checkin={checkin}
                          error={rowError?.id === checkin.id ? rowError.message : null}
                          key={checkin.id}
                          onDelete={() => confirmDelete(checkin)}
                          onHide={() => confirmHide(checkin, dayData.canHide)}
                          onOpen={() => void openPhoto(checkin)}
                        />
                      ))
                    ) : (
                      <Text style={styles.muralEmpty}>
                        {challenge.status === 'active' && displayedDay === today
                          ? 'Ninguém fez check-in com foto hoje ainda.'
                          : 'Ninguém fez check-in com foto neste dia.'}
                      </Text>
                    )
                  ) : muralError ? null : (
                    <ActivityIndicator color={theme.accent.primary} style={styles.muralLoading} />
                  )}

                  {muralError ? <Text style={styles.error}>{muralError}</Text> : null}
                </View>
              </>
            ) : null}

            <Button onPress={confirmLeave} title="Sair do desafio" variant="ghost" />
          </>
        ) : null}
      </ScrollView>

      <PhotoViewer checkin={viewer} onClose={() => setIsViewerOpen(false)} visible={isViewerOpen} />
    </Screen>
  );
}

function Chip({ text, tone }: { text: string; tone: 'accent' | 'muted' }) {
  const styles = useStyles();
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.chip,
        { backgroundColor: tone === 'accent' ? withAlpha(theme.accent.primary, 0.14) : theme.bg.surface },
      ]}>
      <Text style={[styles.chipText, { color: tone === 'accent' ? theme.accent.primary : theme.text.secondary }]}>
        {text}
      </Text>
    </View>
  );
}

function DayArrow({
  disabled,
  icon,
  label,
  onPress,
}: {
  disabled: boolean;
  icon: 'chevron-back' | 'chevron-forward';
  label: string;
  onPress: () => void;
}) {
  const styles = useStyles();
  const { theme } = useTheme();

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.arrow, pressed ? styles.pressed : null, disabled ? styles.arrowDisabled : null]}>
      <Ionicons color={theme.text.primary} name={icon} size={20} />
    </Pressable>
  );
}

type CheckinRowProps = {
  busy: boolean;
  checkin: ChallengeCheckin;
  error: string | null;
  onDelete: () => void;
  // Só nos check-ins dos outros.
  onHide?: () => void;
  onOpen: () => void;
};

// Uma linha do mural: a miniatura (o toque abre a foto inteira), o nome, a hora, a legenda e a ação que
// cabe: apagar o meu, ocultar o dos outros.
function CheckinRow({ busy, checkin, error, onDelete, onHide, onOpen }: CheckinRowProps) {
  const styles = useStyles();
  const { theme } = useTheme();
  const thumb = photoSource(checkin, 'thumb');

  return (
    <View style={styles.checkin}>
      {thumb ? (
        <Pressable
          accessibilityLabel={checkin.isMine ? 'Ver sua foto inteira' : `Ver a foto de ${checkin.name} inteira`}
          accessibilityRole="imagebutton"
          onPress={onOpen}
          style={({ pressed }) => [styles.thumb, pressed ? styles.pressed : null]}>
          <Image contentFit="cover" source={thumb} style={styles.thumbImage} transition={150} />
        </Pressable>
      ) : (
        <View accessibilityLabel="Foto ocultada" accessible style={[styles.thumb, styles.thumbHidden]}>
          <Ionicons color={theme.text.muted} name="eye-off-outline" size={22} />
        </View>
      )}

      <View style={styles.checkinBody}>
        <View style={styles.checkinTop}>
          <Text numberOfLines={1} style={styles.checkinName}>
            {checkin.isMine ? `${checkin.name} (você)` : checkin.name}
          </Text>
          <Text style={styles.checkinTime}>{formatClockTime(Date.parse(checkin.createdAt))}</Text>
        </View>

        {checkin.caption ? <Text style={styles.checkinCaption}>{checkin.caption}</Text> : null}

        {checkin.hidden ? (
          <Text style={styles.hiddenNote}>Ocultado pelo grupo: este dia não conta no placar.</Text>
        ) : null}

        <View style={styles.checkinActions}>
          {checkin.isMine ? (
            <RowAction
              accessibilityLabel="Apagar seu check-in"
              busy={busy}
              icon="trash-outline"
              label="Apagar"
              onPress={onDelete}
            />
          ) : checkin.flaggedByMe ? (
            <View style={styles.flagged}>
              <Ionicons color={theme.text.muted} name="flag-outline" size={14} />
              <Text style={styles.flaggedText}>Você pediu para ocultar</Text>
            </View>
          ) : onHide ? (
            <RowAction
              accessibilityLabel={`Ocultar o check-in de ${checkin.name}`}
              busy={busy}
              icon="eye-off-outline"
              label="Ocultar"
              onPress={onHide}
            />
          ) : null}
        </View>

        {error ? <Text style={styles.rowError}>{error}</Text> : null}
      </View>
    </View>
  );
}

type RowActionProps = {
  accessibilityLabel: string;
  busy: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
};

// Ação compacta da linha (o Button ocupa a largura toda).
function RowAction({ accessibilityLabel, busy, icon, label, onPress }: RowActionProps) {
  const styles = useStyles();
  const { theme } = useTheme();

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ busy, disabled: busy }}
      disabled={busy}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.rowAction, pressed || busy ? styles.pressed : null]}>
      {busy ? (
        <ActivityIndicator color={theme.text.secondary} size="small" />
      ) : (
        <Ionicons color={theme.text.secondary} name={icon} size={15} />
      )}
      <Text style={styles.rowActionText}>{label}</Text>
    </Pressable>
  );
}

// A foto inteira, por cima da tela. A miniatura (já no cache) aparece enquanto a foto grande chega.
function PhotoViewer({
  checkin,
  onClose,
  visible,
}: {
  checkin: ChallengeCheckin | null;
  onClose: () => void;
  visible: boolean;
}) {
  const styles = useStyles();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const full = checkin ? photoSource(checkin, 'full') : null;
  const who = checkin ? (checkin.isMine ? 'Você' : checkin.name) : '';

  return (
    <Modal
      animationType="fade"
      navigationBarTranslucent
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={visible}>
      <View style={styles.viewer}>
        {checkin && full ? (
          // Tocar na foto também fecha; para o leitor de tela, o caminho é o botão de fechar.
          <Pressable accessible={false} onPress={onClose} style={styles.viewerStage}>
            <Image
              accessibilityLabel={`Foto do check-in de ${checkin.isMine ? 'você' : checkin.name}`}
              contentFit="contain"
              placeholder={photoSource(checkin, 'thumb')}
              placeholderContentFit="contain"
              source={full}
              style={styles.viewerImage}
              transition={200}
            />
          </Pressable>
        ) : null}

        <View style={[styles.viewerTop, { paddingTop: insets.top + 8 }]}>
          <Pressable
            accessibilityLabel="Fechar foto"
            accessibilityRole="button"
            hitSlop={8}
            onPress={onClose}
            style={({ pressed }) => [styles.iconButton, pressed ? styles.pressed : null]}>
            <Ionicons color={theme.text.primary} name="close" size={22} />
          </Pressable>
        </View>

        {checkin ? (
          <View style={[styles.viewerInfo, { paddingBottom: insets.bottom + 16 }]}>
            <Text style={styles.viewerName}>
              {who} · {formatClockTime(Date.parse(checkin.createdAt))}
            </Text>
            {checkin.caption ? <Text style={styles.viewerCaption}>{checkin.caption}</Text> : null}
          </View>
        ) : null}
      </View>
    </Modal>
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
  error: {
    color: theme.status.danger,
    fontFamily: fonts.medium,
    fontSize: 14,
  },
  summary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: {
    fontFamily: fonts.bold,
    fontSize: 13,
  },
  card: {
    backgroundColor: theme.bg.surface,
    borderColor: theme.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  cardLine: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  cardTitle: {
    color: theme.text.primary,
    flex: 1,
    fontFamily: fonts.extrabold,
    fontSize: 16,
  },
  cardText: {
    color: theme.text.secondary,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  // Numa linha (ícone e texto), o texto ocupa o resto da largura e quebra.
  cardLineText: {
    color: theme.text.secondary,
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  inviteCard: {
    backgroundColor: theme.bg.surface,
    borderColor: theme.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  inviteText: {
    color: theme.text.secondary,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  code: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 13,
    textAlign: 'center',
  },
  codeValue: {
    color: theme.text.primary,
    fontFamily: fonts.bold,
    letterSpacing: 1.5,
  },
  sectionTitle: {
    color: theme.text.primary,
    fontFamily: fonts.extrabold,
    fontSize: 16,
    marginTop: 4,
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
    flexDirection: 'row',
    gap: 12,
    minHeight: 56,
    paddingHorizontal: 16,
  },
  rank: {
    alignItems: 'center',
    backgroundColor: theme.bg.raised,
    borderRadius: radius.pill,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  rankFirst: {
    backgroundColor: withAlpha(theme.domain.conquista, 0.18),
  },
  rankText: {
    color: theme.text.secondary,
    fontFamily: fonts.bold,
    fontSize: 13,
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
  points: {
    color: theme.text.primary,
    fontFamily: fonts.extrabold,
    fontSize: 18,
    fontVariant: ['tabular-nums'],
  },
  pointsUnit: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 13,
  },
  rules: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 19,
  },
  mural: {
    backgroundColor: theme.bg.surface,
    borderColor: theme.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 16,
    padding: 16,
  },
  dayNav: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  arrow: {
    alignItems: 'center',
    backgroundColor: theme.bg.raised,
    borderRadius: radius.pill,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  arrowDisabled: {
    opacity: 0.35,
  },
  dayNavText: {
    alignItems: 'center',
    flex: 1,
  },
  dayNavLabel: {
    color: theme.text.primary,
    fontFamily: fonts.bold,
    fontSize: 15,
  },
  dayNavHint: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 12,
  },
  notice: {
    backgroundColor: withAlpha(theme.accent.primary, 0.12),
    borderRadius: radius.sm,
    color: theme.text.primary,
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 19,
    padding: 12,
  },
  muralEmpty: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  muralLoading: {
    paddingVertical: 12,
  },
  checkin: {
    flexDirection: 'row',
    gap: 12,
  },
  thumb: {
    alignItems: 'center',
    backgroundColor: theme.bg.raised,
    borderRadius: radius.sm,
    height: 80,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 80,
  },
  thumbImage: {
    height: '100%',
    width: '100%',
  },
  thumbHidden: {
    borderColor: theme.border.subtle,
    borderWidth: 1,
  },
  checkinBody: {
    flex: 1,
    gap: 4,
  },
  checkinTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  checkinName: {
    color: theme.text.primary,
    flex: 1,
    fontFamily: fonts.bold,
    fontSize: 15,
  },
  checkinTime: {
    color: theme.text.muted,
    fontFamily: fonts.medium,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  checkinCaption: {
    color: theme.text.secondary,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  hiddenNote: {
    color: theme.text.secondary,
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 18,
  },
  checkinActions: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    marginTop: 4,
  },
  rowAction: {
    alignItems: 'center',
    backgroundColor: theme.bg.raised,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 6,
    minHeight: 32,
    paddingHorizontal: 12,
  },
  rowActionText: {
    color: theme.text.secondary,
    fontFamily: fonts.semibold,
    fontSize: 13,
  },
  flagged: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    minHeight: 32,
  },
  flaggedText: {
    color: theme.text.muted,
    fontFamily: fonts.medium,
    fontSize: 13,
  },
  rowError: {
    color: theme.status.danger,
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 18,
  },
  viewer: {
    backgroundColor: theme.bg.base,
    flex: 1,
  },
  viewerStage: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  viewerImage: {
    height: '100%',
    width: '100%',
  },
  viewerTop: {
    alignItems: 'flex-end',
    left: 0,
    paddingHorizontal: 16,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  viewerInfo: {
    backgroundColor: theme.bg.overlay,
    bottom: 0,
    gap: 4,
    left: 0,
    paddingHorizontal: 20,
    paddingTop: 14,
    position: 'absolute',
    right: 0,
  },
  viewerName: {
    color: theme.text.primary,
    fontFamily: fonts.bold,
    fontSize: 15,
  },
  viewerCaption: {
    color: theme.text.secondary,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  pressed: {
    opacity: 0.75,
  },
}));
