import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Alert, Linking, Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { GymBoard } from '@/src/components/coaching/GymBoard';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { Screen } from '@/src/components/ui/Screen';
import { useSession } from '@/src/contexts/session-context';
import { ApiError } from '@/src/services/api';
import {
  addCheckin,
  clearGym,
  DEFAULT_GYM_RADIUS_M,
  distanceInMeters,
  getGym,
  isGymClearPending,
  getTodayCheckin,
  GYM_NAME_MAX_LENGTH,
  listCheckins,
  normalizeGymName,
  saveGym,
  settleGymClear,
} from '@/src/services/gym-checkin';
import { clearServerGym, getServerGym, listServerCheckins, saveServerGym, sendCheckin } from '@/src/services/league';
import { fonts, makeStyles, radius, typography, useTheme, withAlpha } from '@/src/theme';
import type { GeoPoint, Gym, GymCheckin } from '@/src/types/gym-checkin';
import type { ServerCheckin, ServerGym } from '@/src/types/league';
import { dayLabel, formatClockTime, formatDistance, formatSessionDate } from '@/src/utils/format';

// Quantos check-ins aparecem na lista. O resto fica guardado, mas ninguém rola 200 linhas.
const HISTORY_LIMIT = 10;
// A conta liga a pessoa a uma academia que já exista a até 100 m do ponto marcado: dentro dessa
// distância, a academia do aparelho e a da conta são a mesma.
const SAME_GYM_M = 100;
// Leitura do GPS com erro acima disso não vale como "no local" para a conta.
const ACCOUNT_MAX_ACCURACY_M = 100;
// Quanto esperar pela segunda leitura, com o GPS, antes de ficar com a primeira.
const PRECISE_TIMEOUT_MS = 10_000;

const OFFLINE_CHECKIN = 'Check-in salvo no aparelho. Sem conexão, ele ainda não foi para o ranking.';
const GYM_CONFIRMED = 'Academia confirmada: seus check-ins no local contam como verificados no ranking.';
const GYM_UNCONFIRMED =
  'Academia ainda não confirmada. Ela é confirmada quando outra pessoa marca a mesma academia ou quando a equipe confere. Até lá, seus check-ins contam como declarados.';

// O que impediu a última leitura da localização; cada caso tem o seu aviso.
type LocationIssue = 'denied' | 'unavailable';

// Uma leitura do GPS. `accuracyM` é o raio de erro, em metros; alguns aparelhos não informam.
type PositionReading = { accuracyM: number | null; point: GeoPoint };

type PositionResult = PositionReading | { issue: LocationIssue };

// O envio do check-in de hoje para a conta.
type SendState = { kind: 'idle' } | { kind: 'sending' } | { kind: 'failed'; message: string; offline: boolean };

// A academia deste aparelho e a da conta, depois de acertadas.
type AccountGymSync = { joined: boolean; local: Gym | null; server: ServerGym | null };

type IoniconName = keyof typeof Ionicons.glyphMap;

function toReading({ coords }: Location.LocationObject): PositionReading {
  return {
    accuracyM: typeof coords.accuracy === 'number' && Number.isFinite(coords.accuracy) ? coords.accuracy : null,
    point: { latitude: coords.latitude, longitude: coords.longitude },
  };
}

// Uma posição que o próprio aparelho já tem, de até 2 minutos atrás e com erro de até 100 m. Serve
// quando a leitura nova não vem (GPS lento ou sinal fraco): o servidor confere distância e precisão
// do mesmo jeito.
const RECENT_POSITION_MAX_AGE_MS = 2 * 60 * 1000;
// A leitura nova pode ficar pendurada sem sinal; passado isso, vale a posição recente.
const CURRENT_POSITION_TIMEOUT_MS = 15_000;

// Espera no máximo `ms`: depois disso resolve com null, sem derrubar quem chamou.
async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), ms);
      }),
    ]);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function readRecentPosition(): Promise<PositionReading | null> {
  try {
    const recent = await Location.getLastKnownPositionAsync({
      maxAge: RECENT_POSITION_MAX_AGE_MS,
      requiredAccuracy: ACCOUNT_MAX_ACCURACY_M,
    });

    return recent ? toReading(recent) : null;
  } catch {
    return null;
  }
}

// Segunda leitura, com o GPS. Em lugar fechado ela pode não vir: passado o limite, segue sem ela.
async function readPrecisePosition(): Promise<PositionReading | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    const location = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), PRECISE_TIMEOUT_MS);
      }),
    ]);

    return location ? toReading(location) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Pede a permissão (o sistema só pergunta se ainda não foi decidida) e lê a posição atual. A
// precisão "balanceada" chega a ~100 m, o bastante para um raio de 150 m sem esperar o GPS fixar.
// Quando ela vem pior que isso (só pela rede do celular, por exemplo), a conta não aceitaria o
// check-in como "no local": aí vale uma segunda tentativa com o GPS, e fica a leitura mais precisa.
async function readCurrentPosition(): Promise<PositionResult> {
  try {
    const permission = await Location.requestForegroundPermissionsAsync();

    if (permission.status !== Location.PermissionStatus.GRANTED) {
      return { issue: 'denied' };
    }

    const current = await withTimeout(
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      CURRENT_POSITION_TIMEOUT_MS,
    );
    const reading = current ? toReading(current) : await readRecentPosition();

    if (!reading) {
      return { issue: 'unavailable' };
    }

    const accuracyM = reading.accuracyM;

    if (accuracyM === null || accuracyM <= ACCOUNT_MAX_ACCURACY_M) {
      return reading;
    }

    const precise = await readPrecisePosition();

    return precise && precise.accuracyM !== null && precise.accuracyM < accuracyM ? precise : reading;
  } catch {
    // GPS desligado, modo avião ou tempo esgotado: o aviso pede para conferir e tentar de novo.
    return { issue: 'unavailable' };
  }
}

// O servidor conta os dias no fuso de São Paulo: é por essa chave que o check-in de hoje é achado.
function accountDayKey(now = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      day: '2-digit',
      month: '2-digit',
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
    }).formatToParts(now);
    const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value;
    const [year, month, day] = [part('year'), part('month'), part('day')];

    if (year && month && day) {
      return `${year}-${month}-${day}`;
    }
  } catch {
    // Aparelho sem fusos no Intl: vale a conta de baixo.
  }

  // São Paulo fica em UTC−3 o ano todo desde que o horário de verão acabou, em 2019.
  return new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

// "Hoje, 07:05", "Ontem, 18:40" ou "seg, 22 set", como no histórico do aparelho.
function accountCheckinDate(checkin: ServerCheckin) {
  const label = dayLabel(checkin.day);
  const createdAt = Date.parse(checkin.createdAt);

  return (label === 'Hoje' || label === 'Ontem') && !Number.isNaN(createdAt)
    ? `${label}, ${formatClockTime(createdAt)}`
    : label;
}

// Quando a academia do aparelho e a da conta são a mesma, o aparelho fica com o ponto, o nome e o raio
// da conta: assim a distância conferida aqui e a conferida no servidor dão o mesmo resultado.
function serverGymRadius(server: ServerGym) {
  return server.radiusM > 0 ? server.radiusM : DEFAULT_GYM_RADIUS_M;
}

// Aparelho sem academia e conta com uma (aparelho novo, app reinstalado ou academia marcada em outro
// aparelho): o aparelho passa a usar o ponto, o nome e o raio da conta.
function restoreServerGym(userId: string, server: ServerGym) {
  return saveGym(userId, {
    latitude: server.latitude,
    longitude: server.longitude,
    name: server.name,
    radiusM: serverGymRadius(server),
  });
}

async function adoptServerGym(userId: string, local: Gym, server: ServerGym) {
  const radiusM = serverGymRadius(server);

  if (
    local.latitude === server.latitude &&
    local.longitude === server.longitude &&
    local.name === normalizeGymName(server.name) &&
    local.radiusM === radiusM
  ) {
    return local;
  }

  return saveGym(userId, { latitude: server.latitude, longitude: server.longitude, name: server.name, radiusM });
}

// Marca na conta a academia deste aparelho. Se já havia uma marcada a até 100 m, a pessoa entra nela
// (`joined`) e o aparelho passa a usar a da conta.
async function pushGymToAccount(token: string, userId: string, local: Gym): Promise<AccountGymSync> {
  const { gym, linked } = await saveServerGym(token, {
    latitude: local.latitude,
    longitude: local.longitude,
    name: local.name,
  });

  return { joined: linked === 'joined', local: await adoptServerGym(userId, local, gym), server: gym };
}

// Deixa a conta e o aparelho com a mesma academia. A daqui sobe quando a conta não tem nenhuma (quem marcou
// antes do ranking existir) ou tem outra, longe (marcada de novo sem internet). Sem academia no aparelho, o
// aparelho passa a usar a da conta, como a tela promete; a exceção é a academia tirada daqui sem conexão,
// que primeiro sai da conta. Sem conexão, lança o erro da API.
async function syncGymWithAccount(token: string, userId: string, local: Gym | null): Promise<AccountGymSync> {
  if (!local && (await isGymClearPending(userId))) {
    await clearServerGym(token);
    await settleGymClear(userId);

    return { joined: false, local: null, server: null };
  }

  const server = await getServerGym(token);

  if (!local) {
    return { joined: false, local: server ? await restoreServerGym(userId, server) : null, server };
  }

  if (server && distanceInMeters(local, server) <= SAME_GYM_M) {
    return { joined: false, local: await adoptServerGym(userId, local, server), server };
  }

  return pushGymToAccount(token, userId, local);
}

type AccountStatus = { canResend: boolean; icon: IoniconName; text: string; tone: 'success' | 'warning' | 'neutral' };

// O que a conta disse do check-in de hoje, em uma frase. Fora do raio, a conta aceita um segundo envio
// no mesmo dia: quem chega perto da academia depois ainda consegue o verificado.
function accountStatus(
  checkin: ServerCheckin | null,
  failure: { message: string; offline: boolean } | null,
  pending: boolean,
): AccountStatus | null {
  if (failure) {
    return {
      canResend: true,
      icon: failure.offline ? 'cloud-offline-outline' : 'alert-circle-outline',
      text: failure.message,
      tone: 'warning',
    };
  }

  if (checkin?.verified) {
    // +20 é o XP do check-in verificado (checkinXp nas regras da API).
    return {
      canResend: false,
      icon: 'shield-checkmark',
      text: 'Check-in verificado: +20 XP na liga.',
      tone: 'success',
    };
  }

  if (checkin?.withinRadius) {
    return {
      canResend: false,
      icon: 'shield-outline',
      text: 'Check-in no local. Ele conta como declarado até a academia ser confirmada.',
      tone: 'neutral',
    };
  }

  if (checkin) {
    return {
      canResend: true,
      icon: 'navigate-outline',
      text: 'Fora do raio da academia: o check-in fica como declarado.',
      tone: 'neutral',
    };
  }

  if (pending) {
    return {
      canResend: true,
      icon: 'cloud-upload-outline',
      text: 'Check-in salvo no aparelho, mas ainda não foi para o ranking.',
      tone: 'neutral',
    };
  }

  return null;
}

export default function CheckinScreen() {
  const styles = useStyles();
  const { theme } = useTheme();
  const { session } = useSession();
  const userId = session?.user.id;
  const token = session?.token;
  // undefined enquanto carrega: evita piscar o convite de marcar academia para quem já marcou.
  const [gym, setGym] = useState<Gym | null | undefined>(undefined);
  const [checkins, setCheckins] = useState<GymCheckin[]>([]);
  const [today, setToday] = useState<GymCheckin | null>(null);
  const [name, setName] = useState('');
  const [position, setPosition] = useState<PositionReading | null>(null);
  const [issue, setIssue] = useState<LocationIssue | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isResending, setIsResending] = useState(false);
  // A camada da conta. undefined: ainda não se sabe (carregando ou sem conexão), e a tela segue com o
  // que está no aparelho.
  const [serverGym, setServerGym] = useState<ServerGym | null | undefined>(undefined);
  // null: sem conexão; o histórico mostrado é o do aparelho.
  const [serverCheckins, setServerCheckins] = useState<ServerCheckin[] | null>(null);
  const [accountToday, setAccountToday] = useState<ServerCheckin | null>(null);
  const [sendState, setSendState] = useState<SendState>({ kind: 'idle' });
  const [joinedGymName, setJoinedGymName] = useState<string | null>(null);
  // Conta as ações da pessoa (marcar, trocar, fazer check-in): uma carga que começou antes de uma delas
  // traz dados velhos e é descartada.
  const actions = useRef(0);
  // Acerto da academia com a conta em andamento: duas cargas seguidas usam o mesmo, em vez de marcar a
  // academia duas vezes.
  const syncing = useRef<Promise<AccountGymSync> | null>(null);

  const distanceM = gym && position ? distanceInMeters(position.point, gym) : null;
  const isAtGym = Boolean(gym && distanceM !== null && distanceM <= gym.radiusM);
  const doneToday = Boolean(today || accountToday);
  const doneAt = today ? today.at : accountToday ? Date.parse(accountToday.createdAt) : Number.NaN;
  const doneLabel = Number.isNaN(doneAt)
    ? 'Check-in de hoje feito'
    : `Check-in de hoje feito às ${formatClockTime(doneAt)}`;
  // O check-in de hoje está no aparelho, a conta respondeu e não tem nenhum: falta enviar.
  const pendingUpload = Boolean(today) && !accountToday && Array.isArray(serverCheckins) && sendState.kind === 'idle';
  const hasHistory = serverCheckins ? serverCheckins.length > 0 : checkins.length > 0;

  // Lê a posição e guarda o que deu errado, se deu. Devolve a leitura para quem precisa dela na hora
  // (marcar a academia, enviar de novo), sem esperar o próximo render.
  const locate = useCallback(async () => {
    setIsLocating(true);
    const result = await readCurrentPosition();
    setIsLocating(false);

    if ('issue' in result) {
      setIssue(result.issue);

      return null;
    }

    setIssue(null);
    setPosition(result);

    return result;
  }, []);

  const syncAccountGym = useCallback((authToken: string, id: string, local: Gym | null) => {
    if (!syncing.current) {
      syncing.current = syncGymWithAccount(authToken, id, local).finally(() => {
        syncing.current = null;
      });
    }

    return syncing.current;
  }, []);

  const load = useCallback(async () => {
    if (!userId) {
      return;
    }

    const started = actions.current;
    const [savedGym, recent, todayCheckin] = await Promise.all([
      getGym(userId),
      listCheckins(userId, HISTORY_LIMIT),
      getTodayCheckin(userId),
    ]);

    if (actions.current !== started) {
      return;
    }

    setGym(savedGym);
    setCheckins(recent);
    setToday(todayCheckin);

    // Com academia marcada, a distância já aparece ao abrir. Sem ela, a localização só é pedida
    // quando a pessoa tocar em marcar.
    if (savedGym) {
      void locate();
    }

    if (!token) {
      return;
    }

    // A conta vem depois do aparelho: a tela já aparece com o que está salvo aqui e, sem conexão,
    // segue só com isso, sem aviso.
    const [account, history] = await Promise.allSettled([
      syncAccountGym(token, userId, savedGym),
      listServerCheckins(token, HISTORY_LIMIT),
    ]);

    if (actions.current !== started) {
      return;
    }

    if (account.status === 'fulfilled') {
      setGym(account.value.local);
      setServerGym(account.value.server);

      // A academia veio da conta (aparelho novo): a distância aparece já, como para quem marcou aqui.
      if (!savedGym && account.value.local) {
        void locate();
      }

      if (account.value.joined && account.value.server) {
        setJoinedGymName(account.value.server.name);
      }
    } else {
      setServerGym(undefined);
    }

    if (history.status === 'fulfilled' && Array.isArray(history.value)) {
      const todayKey = accountDayKey();

      setServerCheckins(history.value);
      setAccountToday(history.value.find((item) => item.day === todayKey) ?? null);
      // Com a conta respondendo, um "sem conexão" de antes não vale mais.
      setSendState((current) => (current.kind === 'failed' ? { kind: 'idle' } : current));
    } else {
      setServerCheckins(null);
    }
  }, [locate, syncAccountGym, token, userId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function handleSaveGym() {
    if (!userId) {
      return;
    }

    const reading = await locate();

    if (!reading) {
      return;
    }

    // Quem já tinha esta academia na conta (aparelho novo, por exemplo) não precisa do aviso de ligação.
    const previousServerGymId = serverGym?.id;

    actions.current += 1;
    setIsSaving(true);
    setJoinedGymName(null);

    try {
      const saved = await saveGym(userId, { ...reading.point, name });
      setGym(saved);
      setName('');
      setServerGym(undefined);

      if (token) {
        try {
          const account = await pushGymToAccount(token, userId, saved);
          setGym(account.local);
          setServerGym(account.server);

          if (account.joined && account.server && account.server.id !== previousServerGymId) {
            setJoinedGymName(account.server.name);
          }
        } catch {
          // Sem conexão: vale a academia do aparelho, e ela sobe para a conta na próxima vez que a tela abrir.
        }
      }
    } finally {
      setIsSaving(false);
    }
  }

  // Manda o check-in de hoje para a conta, com a leitura dada. O servidor guarda um por dia e só troca
  // um que ficou fora do raio, então repetir não duplica nada.
  async function sendToAccount(reading: PositionReading) {
    if (!token || !userId) {
      return;
    }

    setSendState({ kind: 'sending' });

    try {
      // Sem a academia na conta o servidor recusa o check-in: ela sobe antes (foi marcada sem internet).
      // Aqui o acerto é com a academia da tela, e não o de uma carga em andamento, que pode ser de antes.
      if (!serverGym && gym) {
        const account = await syncGymWithAccount(token, userId, gym);
        setGym(account.local ?? gym);
        setServerGym(account.server);

        if (account.joined && account.server) {
          setJoinedGymName(account.server.name);
        }
      }

      const checkin = await sendCheckin(token, {
        accuracyM: reading.accuracyM !== null && reading.accuracyM > 0 ? reading.accuracyM : undefined,
        latitude: reading.point.latitude,
        longitude: reading.point.longitude,
      });

      setAccountToday(checkin);
      setSendState({ kind: 'idle' });

      if (serverCheckins) {
        // O de hoje entra no lugar do que havia no mesmo dia (o servidor pode ter melhorado um fora do raio).
        const merged = checkin
          ? [checkin, ...serverCheckins.filter((item) => item.id !== checkin.id && item.day !== checkin.day)]
          : serverCheckins;

        setServerCheckins(merged.slice(0, HISTORY_LIMIT));
      } else {
        // O histórico vinha do aparelho, sem conexão; com a conta de volta, passa a vir dela.
        void listServerCheckins(token, HISTORY_LIMIT).then(
          (list) => setServerCheckins(Array.isArray(list) ? list : null),
          () => undefined,
        );
      }
    } catch (error) {
      // Status 0: o pedido nem chegou ao servidor.
      const offline = !(error instanceof ApiError) || error.status === 0;

      // O servidor respondeu com erro (a conta pode ter ficado sem a academia): o "Enviar de novo" confere
      // a academia da conta antes de reenviar.
      if (!offline) {
        setServerGym(undefined);
      }

      setSendState({
        kind: 'failed',
        message: offline ? OFFLINE_CHECKIN : `Check-in salvo no aparelho. ${error.message}`,
        offline,
      });
    }
  }

  async function handleCheckin() {
    if (!userId || !gym || !position) {
      return;
    }

    const reading = position;
    const distance = distanceInMeters(reading.point, gym);

    actions.current += 1;
    setIsSaving(true);

    try {
      const checkin = await addCheckin(userId, { atGym: distance <= gym.radiusM, distanceM: distance });
      setToday(checkin);
      setCheckins((current) =>
        [checkin, ...current.filter((item) => item.id !== checkin.id)].slice(0, HISTORY_LIMIT),
      );
    } finally {
      setIsSaving(false);
    }

    // O aparelho guarda primeiro, e o check-in vale mesmo sem internet. A conta vem depois.
    await sendToAccount(reading);
  }

  // Lê a posição de novo (quem chegou mais perto da academia pode sair do "fora do raio") e reenvia.
  async function handleResend() {
    setIsResending(true);
    const reading = await locate();
    setIsResending(false);

    if (!reading) {
      return;
    }

    actions.current += 1;
    await sendToAccount(reading);
  }

  function confirmChangeGym() {
    Alert.alert(
      'Trocar academia?',
      'A academia atual sai do aparelho e da conta, e você marca a nova na próxima visita. O histórico de check-ins continua.',
      [
        { style: 'cancel', text: 'Manter' },
        {
          onPress: async () => {
            if (!userId) {
              return;
            }

            actions.current += 1;
            await clearGym(userId);
            setGym(null);
            setPosition(null);
            setIssue(null);
            setServerGym(null);
            setJoinedGymName(null);

            if (token) {
              // Sem conexão, a troca fica pendente no aparelho: na próxima abertura com internet, a academia
              // sai da conta antes de qualquer outra coisa, e nenhuma volta sozinha.
              void clearServerGym(token)
                .then(() => settleGymClear(userId))
                .catch(() => setServerGym(undefined));
            }
          },
          style: 'destructive',
          text: 'Trocar',
        },
      ],
    );
  }

  return (
    <Screen edges={['top', 'right', 'left']}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Voltar"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(app)/treino'))}
            style={({ pressed }) => [styles.iconButton, pressed ? styles.pressed : null]}>
            <Ionicons color={theme.text.primary} name="arrow-back" size={20} />
          </Pressable>
          <Text accessibilityRole="header" style={styles.title}>
            Check-in
          </Text>
        </View>

        {gym === null ? (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIcon, { backgroundColor: withAlpha(theme.domain.treino, 0.16) }]}>
                <MaterialCommunityIcons color={theme.domain.treino} name="map-marker-plus-outline" size={24} />
              </View>
              <Text style={styles.cardTitle}>Marque a sua academia</Text>
            </View>
            <Text style={styles.cardText}>
              Marque a sua academia uma vez. Depois, cada visita vira um check-in quando você estiver lá.
            </Text>
            <Input
              autoCapitalize="words"
              label="Nome da academia (opcional)"
              maxLength={GYM_NAME_MAX_LENGTH}
              onChangeText={setName}
              onSubmitEditing={handleSaveGym}
              placeholder="Ex.: Academia do bairro"
              returnKeyType="done"
              value={name}
            />
            <Button
              haptic
              icon="locate-outline"
              loading={isLocating || isSaving}
              onPress={handleSaveGym}
              title="Usar minha localização atual"
            />
            <Text style={styles.hint}>
              Faça isso quando estiver na academia: é este ponto que vale para os check-ins. A academia fica guardada
              na sua conta.
            </Text>
            {issue ? <LocationIssueNotice issue={issue} /> : null}
          </View>
        ) : null}

        {gym ? (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIcon, { backgroundColor: withAlpha(theme.domain.treino, 0.16) }]}>
                <MaterialCommunityIcons color={theme.domain.treino} name="map-marker-check-outline" size={24} />
              </View>
              <View style={styles.cardHeading}>
                <Text numberOfLines={2} style={styles.cardTitle}>
                  {gym.name}
                </Text>
                <Text accessibilityLiveRegion="polite" style={styles.distance}>
                  {isLocating
                    ? 'Localizando…'
                    : distanceM !== null
                      ? `a ${formatDistance(distanceM)} de você`
                      : 'Distância indisponível'}
                </Text>
              </View>
              <Pressable
                accessibilityLabel="Atualizar distância"
                accessibilityRole="button"
                accessibilityState={{ busy: isLocating, disabled: isLocating }}
                disabled={isLocating}
                hitSlop={8}
                onPress={() => void locate()}
                style={({ pressed }) => [styles.iconButton, pressed ? styles.pressed : null]}>
                <Ionicons color={theme.text.primary} name="refresh" size={18} />
              </Pressable>
            </View>

            {/* Sem resposta da conta (carregando ou sem conexão), a linha de situação não aparece. */}
            {serverGym ? <GymStatus confirmed={serverGym.confirmed} /> : null}

            {joinedGymName ? (
              <View
                accessibilityLiveRegion="polite"
                style={[styles.notice, { borderColor: withAlpha(theme.accent.primary, 0.4) }]}>
                <Ionicons color={theme.accent.primary} name="link-outline" size={18} />
                <Text style={[styles.noticeText, styles.noticeBody]}>
                  Você foi ligado à academia “{joinedGymName}”, que já estava marcada aqui perto.
                </Text>
              </View>
            ) : null}

            {issue ? <LocationIssueNotice issue={issue} /> : null}

            {doneToday ? (
              <View accessibilityLiveRegion="polite" style={styles.doneRow}>
                <Ionicons color={theme.status.success} name="checkmark-circle" size={20} />
                <Text style={styles.doneText}>{doneLabel}</Text>
              </View>
            ) : isAtGym || distanceM === null ? (
              <Button
                disabled={distanceM === null}
                haptic
                icon="checkmark-circle-outline"
                loading={isSaving}
                onPress={handleCheckin}
                title="Fazer check-in"
              />
            ) : (
              <>
                <Text style={styles.hint}>
                  Fora do raio de {gym.radiusM} m da academia. Dá para registrar mesmo assim; fica marcado como
                  fora do local.
                </Text>
                <Button
                  icon="checkmark-circle-outline"
                  loading={isSaving}
                  onPress={handleCheckin}
                  title="Registrar mesmo assim"
                  variant="ghost"
                />
              </>
            )}

            {token ? (
              <>
                <AccountCheckinStatus
                  busy={isResending}
                  checkin={accountToday}
                  failure={sendState.kind === 'failed' ? sendState : null}
                  onResend={handleResend}
                  pending={pendingUpload}
                  sending={sendState.kind === 'sending'}
                />
                <Text style={styles.hint}>
                  O check-in manda sua posição para a conta só na hora, para conferir a distância até a academia. Ela
                  não fica guardada: ficam a academia, o dia e a distância.
                </Text>
              </>
            ) : null}

            <Pressable
              accessibilityLabel="Trocar academia"
              accessibilityRole="button"
              hitSlop={8}
              onPress={confirmChangeGym}
              style={({ pressed }) => [styles.linkButton, pressed ? styles.pressed : null]}>
              <Ionicons color={theme.text.muted} name="swap-horizontal-outline" size={16} />
              <Text style={styles.linkText}>Trocar academia</Text>
            </Pressable>
          </View>
        ) : null}

        {/* O mural é da academia da conta: sem a resposta dela (carregando ou sem conexão), ele não aparece.
            A chave troca o mural inteiro quando a academia da conta muda. */}
        {token && serverGym ? <GymBoard gymId={serverGym.id} key={serverGym.id} onGymChanged={load} /> : null}

        {gym || hasHistory ? (
          <>
            <Text accessibilityRole="header" style={styles.sectionTitle}>
              Últimos check-ins
            </Text>
            {/* Com conexão, o histórico é o da conta, com o que valeu no ranking; sem ela, o do aparelho. */}
            {serverCheckins ? (
              serverCheckins.length ? (
                serverCheckins.map((checkin) => <AccountCheckinRow checkin={checkin} key={checkin.id} />)
              ) : (
                <Text style={styles.empty}>Nenhum check-in ainda. O primeiro pode ser hoje.</Text>
              )
            ) : checkins.length ? (
              checkins.map((checkin) => (
                <View
                  accessibilityLabel={`${formatSessionDate(checkin.at)}, ${formatDistance(checkin.distanceM)} da academia, ${
                    checkin.atGym ? 'no local' : 'fora do local'
                  }`}
                  accessible
                  key={checkin.id}
                  style={styles.row}>
                  <View style={styles.rowText}>
                    <Text style={styles.rowDate}>{formatSessionDate(checkin.at)}</Text>
                    <Text style={styles.rowMeta}>{formatDistance(checkin.distanceM)} da academia</Text>
                  </View>
                  <View
                    style={[
                      styles.tag,
                      { backgroundColor: withAlpha(checkin.atGym ? theme.status.success : theme.status.warning, 0.16) },
                    ]}>
                    <Text style={[styles.tagText, { color: checkin.atGym ? theme.status.success : theme.status.warning }]}>
                      {checkin.atGym ? 'no local' : 'fora do local'}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.empty}>Nenhum check-in ainda. O primeiro pode ser hoje.</Text>
            )}
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function GymStatus({ confirmed }: { confirmed: boolean }) {
  const styles = useStyles();
  const { theme } = useTheme();

  return (
    <View style={styles.statusRow}>
      <Ionicons
        color={confirmed ? theme.status.success : theme.text.muted}
        name={confirmed ? 'shield-checkmark' : 'shield-outline'}
        size={18}
        style={styles.statusIcon}
      />
      <Text style={styles.statusText}>{confirmed ? GYM_CONFIRMED : GYM_UNCONFIRMED}</Text>
    </View>
  );
}

type AccountCheckinStatusProps = {
  busy: boolean;
  checkin: ServerCheckin | null;
  failure: { message: string; offline: boolean } | null;
  onResend: () => void;
  pending: boolean;
  sending: boolean;
};

function AccountCheckinStatus({ busy, checkin, failure, onResend, pending, sending }: AccountCheckinStatusProps) {
  const styles = useStyles();
  const { theme } = useTheme();

  if (sending) {
    return (
      <Text accessibilityLiveRegion="polite" style={styles.hint}>
        Enviando para o ranking…
      </Text>
    );
  }

  const status = accountStatus(checkin, failure, pending);

  if (!status) {
    return null;
  }

  const color = {
    neutral: theme.text.secondary,
    success: theme.status.success,
    warning: theme.status.warning,
  }[status.tone];

  return (
    <View accessibilityLiveRegion="polite" style={styles.verdict}>
      <View style={styles.statusRow}>
        <Ionicons color={color} name={status.icon} size={18} style={styles.statusIcon} />
        <Text style={styles.verdictText}>{status.text}</Text>
      </View>
      {status.canResend ? (
        <Button
          accessibilityLabel="Enviar o check-in de hoje de novo para o ranking"
          icon="refresh"
          loading={busy}
          onPress={onResend}
          title="Enviar de novo"
          variant="outline"
        />
      ) : null}
    </View>
  );
}

function AccountCheckinRow({ checkin }: { checkin: ServerCheckin }) {
  const styles = useStyles();
  const { theme } = useTheme();
  const date = accountCheckinDate(checkin);
  const distance = `${formatDistance(checkin.distanceM)} da academia${checkin.withinRadius ? '' : ', fora do raio'}`;
  const status = checkin.verified ? 'verificado' : 'declarado';

  return (
    <View accessibilityLabel={`${date}, ${distance}, ${status}`} accessible style={styles.row}>
      <View style={styles.rowText}>
        <Text style={styles.rowDate}>{date}</Text>
        <Text style={styles.rowMeta}>{distance}</Text>
      </View>
      <View
        style={[
          styles.tag,
          styles.tagRow,
          checkin.verified ? { backgroundColor: withAlpha(theme.status.success, 0.16) } : styles.tagNeutral,
        ]}>
        {checkin.verified ? <Ionicons color={theme.status.success} name="shield-checkmark" size={12} /> : null}
        <Text style={[styles.tagText, { color: checkin.verified ? theme.text.primary : theme.text.secondary }]}>
          {status}
        </Text>
      </View>
    </View>
  );
}

function LocationIssueNotice({ issue }: { issue: LocationIssue }) {
  const styles = useStyles();
  const { theme } = useTheme();

  return (
    <View accessibilityLiveRegion="polite" style={[styles.notice, { borderColor: withAlpha(theme.status.warning, 0.4) }]}>
      <Ionicons color={theme.status.warning} name="alert-circle-outline" size={18} />
      <View style={styles.noticeBody}>
        <Text style={styles.noticeText}>
          {issue === 'denied'
            ? 'Sem acesso à localização. Permita nos ajustes do aparelho para marcar a academia e fazer check-in.'
            : 'Não foi possível obter sua localização. Confira se o GPS está ligado e tente de novo.'}
        </Text>
        {/* No web não existe tela de ajustes do app; o navegador cuida da permissão. */}
        {issue === 'denied' && Platform.OS !== 'web' ? (
          <Button
            icon="settings-outline"
            onPress={() => void Linking.openSettings().catch(() => undefined)}
            title="Abrir ajustes"
            variant="outline"
          />
        ) : null}
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
    ...typography.h1,
    color: theme.text.primary,
    flex: 1,
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
  },
  cardIcon: {
    alignItems: 'center',
    borderRadius: radius.md,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  cardHeading: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    color: theme.text.primary,
    flexShrink: 1,
    fontFamily: fonts.extrabold,
    fontSize: 18,
  },
  cardText: {
    color: theme.text.secondary,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  distance: {
    color: theme.text.secondary,
    fontFamily: fonts.semibold,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  hint: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 17,
  },
  doneRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 12,
  },
  doneText: {
    color: theme.status.success,
    fontFamily: fonts.bold,
    fontSize: 15,
  },
  notice: {
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 12,
  },
  noticeBody: {
    flex: 1,
    gap: 10,
  },
  noticeText: {
    color: theme.text.secondary,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  statusRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 8,
  },
  // Alinha o ícone com a primeira linha do texto ao lado.
  statusIcon: {
    marginTop: 1,
  },
  statusText: {
    color: theme.text.secondary,
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 19,
  },
  verdict: {
    gap: 10,
  },
  verdictText: {
    color: theme.text.primary,
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 20,
  },
  linkButton: {
    alignItems: 'center',
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 8,
  },
  linkText: {
    color: theme.text.muted,
    fontFamily: fonts.semibold,
    fontSize: 13,
  },
  sectionTitle: {
    color: theme.text.primary,
    fontFamily: fonts.extrabold,
    fontSize: 16,
  },
  row: {
    alignItems: 'center',
    backgroundColor: theme.bg.surface,
    borderColor: theme.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowDate: {
    color: theme.text.primary,
    fontFamily: fonts.bold,
    fontSize: 15,
  },
  rowMeta: {
    color: theme.text.secondary,
    fontFamily: fonts.regular,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  tag: {
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  tagNeutral: {
    backgroundColor: theme.bg.raised,
  },
  tagText: {
    fontFamily: fonts.bold,
    fontSize: 12,
  },
  empty: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  pressed: {
    opacity: 0.75,
  },
}));
