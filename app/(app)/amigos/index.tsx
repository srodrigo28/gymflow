import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { Screen } from '@/src/components/ui/Screen';
import { useSession } from '@/src/contexts/session-context';
import {
  acceptFriendRequest,
  declineFriendRequest,
  listFriends,
  removeFriend,
  sendFriendRequest,
} from '@/src/services/friends';
import { fonts, makeStyles, radius, typography, useTheme, withAlpha } from '@/src/theme';
import type { Friend, FriendsOverview } from '@/src/types/friends';
import { showAlert } from '@/src/utils/alert';

// "3 dias nesta semana": os dias distintos com treino concluído desde segunda-feira.
function daysLabel(days: number) {
  if (days === 0) {
    return 'Nenhum treino nesta semana';
  }

  return `${days} ${days === 1 ? 'dia' : 'dias'} nesta semana`;
}

export default function AmigosScreen() {
  const styles = useStyles();
  const { theme } = useTheme();
  const { session } = useSession();
  const [data, setData] = useState<FriendsOverview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [email, setEmail] = useState('');
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  // Id do pedido ou do amigo com uma ação em andamento: trava só aquele botão.
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const token = session?.token;

  const load = useCallback(async () => {
    if (!token) {
      return;
    }

    try {
      setData(await listFriends(token));
      setLoadError(null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Não foi possível carregar seus amigos.');
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

  async function handleInvite() {
    const address = email.trim();

    if (!token || !address) {
      return;
    }

    setIsSending(true);
    setInviteError(null);
    setInviteMessage(null);

    try {
      // A mensagem da API já vem pronta e é a mesma exista a conta ou não.
      setInviteMessage(await sendFriendRequest(token, address));
      setEmail('');
      await load();
    } catch (error) {
      setInviteError(error instanceof Error ? error.message : 'Não foi possível enviar o convite.');
    } finally {
      setIsSending(false);
    }
  }

  // Aceitar, recusar, cancelar e desfazer seguem o mesmo caminho: chama a API e recarrega a lista.
  async function runAction(id: string, action: () => Promise<unknown>, fallback: string) {
    if (!token) {
      return;
    }

    setBusyId(id);
    setActionError(null);

    try {
      await action();
      await load();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : fallback);
    } finally {
      setBusyId(null);
    }
  }

  function confirmRemove(friend: Friend) {
    showAlert('Desfazer amizade?', `${friend.name} deixa de ver seus dias de treino, e você deixa de ver os dele.`, [
      { style: 'cancel', text: 'Manter' },
      {
        onPress: () => {
          if (token) {
            void runAction(friend.userId, () => removeFriend(token, friend.userId), 'Não foi possível desfazer a amizade.');
          }
        },
        style: 'destructive',
        text: 'Desfazer',
      },
    ]);
  }

  return (
    <Screen edges={['top', 'right', 'left']}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
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
          <Text accessibilityRole="header" style={styles.title}>
            Amigos
          </Text>
        </View>

        <Text style={styles.intro}>
          Convide pelo e-mail da conta. Amigos veem só o seu nome e os dias com treino da semana.
        </Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Convidar pelo e-mail</Text>
          <Input
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            error={inviteError ?? undefined}
            icon="mail-outline"
            keyboardType="email-address"
            onChangeText={(text) => {
              setEmail(text);
              setInviteMessage(null);
            }}
            onSubmitEditing={handleInvite}
            placeholder="E-mail do seu amigo"
            returnKeyType="send"
            value={email}
          />
          <Button disabled={!email.trim()} loading={isSending} onPress={handleInvite} title="Enviar convite" />
          {inviteMessage ? (
            <Text accessibilityLiveRegion="polite" style={styles.notice}>
              {inviteMessage}
            </Text>
          ) : null}
        </View>

        {loadError ? <Text style={styles.error}>{loadError}</Text> : null}
        {actionError ? <Text style={styles.error}>{actionError}</Text> : null}

        {data && data.incoming.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Pedidos recebidos</Text>
            <View style={styles.list}>
              {data.incoming.map((request) => (
                <View key={request.id} style={styles.row}>
                  <View style={styles.rowText}>
                    <Text numberOfLines={1} style={styles.name}>
                      {request.from.name}
                    </Text>
                    <Text style={styles.subtitle}>Quer ser seu amigo</Text>
                  </View>
                  <SmallButton
                    accessibilityLabel={`Aceitar pedido de ${request.from.name}`}
                    disabled={busyId === request.id}
                    onPress={() =>
                      runAction(
                        request.id,
                        () => acceptFriendRequest(token ?? '', request.id),
                        'Não foi possível aceitar o pedido.',
                      )
                    }
                    title="Aceitar"
                    tone="accent"
                  />
                  <SmallButton
                    accessibilityLabel={`Recusar pedido de ${request.from.name}`}
                    disabled={busyId === request.id}
                    onPress={() =>
                      runAction(
                        request.id,
                        () => declineFriendRequest(token ?? '', request.id),
                        'Não foi possível recusar o pedido.',
                      )
                    }
                    title="Recusar"
                    tone="muted"
                  />
                </View>
              ))}
            </View>
          </>
        ) : null}

        {data && data.outgoing.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Convites enviados</Text>
            <View style={styles.list}>
              {data.outgoing.map((request) => (
                <View key={request.id} style={styles.row}>
                  <View style={styles.rowText}>
                    <Text numberOfLines={1} style={styles.name}>
                      {request.to.email}
                    </Text>
                    <Text style={styles.subtitle}>Aguardando resposta</Text>
                  </View>
                  <SmallButton
                    accessibilityLabel={`Cancelar convite para ${request.to.email}`}
                    disabled={busyId === request.id}
                    onPress={() =>
                      runAction(
                        request.id,
                        () => declineFriendRequest(token ?? '', request.id),
                        'Não foi possível cancelar o convite.',
                      )
                    }
                    title="Cancelar"
                    tone="muted"
                  />
                </View>
              ))}
            </View>
          </>
        ) : null}

        {data ? <Text style={styles.sectionTitle}>Amigos</Text> : null}

        {data?.friends.length === 0 ? (
          <Text style={styles.empty}>
            Você ainda não tem amigos aqui. Convide alguém pelo e-mail da conta: amigos veem só o seu nome e os dias com
            treino da semana, nunca medidas, cargas ou treinos.
          </Text>
        ) : null}

        {data && data.friends.length > 0 ? (
          <View style={styles.list}>
            {data.friends.map((friend) => (
              <View
                accessibilityLabel={`${friend.name}: ${daysLabel(friend.daysThisWeek)}${
                  friend.trainedToday ? ', treinou hoje' : ''
                }`}
                key={friend.userId}
                style={styles.row}>
                <View
                  style={[
                    styles.dot,
                    friend.trainedToday ? { backgroundColor: theme.status.success } : styles.dotIdle,
                  ]}
                />
                <View style={styles.rowText}>
                  <Text numberOfLines={1} style={styles.name}>
                    {friend.name}
                  </Text>
                  <Text style={styles.subtitle}>
                    {daysLabel(friend.daysThisWeek)}
                    {friend.trainedToday ? <Text style={styles.today}> · Treinou hoje</Text> : null}
                  </Text>
                </View>
                <Pressable
                  accessibilityLabel={`Desfazer amizade com ${friend.name}`}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: busyId === friend.userId }}
                  disabled={busyId === friend.userId}
                  hitSlop={8}
                  onPress={() => confirmRemove(friend)}
                  style={({ pressed }) => [styles.removeButton, pressed ? styles.pressed : null]}>
                  <MaterialCommunityIcons color={theme.text.muted} name="account-remove-outline" size={20} />
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}

        {data ? (
          <Text style={styles.rules}>
            Conta como dia com treino o treino concluído com pelo menos uma série feita, igual ao placar dos desafios.
            Puxe a tela para atualizar.
          </Text>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

type SmallButtonProps = {
  accessibilityLabel: string;
  disabled?: boolean;
  onPress: () => void;
  title: string;
  tone: 'accent' | 'muted';
};

// Botão compacto para as ações de cada linha (o Button ocupa a largura toda).
function SmallButton({ accessibilityLabel, disabled = false, onPress, title, tone }: SmallButtonProps) {
  const styles = useStyles();
  const { theme } = useTheme();

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [
        styles.smallButton,
        tone === 'accent' ? { backgroundColor: theme.accent.primary } : styles.smallButtonMuted,
        pressed || disabled ? styles.pressed : null,
      ]}>
      <Text style={[styles.smallButtonText, { color: tone === 'accent' ? theme.accent.onPrimary : theme.text.primary }]}>
        {title}
      </Text>
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
    ...typography.h1,
    color: theme.text.primary,
    flex: 1,
  },
  intro: {
    ...typography.body,
    color: theme.text.secondary,
  },
  card: {
    backgroundColor: theme.bg.surface,
    borderColor: theme.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  sectionTitle: {
    color: theme.text.primary,
    fontFamily: fonts.extrabold,
    fontSize: 16,
  },
  notice: {
    backgroundColor: withAlpha(theme.accent.primary, 0.12),
    borderRadius: radius.sm,
    color: theme.text.primary,
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    padding: 12,
  },
  error: {
    color: theme.status.danger,
    fontFamily: fonts.medium,
    fontSize: 14,
  },
  empty: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  list: {
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
    gap: 10,
    minHeight: 64,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: theme.text.primary,
    fontFamily: fonts.semibold,
    fontSize: 15,
  },
  subtitle: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 13,
  },
  today: {
    color: theme.status.success,
    fontFamily: fonts.semibold,
  },
  dot: {
    borderRadius: radius.pill,
    height: 10,
    width: 10,
  },
  dotIdle: {
    backgroundColor: 'transparent',
    borderColor: theme.border.strong,
    borderWidth: 1.5,
  },
  removeButton: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  smallButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 36,
    justifyContent: 'center',
    minWidth: 76,
    paddingHorizontal: 14,
  },
  smallButtonMuted: {
    backgroundColor: theme.bg.raised,
  },
  smallButtonText: {
    fontFamily: fonts.bold,
    fontSize: 13,
  },
  rules: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 19,
  },
  pressed: {
    opacity: 0.7,
  },
}));
