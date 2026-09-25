import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ComponentProps } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, Switch, Text, TextInput, View } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { useSession } from '@/src/contexts/session-context';
import { ApiError } from '@/src/services/api';
import { createGymNotice, deleteGymNotice, getGymBoard, setGymRanking } from '@/src/services/coaching';
import { fonts, makeStyles, radius, useTheme, withAlpha } from '@/src/theme';
import type { GymBoard as Board, GymNotice } from '@/src/types/coaching';
import { formatShortDate, monthLabel } from '@/src/utils/format';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

// Os limites do aviso, como a API pede: título de 2 a 80 caracteres e texto de 2 a 1000.
const TITLE_MAX = 80;
const BODY_MAX = 1000;
const MIN_LENGTH = 2;

const messageOf = (reason: unknown, fallback: string) => (reason instanceof Error ? reason.message : fallback);

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

// No navegador o Alert do React Native não aparece; lá vale a confirmação do próprio navegador.
function askToConfirm(title: string, message: string, action: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }

    return;
  }

  Alert.alert(title, message, [
    { style: 'cancel', text: 'Cancelar' },
    { onPress: onConfirm, style: 'destructive', text: action },
  ]);
}

type GymBoardProps = {
  gymId: string;
  // A API disse que esta academia não é mais a da conta (trocada em outro aparelho): a tela relê a da
  // conta. Com outra academia, a tela troca este mural pelo dela (key); sem nenhuma, ele sai.
  onGymChanged: () => Promise<void>;
};

/**
 * "Mural da academia", no check-in (Fase 5, 22-estrategia.md seção 1.3): os avisos do responsável, o
 * ranking do mês pela constância verificada (dias com treino e check-in verificado, com o primeiro nome e a
 * inicial, como na liga) e a escolha de aparecer nele. O responsável publica e apaga avisos aqui mesmo.
 */
export function GymBoard({ gymId, onGymChanged }: GymBoardProps) {
  const styles = useStyles();
  const { theme } = useTheme();
  const { session } = useSession();
  const token = session?.token;
  const [board, setBoard] = useState<Board | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  // A escolha de aparecer no ranking enquanto a API não confirma.
  const [pendingShow, setPendingShow] = useState<boolean | null>(null);
  const [rankingError, setRankingError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [noticeError, setNoticeError] = useState<string | null>(null);
  // Uma resposta que chega depois de o mural sair da tela (a academia mudou) não mexe em nada.
  const mounted = useRef(true);
  // A função da tela muda a cada render; o mural só precisa da mais recente.
  const gymChanged = useRef(onGymChanged);

  useEffect(() => {
    gymChanged.current = onGymChanged;
  });

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    if (!token) {
      return;
    }

    try {
      const next = await getGymBoard(token, gymId);

      if (mounted.current) {
        setBoard(next);
        setError(null);
      }
    } catch (reason) {
      if (!mounted.current) {
        return;
      }

      if (reason instanceof ApiError && reason.status === 404) {
        setBoard(null);
        setError('A academia da sua conta mudou. Atualizando…');
        await gymChanged.current();

        // Continua na tela: a academia da conta é esta mesma, e vale o que a API disse.
        if (mounted.current) {
          setError(reason.message);
        }

        return;
      }

      // Sem conexão numa recarga, o mural que já estava na tela continua; o aviso só aparece sem ele.
      setError(messageOf(reason, 'Não foi possível abrir o mural agora.'));
    }
  }, [gymId, token]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function retry() {
    setIsRetrying(true);
    await load();
    setIsRetrying(false);
  }

  async function changeRanking(show: boolean) {
    if (!token) {
      return;
    }

    // Otimista: a chave muda na hora; se a API recusar, volta ao que o mural diz.
    setPendingShow(show);
    setRankingError(null);

    try {
      const saved = await setGymRanking(token, show);

      if (mounted.current) {
        setBoard((current) => {
          if (!current) {
            return current;
          }

          return { ...current, ranking: { ...current.ranking, me: { ...current.ranking.me, hidden: !saved } } };
        });
      }

      // A lista muda com a escolha: a pessoa entra ou sai dela.
      void load();
    } catch (reason) {
      if (mounted.current) {
        setRankingError(messageOf(reason, 'Não foi possível salvar a sua escolha.'));
      }
    } finally {
      if (mounted.current) {
        setPendingShow(null);
      }
    }
  }

  async function removeNotice(notice: GymNotice) {
    if (!token) {
      return;
    }

    setDeletingId(notice.id);
    setNoticeError(null);

    try {
      await deleteGymNotice(token, gymId, notice.id);
      setBoard((current) =>
        current ? { ...current, notices: current.notices.filter((item) => item.id !== notice.id) } : current,
      );
    } catch (reason) {
      // 404: o aviso já tinha saído, ou a academia mudou. 403: a pessoa deixou de ser a responsável. O
      // mural recarrega e mostra o que vale agora.
      if (reason instanceof ApiError && (reason.status === 404 || reason.status === 403)) {
        void load();
      }

      if (!(reason instanceof ApiError && reason.status === 404)) {
        setNoticeError(messageOf(reason, 'Não foi possível apagar o aviso.'));
      }
    } finally {
      setDeletingId(null);
    }
  }

  function confirmRemove(notice: GymNotice) {
    askToConfirm('Apagar este aviso?', `“${notice.title}” sai do mural para todo mundo.`, 'Apagar', () => {
      void removeNotice(notice);
    });
  }

  function handlePublished(notice: GymNotice) {
    setBoard((current) => (current ? { ...current, notices: [notice, ...current.notices] } : current));
  }

  const ranking = board?.ranking;
  const isShowing = pendingShow ?? !(ranking?.me.hidden ?? false);
  const meInList = ranking?.entries.some((entry) => entry.isMe) ?? false;

  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>
        Mural da academia
      </Text>

      {!board && !error ? (
        <ActivityIndicator accessibilityLabel="Carregando o mural" color={theme.accent.primary} />
      ) : null}

      {error && !board ? (
        <View style={styles.card}>
          <Text accessibilityLiveRegion="polite" style={styles.cardText}>
            {error}
          </Text>
          <Button loading={isRetrying} onPress={retry} title="Tentar de novo" variant="ghost" />
        </View>
      ) : null}

      {board && ranking ? (
        <>
          <View style={styles.card}>
            <CardHeading icon="bullhorn-outline" title="Avisos" />
            {board.notices.length ? (
              board.notices.map((notice) => (
                <NoticeRow
                  busy={deletingId === notice.id}
                  canDelete={board.isOwner}
                  key={notice.id}
                  notice={notice}
                  onDelete={() => confirmRemove(notice)}
                />
              ))
            ) : (
              <Text style={styles.empty}>
                {board.isOwner
                  ? 'Nenhum aviso ainda. Que tal começar com as boas-vindas à turma?'
                  : 'Nenhum aviso por enquanto. Quando a academia publicar, aparece aqui.'}
              </Text>
            )}
            {noticeError ? (
              <Text accessibilityLiveRegion="polite" style={styles.errorText}>
                {noticeError}
              </Text>
            ) : null}
            {board.isOwner ? <NoticeForm gymId={gymId} onPublished={handlePublished} onStale={load} /> : null}
          </View>

          <View style={styles.card}>
            <CardHeading icon="trophy-outline" title={`Ranking de ${monthLabel(ranking.month)}`} />
            <Text style={styles.cardText}>Constância verificada: dias do mês com treino e check-in verificado.</Text>
            {ranking.hint ? (
              <View style={styles.hintBox}>
                <Ionicons color={theme.status.info} name="information-circle-outline" size={18} />
                <Text style={styles.hintText}>{ranking.hint}</Text>
              </View>
            ) : null}

            {ranking.entries.length ? (
              <View style={styles.rankList}>
                {ranking.entries.map((entry, index) => (
                  <View
                    accessibilityLabel={[`${entry.rank}º lugar`, entry.isMe ? 'você' : entry.name, plural(entry.days, 'dia', 'dias')].join(', ')}
                    accessible
                    key={`${index}-${entry.name}`}
                    style={[
                      styles.rankRow,
                      entry.isMe ? { backgroundColor: withAlpha(theme.accent.primary, 0.12) } : null,
                    ]}>
                    <Text style={styles.rankPosition}>{entry.rank}º</Text>
                    <Text numberOfLines={1} style={styles.rankName}>
                      {entry.name}
                      {entry.isMe ? ' (você)' : ''}
                    </Text>
                    <Text style={styles.rankDays}>{plural(entry.days, 'dia', 'dias')}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.empty}>
                Ninguém pontuou ainda este mês. Um dia com treino e check-in verificado já coloca você aqui.
              </Text>
            )}

            {ranking.me.hidden ? (
              <Text style={styles.cardText}>
                Você está fora do ranking. Seus dias verificados este mês: {ranking.me.days}.
              </Text>
            ) : !meInList && ranking.entries.length ? (
              <Text style={styles.cardText}>
                {ranking.me.days
                  ? `Você tem ${plural(ranking.me.days, 'dia verificado', 'dias verificados')} este mês.`
                  : 'Seu primeiro dia verificado do mês já coloca você na lista.'}
              </Text>
            ) : null}

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Aparecer no ranking da academia</Text>
              <Switch
                accessibilityLabel="Aparecer no ranking da academia"
                disabled={pendingShow !== null}
                ios_backgroundColor={theme.bg.high}
                onValueChange={(show) => void changeRanking(show)}
                thumbColor={isShowing ? theme.accent.primary : theme.text.muted}
                trackColor={{ false: theme.bg.high, true: withAlpha(theme.accent.primary, 0.45) }}
                value={isShowing}
              />
            </View>
            <Text style={styles.hint}>
              No ranking aparecem o seu primeiro nome, a inicial do sobrenome e os dias verificados do mês. Nada de
              treino, carga ou localização.
            </Text>
            {rankingError ? (
              <Text accessibilityLiveRegion="polite" style={styles.errorText}>
                {rankingError}
              </Text>
            ) : null}
          </View>
        </>
      ) : null}
    </View>
  );
}

function CardHeading({ icon, title }: { icon: IconName; title: string }) {
  const styles = useStyles();
  const { theme } = useTheme();

  return (
    <View style={styles.cardHeading}>
      <View style={[styles.cardIcon, { backgroundColor: withAlpha(theme.domain.treino, 0.16) }]}>
        <MaterialCommunityIcons color={theme.domain.treino} name={icon} size={20} />
      </View>
      <Text style={styles.cardTitle}>{title}</Text>
    </View>
  );
}

type NoticeRowProps = {
  busy: boolean;
  canDelete: boolean;
  notice: GymNotice;
  onDelete: () => void;
};

function NoticeRow({ busy, canDelete, notice, onDelete }: NoticeRowProps) {
  const styles = useStyles();
  const { theme } = useTheme();
  const createdAt = Date.parse(notice.createdAt);
  const meta = [notice.author, Number.isNaN(createdAt) ? null : formatShortDate(createdAt)]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={styles.notice}>
      <View style={styles.noticeHeader}>
        <Text style={styles.noticeTitle}>{notice.title}</Text>
        {canDelete ? (
          busy ? (
            <ActivityIndicator color={theme.text.muted} size="small" />
          ) : (
            <Pressable
              accessibilityLabel={`Apagar o aviso ${notice.title}`}
              accessibilityRole="button"
              hitSlop={10}
              onPress={onDelete}
              style={({ pressed }) => [pressed ? styles.pressed : null]}>
              <Ionicons color={theme.text.muted} name="trash-outline" size={18} />
            </Pressable>
          )
        ) : null}
      </View>
      <Text style={styles.noticeBody}>{notice.body}</Text>
      {meta ? <Text style={styles.noticeMeta}>{meta}</Text> : null}
    </View>
  );
}

type NoticeFormProps = {
  gymId: string;
  onPublished: (notice: GymNotice) => void;
  onStale: () => Promise<void>;
};

// Só para o responsável pelo mural: um título curto e o texto do aviso.
function NoticeForm({ gymId, onPublished, onStale }: NoticeFormProps) {
  const styles = useStyles();
  const { theme } = useTheme();
  const { session } = useSession();
  const token = session?.token;
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPublished, setIsPublished] = useState(false);
  const canPublish = title.trim().length >= MIN_LENGTH && body.trim().length >= MIN_LENGTH;

  async function publish() {
    if (!token) {
      return;
    }

    if (!canPublish) {
      setError('Escreva um título e o texto do aviso.');
      return;
    }

    setIsPublishing(true);
    setError(null);

    try {
      const notice = await createGymNotice(token, gymId, { body: body.trim(), title: title.trim() });
      onPublished(notice);
      setTitle('');
      setBody('');
      setIsPublished(true);
    } catch (reason) {
      // A academia mudou (404) ou a pessoa deixou de ser a responsável (403): o mural recarrega.
      if (reason instanceof ApiError && (reason.status === 404 || reason.status === 403)) {
        void onStale();
      }

      setError(messageOf(reason, 'Não foi possível publicar o aviso.'));
    } finally {
      setIsPublishing(false);
    }
  }

  return (
    <View style={styles.form}>
      <View style={styles.divider} />
      <Text style={styles.formTitle}>Publicar aviso</Text>
      <Input
        autoCapitalize="sentences"
        editable={!isPublishing}
        helperText={`${title.length}/${TITLE_MAX}`}
        label="Título"
        maxLength={TITLE_MAX}
        onChangeText={(text) => {
          setTitle(text);
          setError(null);
          setIsPublished(false);
        }}
        placeholder="Ex.: Horário do feriado"
        returnKeyType="next"
        value={title}
      />
      <View style={styles.textArea}>
        <TextInput
          accessibilityLabel={`Texto do aviso, até ${BODY_MAX} caracteres`}
          cursorColor={theme.accent.primary}
          editable={!isPublishing}
          maxLength={BODY_MAX}
          multiline
          onChangeText={(text) => {
            setBody(text);
            setError(null);
            setIsPublished(false);
          }}
          placeholder="Escreva o aviso para a turma"
          placeholderTextColor={theme.text.muted}
          selectionColor={theme.accent.primary}
          style={styles.textAreaInput}
          textAlignVertical="top"
          value={body}
        />
      </View>
      <Text
        accessibilityLabel={`${body.length} de ${BODY_MAX} caracteres`}
        style={[styles.counter, body.length >= BODY_MAX ? styles.counterFull : null]}>
        {body.length}/{BODY_MAX}
      </Text>
      {error ? (
        <Text accessibilityLiveRegion="polite" style={styles.errorText}>
          {error}
        </Text>
      ) : null}
      {isPublished ? (
        <View accessibilityLiveRegion="polite" style={styles.successRow}>
          <Ionicons color={theme.status.success} name="checkmark-circle" size={18} />
          <Text style={styles.successText}>Aviso publicado no mural.</Text>
        </View>
      ) : null}
      <Button
        disabled={!canPublish}
        icon="megaphone-outline"
        loading={isPublishing}
        onPress={publish}
        title="Publicar aviso"
        variant="outline"
      />
      <Text style={styles.hint}>Todo mundo que marcou esta academia vê o aviso, com o seu primeiro nome e a inicial.</Text>
    </View>
  );
}

const useStyles = makeStyles((theme) => ({
  section: {
    gap: 12,
  },
  sectionTitle: {
    color: theme.text.primary,
    fontFamily: fonts.extrabold,
    fontSize: 16,
  },
  card: {
    backgroundColor: theme.bg.surface,
    borderColor: theme.border.subtle,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  cardHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  cardIcon: {
    alignItems: 'center',
    borderRadius: radius.sm,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  cardTitle: {
    color: theme.text.primary,
    flex: 1,
    fontFamily: fonts.extrabold,
    fontSize: 17,
  },
  cardText: {
    color: theme.text.secondary,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  empty: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  hint: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 17,
  },
  hintBox: {
    alignItems: 'flex-start',
    backgroundColor: withAlpha(theme.status.info, 0.1),
    borderRadius: radius.sm,
    flexDirection: 'row',
    gap: 8,
    padding: 10,
  },
  hintText: {
    color: theme.text.primary,
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  notice: {
    backgroundColor: theme.bg.raised,
    borderRadius: radius.md,
    gap: 6,
    padding: 12,
  },
  noticeHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
  },
  noticeTitle: {
    color: theme.text.primary,
    flex: 1,
    fontFamily: fonts.bold,
    fontSize: 15,
    lineHeight: 20,
  },
  noticeBody: {
    color: theme.text.secondary,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  noticeMeta: {
    color: theme.text.muted,
    fontFamily: fonts.semibold,
    fontSize: 12,
  },
  rankList: {
    gap: 4,
  },
  rankRow: {
    alignItems: 'center',
    borderRadius: radius.sm,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  rankPosition: {
    color: theme.text.muted,
    fontFamily: fonts.extrabold,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
    width: 32,
  },
  rankName: {
    color: theme.text.primary,
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: 15,
  },
  rankDays: {
    color: theme.text.secondary,
    fontFamily: fonts.bold,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
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
  },
  form: {
    gap: 10,
  },
  divider: {
    backgroundColor: theme.border.subtle,
    height: 1,
  },
  formTitle: {
    color: theme.text.primary,
    fontFamily: fonts.extrabold,
    fontSize: 15,
  },
  // No web o fundo dos campos é transparente (WebInputStyleReset): o fundo fica nesta caixa.
  textArea: {
    backgroundColor: theme.bg.raised,
    borderColor: theme.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    minHeight: 120,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  textAreaInput: {
    color: theme.text.primary,
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 15,
    lineHeight: 21,
    minHeight: 100,
    padding: 0,
  },
  counter: {
    alignSelf: 'flex-end',
    color: theme.text.muted,
    fontFamily: fonts.semibold,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    marginTop: -4,
  },
  counterFull: {
    color: theme.status.warning,
  },
  successRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  successText: {
    color: theme.status.success,
    fontFamily: fonts.semibold,
    fontSize: 14,
  },
  errorText: {
    color: theme.status.danger,
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.75,
  },
}));
