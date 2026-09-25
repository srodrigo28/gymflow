import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Platform, Pressable, Switch, Text, TextInput, View } from 'react-native';

import { DEFAULT_PERMISSIONS, PermissionSwitches } from '@/src/components/coaching/PermissionSwitches';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { useSession } from '@/src/contexts/session-context';
import { ApiError } from '@/src/services/api';
import {
  deleteCoachingLink,
  deleteTestimonial,
  getCoachingInvite,
  joinCoach,
  listMyCoaches,
  saveTestimonial,
  updateCoachingLink,
} from '@/src/services/coaching';
import { crefLabel, firstName, forgetCoachPlans, inviteCodeFrom } from '@/src/services/student-coaching';
import { fonts, makeStyles, radius, useTheme, withAlpha } from '@/src/theme';
import type { CoachingInvitePreview, CoachingPermissions, MyCoach } from '@/src/types/coaching';
import { formatShortDate } from '@/src/utils/format';

// O depoimento vai de 10 a 500 caracteres, como a API pede.
const TESTIMONIAL_MIN = 10;
const TESTIMONIAL_MAX = 500;

type LinkPatch = Partial<CoachingPermissions> & { showcase?: boolean };

type UpdateLink = (linkId: string, change: (link: MyCoach) => MyCoach) => void;

const messageOf = (reason: unknown, fallback: string) => (reason instanceof Error ? reason.message : fallback);

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

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

function permissionPatch(key: keyof CoachingPermissions, value: boolean) {
  const change: LinkPatch = {};
  change[key] = value;

  return change;
}

function withPatch(link: MyCoach, patch: LinkPatch): MyCoach {
  const { showcase, ...permissions } = patch;

  return { ...link, permissions: { ...link.permissions, ...permissions }, showcase: showcase ?? link.showcase };
}

// Os mesmos campos do patch, com os valores de `source`: o que a API confirmou, ou o que havia antes.
function patchFrom(source: MyCoach, patch: LinkPatch) {
  const values: LinkPatch = {};

  for (const key of Object.keys(patch) as (keyof LinkPatch)[]) {
    values[key] = key === 'showcase' ? source.showcase : source.permissions[key];
  }

  return values;
}

// A página pública do profissional abre no navegador dentro do app; no web, numa aba nova.
async function openPage(url: string) {
  try {
    await WebBrowser.openBrowserAsync(url);
  } catch {
    await Linking.openURL(url).catch(() => undefined);
  }
}

/**
 * "Meu personal", no Perfil (Fase 5, 22-estrategia.md seções 2.4 e 4). Os personais da pessoa, cada um com
 * o que vê (três chaves separadas que valem na hora), a vitrine na página do profissional, o depoimento e o
 * desfazer. O vínculo nasce do convite: o código entra aqui, e o link abre a tela do convite.
 */
export function CoachLinksCard() {
  const styles = useStyles();
  const { theme } = useTheme();
  const { session } = useSession();
  const token = session?.token;
  // null até a primeira resposta da API.
  const [coaches, setCoaches] = useState<MyCoach[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [joinedName, setJoinedName] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      return;
    }

    try {
      setCoaches(await listMyCoaches(token));
      setLoadError(null);
    } catch (reason) {
      setLoadError(messageOf(reason, 'Não foi possível carregar os seus personais.'));
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  // Por função: duas chaves tocadas em seguida não apagam uma a outra.
  const updateLink = useCallback<UpdateLink>((linkId, change) => {
    setCoaches((current) => current?.map((item) => (item.linkId === linkId ? change(item) : item)) ?? current);
  }, []);

  const removeLink = useCallback((linkId: string) => {
    setCoaches((current) => current?.filter((item) => item.linkId !== linkId) ?? current);
  }, []);

  async function retry() {
    setIsRetrying(true);
    await load();
    setIsRetrying(false);
  }

  function handleJoined(link: MyCoach) {
    // Aceitar o convite de quem já é seu personal só atualiza o vínculo que existia.
    setCoaches((current) => [...(current ?? []).filter((item) => item.linkId !== link.linkId), link]);
    setJoinedName(firstName(link.coach.name));
    setIsJoinOpen(false);
  }

  const isEmpty = coaches !== null && coaches.length === 0;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons color={theme.accent.primary} name="whistle-outline" size={20} />
        </View>
        <View style={styles.headerText}>
          <Text accessibilityRole="header" style={styles.title}>
            Meu personal
          </Text>
          <Text style={styles.subtitle}>Você escolhe o que compartilha e muda quando quiser.</Text>
        </View>
      </View>

      {coaches === null && !loadError ? (
        <ActivityIndicator accessibilityLabel="Carregando os seus personais" color={theme.accent.primary} />
      ) : null}

      {loadError ? (
        <View style={styles.stack}>
          <Text accessibilityLiveRegion="polite" style={styles.errorText}>
            {loadError}
          </Text>
          <Button loading={isRetrying} onPress={retry} title="Tentar de novo" variant="ghost" />
        </View>
      ) : null}

      {isEmpty ? (
        <Text style={styles.text}>
          Treina com personal? Com o código de convite do seu personal, vocês ficam ligados aqui: os treinos
          prescritos aparecem no seu Treino, e o personal acompanha só o que você escolher compartilhar.
        </Text>
      ) : null}

      {coaches?.map((link) => (
        <CoachLinkItem key={link.linkId} link={link} onRemoved={removeLink} onStale={load} onUpdate={updateLink} />
      ))}

      {joinedName ? (
        <View accessibilityLiveRegion="polite" style={styles.successRow}>
          <Ionicons color={theme.status.success} name="checkmark-circle" size={18} />
          <Text style={styles.successText}>Pronto: você e {joinedName} estão ligados.</Text>
        </View>
      ) : null}

      {isJoinOpen ? (
        <JoinByCode onCancel={() => setIsJoinOpen(false)} onJoined={handleJoined} />
      ) : (
        <Button
          icon="key-outline"
          onPress={() => {
            setJoinedName(null);
            setIsJoinOpen(true);
          }}
          title="Tenho um código de convite"
          variant={isEmpty ? 'primary' : 'outline'}
        />
      )}
    </View>
  );
}

type CoachLinkItemProps = {
  link: MyCoach;
  onRemoved: (linkId: string) => void;
  // O vínculo sumiu do lado da API (o personal desfez): a lista recarrega.
  onStale: () => Promise<void>;
  onUpdate: UpdateLink;
};

function CoachLinkItem({ link, onRemoved, onStale, onUpdate }: CoachLinkItemProps) {
  const styles = useStyles();
  const { theme } = useTheme();
  const { session } = useSession();
  const token = session?.token;
  const userId = session?.user.id;
  const coach = link.coach;
  const name = firstName(coach.name);
  const pageUrl = coach.pageUrl;
  const [error, setError] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  // O pedido mais recente de cada chave: a resposta de um toque antigo não desfaz um mais novo.
  const requests = useRef(0);
  const latest = useRef<Partial<Record<keyof LinkPatch, number>>>({});

  function handleFailure(reason: unknown, fallback: string) {
    if (reason instanceof ApiError && reason.status === 404) {
      void onStale();
      return;
    }

    setError(messageOf(reason, fallback));
  }

  // Só as chaves em que este pedido ainda é o mais recente.
  function stillMine(change: LinkPatch, request: number) {
    const own: LinkPatch = {};

    for (const key of Object.keys(change) as (keyof LinkPatch)[]) {
      if (latest.current[key] === request) {
        own[key] = change[key];
      }
    }

    return own;
  }

  // Cada chave vale na hora. Otimista: muda na tela já; se a API recusar, só estes campos voltam ao que eram.
  async function patch(change: LinkPatch) {
    if (!token) {
      return;
    }

    requests.current += 1;
    const request = requests.current;

    for (const key of Object.keys(change) as (keyof LinkPatch)[]) {
      latest.current[key] = request;
    }

    onUpdate(link.linkId, (item) => withPatch(item, change));
    setError(null);

    try {
      const saved = await updateCoachingLink(token, link.linkId, change);
      onUpdate(link.linkId, (item) => withPatch(item, patchFrom(saved, stillMine(change, request))));
    } catch (reason) {
      onUpdate(link.linkId, (item) => withPatch(item, patchFrom(link, stillMine(change, request))));
      handleFailure(reason, 'Não foi possível salvar a sua escolha. Tente de novo.');
    }
  }

  async function unlink() {
    if (!token) {
      return;
    }

    setIsRemoving(true);
    setError(null);

    try {
      await deleteCoachingLink(token, link.linkId);
    } catch (reason) {
      // 404: já estava desfeito (pelo personal). O resultado é o mesmo.
      if (!(reason instanceof ApiError && reason.status === 404)) {
        setError(messageOf(reason, 'Não foi possível desfazer o vínculo. Tente de novo.'));
        setIsRemoving(false);
        return;
      }
    }

    // As prescrições saíram da conta junto com o vínculo; a cópia do aparelho acompanha.
    if (userId) {
      await forgetCoachPlans(userId, coach.id);
    }

    onRemoved(link.linkId);
  }

  function confirmUnlink() {
    askToConfirm(
      `Desfazer o vínculo com ${name}?`,
      `${name} deixa de ver o que você compartilha na hora, e as prescrições de ${name} saem do seu Treino. Os treinos que você fez continuam com você.`,
      'Desfazer',
      () => void unlink(),
      'Manter',
    );
  }

  const details = [coach.city, `juntos desde ${formatShortDate(Date.parse(link.since))}`].filter(Boolean).join(' · ');

  return (
    <View style={styles.link}>
      <View style={styles.coachRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.coachText}>
          <Text style={styles.coachName}>{coach.name}</Text>
          {coach.cref ? <Text style={styles.meta}>{crefLabel(coach.cref)}</Text> : null}
          <Text style={styles.meta}>{details}</Text>
        </View>
      </View>

      {pageUrl ? (
        <Pressable
          accessibilityLabel={`Abrir a página de ${coach.name}`}
          accessibilityRole="link"
          hitSlop={6}
          onPress={() => void openPage(pageUrl)}
          style={({ pressed }) => [styles.inlineLink, pressed ? styles.pressed : null]}>
          <Ionicons color={theme.accent.primary} name="open-outline" size={16} />
          <Text style={styles.inlineLinkText}>Ver a página do profissional</Text>
        </Pressable>
      ) : null}

      {link.activePlans ? (
        <Pressable
          accessibilityLabel={`${plural(link.activePlans, 'prescrição ativa', 'prescrições ativas')}. Abrir o Treino`}
          accessibilityRole="link"
          hitSlop={6}
          onPress={() => router.push('/(app)/treino')}
          style={({ pressed }) => [styles.inlineLink, pressed ? styles.pressed : null]}>
          <MaterialCommunityIcons color={theme.accent.primary} name="clipboard-text-outline" size={16} />
          <Text style={styles.inlineLinkText}>
            {plural(link.activePlans, 'prescrição ativa', 'prescrições ativas')}: veja no Treino
          </Text>
        </Pressable>
      ) : null}

      <View style={styles.divider} />

      <Text style={styles.sectionLabel}>O que {name} vê</Text>
      <PermissionSwitches
        coachName={name}
        linkToEvolution
        onChange={(key, value) => void patch(permissionPatch(key, value))}
        value={link.permissions}
      />

      <View style={styles.divider} />

      <View style={styles.switchRow}>
        <View style={styles.flex}>
          <Text style={styles.switchLabel}>Aparecer na página do profissional</Text>
          <Text style={styles.description}>
            Na página pública de {name} aparecem só o seu primeiro nome, a inicial do sobrenome e as suas conquistas.
          </Text>
        </View>
        <Switch
          accessibilityLabel={`Aparecer na página de ${name}`}
          ios_backgroundColor={theme.bg.high}
          onValueChange={(showcase) => void patch({ showcase })}
          thumbColor={link.showcase ? theme.accent.primary : theme.text.muted}
          trackColor={{ false: theme.bg.high, true: withAlpha(theme.accent.primary, 0.45) }}
          value={link.showcase}
        />
      </View>

      <View style={styles.divider} />

      <TestimonialSection link={link} name={name} onStale={onStale} onUpdate={onUpdate} />

      {error ? (
        <Text accessibilityLiveRegion="polite" style={styles.errorText}>
          {error}
        </Text>
      ) : null}

      <Button
        accessibilityLabel={`Desfazer o vínculo com ${coach.name}`}
        icon="unlink-outline"
        loading={isRemoving}
        onPress={confirmUnlink}
        title="Desfazer vínculo"
        variant="ghost"
      />
    </View>
  );
}

type TestimonialSectionProps = {
  link: MyCoach;
  name: string;
  onStale: () => Promise<void>;
  onUpdate: UpdateLink;
};

// O depoimento do aluno. Só aparece na página depois que o personal aprova; editar pede a aprovação de novo.
function TestimonialSection({ link, name, onStale, onUpdate }: TestimonialSectionProps) {
  const styles = useStyles();
  const { theme } = useTheme();
  const { session } = useSession();
  const token = session?.token;
  const testimonial = link.testimonial;
  // null: fora da edição.
  const [draft, setDraft] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFailure(reason: unknown, fallback: string) {
    if (reason instanceof ApiError && reason.status === 404) {
      void onStale();
      return;
    }

    setError(messageOf(reason, fallback));
  }

  async function save() {
    if (!token || draft === null) {
      return;
    }

    const text = draft.trim();

    if (text.length < TESTIMONIAL_MIN) {
      setError(`Escreva pelo menos ${TESTIMONIAL_MIN} caracteres.`);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const saved = await saveTestimonial(token, link.linkId, text);
      onUpdate(link.linkId, (item) => ({ ...item, testimonial: saved.testimonial }));
      setDraft(null);
    } catch (reason) {
      handleFailure(reason, 'Não foi possível salvar o depoimento. Tente de novo.');
    } finally {
      setIsSaving(false);
    }
  }

  async function remove() {
    if (!token) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const saved = await deleteTestimonial(token, link.linkId);
      onUpdate(link.linkId, (item) => ({ ...item, testimonial: saved.testimonial }));
    } catch (reason) {
      handleFailure(reason, 'Não foi possível apagar o depoimento. Tente de novo.');
    } finally {
      setIsSaving(false);
    }
  }

  function confirmRemove() {
    askToConfirm(
      'Apagar o depoimento?',
      `Ele sai da página de ${name}, se já estava lá. Dá para escrever outro quando quiser.`,
      'Apagar',
      () => void remove(),
    );
  }

  const errorText = error ? (
    <Text accessibilityLiveRegion="polite" style={styles.errorText}>
      {error}
    </Text>
  ) : null;

  if (draft !== null) {
    const length = draft.trim().length;

    return (
      <View style={styles.stack}>
        <Text style={styles.sectionLabel}>{testimonial ? 'Editar depoimento' : 'Depoimento'}</Text>
        <View style={styles.textArea}>
          <TextInput
            accessibilityLabel={`Depoimento sobre ${name}, de ${TESTIMONIAL_MIN} a ${TESTIMONIAL_MAX} caracteres`}
            autoFocus
            cursorColor={theme.accent.primary}
            editable={!isSaving}
            maxLength={TESTIMONIAL_MAX}
            multiline
            onChangeText={(text) => {
              setDraft(text);
              setError(null);
            }}
            placeholder={`Como é treinar com ${name}?`}
            placeholderTextColor={theme.text.muted}
            selectionColor={theme.accent.primary}
            style={styles.textAreaInput}
            textAlignVertical="top"
            value={draft}
          />
        </View>
        <Text
          accessibilityLabel={`${draft.length} de ${TESTIMONIAL_MAX} caracteres`}
          style={[styles.counter, draft.length >= TESTIMONIAL_MAX ? styles.counterFull : null]}>
          {draft.length}/{TESTIMONIAL_MAX}
        </Text>
        <Text style={styles.description}>
          {testimonial
            ? `Ao salvar, o depoimento volta a esperar a aprovação de ${name} para aparecer na página.`
            : `Aparece na página de ${name} depois que ${name} aprovar.`}
        </Text>
        {errorText}
        <Button
          disabled={length < TESTIMONIAL_MIN}
          loading={isSaving}
          onPress={save}
          title={testimonial ? 'Salvar depoimento' : 'Enviar depoimento'}
        />
        <Button disabled={isSaving} onPress={() => setDraft(null)} title="Cancelar" variant="ghost" />
      </View>
    );
  }

  if (!testimonial) {
    return (
      <View style={styles.stack}>
        <Text style={styles.sectionLabel}>Depoimento</Text>
        <Text style={styles.description}>
          Conte como é treinar com {name}. Um depoimento na página ajuda um bom profissional a ser encontrado.
        </Text>
        {errorText}
        <Button
          icon="chatbubble-ellipses-outline"
          onPress={() => setDraft('')}
          title="Escrever depoimento"
          variant="outline"
        />
      </View>
    );
  }

  const tone = testimonial.approved ? theme.status.success : theme.status.warning;

  return (
    <View style={styles.stack}>
      <View style={styles.testimonialHeader}>
        <Text style={[styles.sectionLabel, styles.flex]}>Seu depoimento</Text>
        <View style={[styles.badge, { backgroundColor: withAlpha(tone, 0.16) }]}>
          <Text style={[styles.badgeText, { color: tone }]}>
            {testimonial.approved ? 'Aprovado' : 'Aguardando aprovação'}
          </Text>
        </View>
      </View>
      <Text style={styles.quote}>“{testimonial.text}”</Text>
      <Text style={styles.description}>
        {testimonial.approved
          ? `Aparece na página de ${name}.`
          : `Aparece na página de ${name} depois que ${name} aprovar.`}
      </Text>
      {errorText}
      <View style={styles.inlineActions}>
        <Pressable
          accessibilityLabel="Editar o depoimento"
          accessibilityRole="button"
          disabled={isSaving}
          hitSlop={8}
          onPress={() => setDraft(testimonial.text)}
          style={({ pressed }) => [styles.inlineLink, pressed ? styles.pressed : null]}>
          <Ionicons color={theme.accent.primary} name="create-outline" size={16} />
          <Text style={styles.inlineLinkText}>Editar</Text>
        </Pressable>
        <Pressable
          accessibilityLabel="Apagar o depoimento"
          accessibilityRole="button"
          disabled={isSaving}
          hitSlop={8}
          onPress={confirmRemove}
          style={({ pressed }) => [styles.inlineLink, pressed ? styles.pressed : null]}>
          <Ionicons color={theme.text.muted} name="trash-outline" size={16} />
          <Text style={styles.mutedLinkText}>{isSaving ? 'Apagando…' : 'Apagar'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

type JoinByCodeProps = {
  onCancel: () => void;
  onJoined: (link: MyCoach) => void;
};

// "Tenho um código de convite": o código, a prévia de quem convida, as chaves e o aceite.
function JoinByCode({ onCancel, onJoined }: JoinByCodeProps) {
  const styles = useStyles();
  const { session } = useSession();
  const token = session?.token;
  const [code, setCode] = useState('');
  const [preview, setPreview] = useState<CoachingInvitePreview | null>(null);
  const [permissions, setPermissions] = useState<CoachingPermissions>(DEFAULT_PERMISSIONS);
  const [isLooking, setIsLooking] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function lookUp() {
    if (code.length !== 8) {
      setError('O código tem 8 letras e números.');
      return;
    }

    setIsLooking(true);
    setError(null);

    try {
      setPreview(await getCoachingInvite(code));
      setPermissions(DEFAULT_PERMISSIONS);
    } catch (reason) {
      setError(
        reason instanceof ApiError && reason.status === 404
          ? 'Convite não encontrado. Confira o código ou peça um novo ao seu personal.'
          : messageOf(reason, 'Não foi possível abrir o convite.'),
      );
    } finally {
      setIsLooking(false);
    }
  }

  async function join() {
    if (!token || !preview) {
      return;
    }

    setIsJoining(true);
    setError(null);

    try {
      onJoined(await joinCoach(token, preview.code, permissions));
    } catch (reason) {
      // Usado ou vencido entre a prévia e o aceite: a prévia passa a explicar e sugerir outro convite.
      if (reason instanceof ApiError && (reason.code === 'INVITE_USED' || reason.code === 'INVITE_EXPIRED')) {
        setPreview({ ...preview, status: reason.code === 'INVITE_USED' ? 'used' : 'expired' });
      } else {
        setError(messageOf(reason, 'Não foi possível aceitar o convite.'));
      }

      setIsJoining(false);
    }
  }

  if (!preview) {
    return (
      <View style={styles.join}>
        <Input
          autoCapitalize="characters"
          autoComplete="off"
          autoCorrect={false}
          error={error ?? undefined}
          helperText="São 8 letras e números. Vale também colar o link do convite."
          label="Código do convite"
          onChangeText={(text) => {
            setCode(inviteCodeFrom(text));
            setError(null);
          }}
          onSubmitEditing={lookUp}
          placeholder="Ex.: K7M2QX9P"
          returnKeyType="search"
          value={code}
        />
        <Button disabled={code.length !== 8} loading={isLooking} onPress={lookUp} title="Ver convite" />
        <Button onPress={onCancel} title="Cancelar" variant="ghost" />
      </View>
    );
  }

  const coach = preview.coach;
  const name = firstName(coach.name);
  const isMine = coach.id === session?.user.id;
  const canJoin = preview.status === 'valid' && !isMine;
  const statusText = isMine
    ? 'Este convite é seu: mande o link para o seu aluno.'
    : preview.status === 'used'
      ? 'Este convite já foi usado. Cada convite serve uma vez: peça um novo ao seu personal.'
      : preview.status === 'expired'
        ? 'Este convite venceu (eles valem 7 dias). Peça um novo ao seu personal.'
        : null;

  return (
    <View style={styles.join}>
      <View style={styles.preview}>
        <Text style={styles.eyebrow}>Convite de personal</Text>
        <Text style={styles.coachName}>{coach.name}</Text>
        {coach.cref ? <Text style={styles.meta}>{crefLabel(coach.cref)}</Text> : null}
        {coach.city ? <Text style={styles.meta}>{coach.city}</Text> : null}
        {coach.bio ? <Text style={styles.text}>{coach.bio}</Text> : null}
      </View>

      {statusText ? <Text style={styles.text}>{statusText}</Text> : null}

      {canJoin ? (
        <>
          <Text style={styles.sectionLabel}>O que {name} vai ver</Text>
          <PermissionSwitches
            coachName={name}
            disabled={isJoining}
            onChange={(key, value) => setPermissions((current) => ({ ...current, [key]: value }))}
            value={permissions}
          />
          <Text style={styles.description}>Dá para mudar ou desfazer quando quiser, aqui no Perfil.</Text>
        </>
      ) : null}

      {error ? (
        <Text accessibilityLiveRegion="polite" style={styles.errorText}>
          {error}
        </Text>
      ) : null}

      {canJoin ? <Button haptic loading={isJoining} onPress={join} title="Aceitar convite" /> : null}
      <Button
        disabled={isJoining}
        onPress={() => {
          setPreview(null);
          setCode('');
          setError(null);
        }}
        title="Usar outro código"
        variant="ghost"
      />
      {canJoin ? null : <Button onPress={onCancel} title="Fechar" variant="ghost" />}
    </View>
  );
}

const useStyles = makeStyles((theme) => ({
  card: {
    backgroundColor: theme.bg.raised,
    borderColor: theme.border.subtle,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: 14,
    padding: 16,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: theme.accent.soft,
    borderRadius: radius.pill,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: theme.text.primary,
    fontFamily: fonts.extrabold,
    fontSize: 18,
  },
  subtitle: {
    color: theme.text.muted,
    fontFamily: fonts.semibold,
    fontSize: 12,
  },
  stack: {
    gap: 10,
  },
  text: {
    color: theme.text.secondary,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  link: {
    backgroundColor: theme.bg.surface,
    borderColor: theme.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
  coachRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: withAlpha(theme.domain.treino, 0.18),
    borderRadius: radius.pill,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  avatarText: {
    color: theme.domain.treino,
    fontFamily: fonts.extrabold,
    fontSize: 18,
  },
  coachText: {
    flex: 1,
    gap: 2,
  },
  coachName: {
    color: theme.text.primary,
    fontFamily: fonts.extrabold,
    fontSize: 16,
  },
  meta: {
    color: theme.text.muted,
    fontFamily: fonts.medium,
    fontSize: 12,
    lineHeight: 17,
  },
  inlineLink: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 6,
    minHeight: 32,
  },
  inlineLinkText: {
    color: theme.accent.primary,
    fontFamily: fonts.bold,
    fontSize: 13,
  },
  mutedLinkText: {
    color: theme.text.muted,
    fontFamily: fonts.bold,
    fontSize: 13,
  },
  inlineActions: {
    flexDirection: 'row',
    gap: 20,
  },
  divider: {
    backgroundColor: theme.border.subtle,
    height: 1,
  },
  sectionLabel: {
    color: theme.text.primary,
    fontFamily: fonts.extrabold,
    fontSize: 14,
  },
  switchRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  switchLabel: {
    color: theme.text.primary,
    fontFamily: fonts.bold,
    fontSize: 15,
  },
  flex: {
    flex: 1,
    gap: 2,
  },
  description: {
    color: theme.text.secondary,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  testimonialHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontFamily: fonts.bold,
    fontSize: 12,
  },
  quote: {
    color: theme.text.primary,
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 21,
  },
  // No web o fundo dos campos é transparente (WebInputStyleReset): o fundo fica nesta caixa.
  textArea: {
    backgroundColor: theme.bg.raised,
    borderColor: theme.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    minHeight: 110,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  textAreaInput: {
    color: theme.text.primary,
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 15,
    lineHeight: 21,
    minHeight: 90,
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
  join: {
    gap: 12,
  },
  preview: {
    backgroundColor: theme.bg.surface,
    borderColor: theme.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 4,
    padding: 14,
  },
  eyebrow: {
    color: theme.accent.primary,
    fontFamily: fonts.bold,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  successRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
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
