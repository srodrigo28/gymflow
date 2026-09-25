import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Platform, Pressable, Text, TextInput, View } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { useSession } from '@/src/contexts/session-context';
import { ApiError } from '@/src/services/api';
import {
  coachingInviteMessage,
  createCoachingInvite,
  deleteProfessional,
  getProfessional,
  saveProfessional,
} from '@/src/services/coaching';
import { fonts, makeStyles, radius, typography, useTheme } from '@/src/theme';
import type { CoachingInvite, ProfessionalProfile } from '@/src/types/coaching';
import { formatShortDate } from '@/src/utils/format';
import { shareText } from '@/src/utils/share-text';

// Fase 5 (22-estrategia.md, seção 2.4): o lado do personal no Perfil. Sem o perfil, explica o que é e
// liga com um toque; com ele, reúne o painel de alunos, o convite, a página pública e os dados dela.

// Os limites são os da API: o campo para no máximo, em vez de a pessoa descobrir só ao salvar.
const BIO_MAX = 600;
const CITY_MAX = 80;
const CREF_MAX = 30;
const SLUG_MAX = 40;
const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/;
const SLUG_MESSAGE = 'Use de 3 a 40 letras minúsculas, números e hífens, sem hífen no começo ou no fim.';

const LEAVE_TITLE = 'Deixar de ser personal?';
const LEAVE_MESSAGE =
  'Os convites, os vínculos com os seus alunos e as prescrições que você fez saem juntos, e a sua página pública sai do ar. Os treinos dos alunos continuam com eles. Não dá para desfazer.';

// Rota nova, que ainda não está nos tipos gerados do expo-router.
const studentsHref = '/(app)/alunos' as unknown as Href;

type Draft = { bio: string; city: string; cref: string; slug: string };

// As mensagens da API já vêm prontas para a tela; qualquer outro erro vira uma frase nossa.
function messageOf(reason: unknown, fallback: string) {
  return reason instanceof ApiError ? reason.message : fallback;
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

function draftOf(profile: ProfessionalProfile): Draft {
  return { bio: profile.bio ?? '', city: profile.city ?? '', cref: profile.cref ?? '', slug: profile.slug };
}

// Enquanto a pessoa digita: sem acento, em minúsculas, com hífen no lugar do espaço. O resto do formato
// (tamanho, hífen nas pontas) é conferido ao salvar.
function slugText(text: string) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, SLUG_MAX);
}

// "https://…/p/" a partir do endereço atual: a prévia mostra o link novo enquanto a pessoa digita.
function pageBase(profile: ProfessionalProfile) {
  return profile.pageUrl.endsWith(profile.slug)
    ? profile.pageUrl.slice(0, profile.pageUrl.length - profile.slug.length)
    : profile.pageUrl.replace(/[^/]*$/, '');
}

/** O cartão do personal no Perfil. Pega a sessão sozinho: basta `<ProfessionalCard />`. */
export function ProfessionalCard() {
  const styles = useStyles();
  const { theme } = useTheme();
  const { session } = useSession();
  const token = session?.token;
  // undefined enquanto carrega; null quando a conta não tem o perfil de personal.
  const [profile, setProfile] = useState<ProfessionalProfile | null | undefined>(undefined);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Uma vez por conta: recarregar ao voltar ao Perfil apagaria o que a pessoa ainda não salvou.
  const load = useCallback(async () => {
    if (!token) {
      return;
    }

    setLoadError(null);

    try {
      setProfile(await getProfessional(token));
    } catch (reason) {
      setLoadError(messageOf(reason, 'Não foi possível carregar o perfil de personal.'));
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!token) {
    return null;
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons color={theme.accent.primary} name="whistle-outline" size={22} />
        </View>
        <View style={styles.flex}>
          {/* Enquanto carrega, o título neutro: quem já é personal não vê a pergunta piscar. */}
          <Text accessibilityRole="header" style={styles.cardTitle}>
            {profile === null ? 'Você é personal?' : 'Perfil de personal'}
          </Text>
          {profile ? (
            <Text style={styles.status}>Ligado desde {formatShortDate(Date.parse(profile.createdAt))}</Text>
          ) : null}
        </View>
      </View>

      {profile === undefined && !loadError ? (
        <ActivityIndicator accessibilityLabel="Carregando o perfil de personal" color={theme.accent.primary} />
      ) : null}

      {loadError ? (
        <>
          <Text accessibilityLiveRegion="polite" style={styles.error}>
            {loadError}
          </Text>
          <Button icon="refresh" onPress={() => void load()} title="Tentar de novo" variant="outline" />
        </>
      ) : null}

      {notice ? (
        <Text accessibilityLiveRegion="polite" style={styles.notice}>
          {notice}
        </Text>
      ) : null}

      {profile === null ? (
        <TurnOn
          onTurnedOn={(next) => {
            setProfile(next);
            setNotice('Pronto: a sua página já está no ar. Agora é mandar o convite para o primeiro aluno.');
          }}
          token={token}
        />
      ) : null}

      {profile ? (
        <>
          <StudentsLink />
          <StudentInvite />

          <View style={styles.divider} />
          <PublicPage profile={profile} />

          <View style={styles.divider} />
          <ProfileForm
            onSaved={(next) => {
              setProfile(next);
              setNotice(null);
            }}
            profile={profile}
            token={token}
          />

          <View style={styles.divider} />
          <LeaveProfessional
            onLeft={() => {
              setProfile(null);
              setNotice('Você deixou de ser personal. Dá para ligar de novo quando quiser.');
            }}
            token={token}
          />
        </>
      ) : null}
    </View>
  );
}

function TurnOn({ onTurnedOn, token }: { onTurnedOn: (profile: ProfessionalProfile) => void; token: string }) {
  const styles = useStyles();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function turnOn() {
    setIsSaving(true);
    setError(null);

    try {
      // Sem endereço escolhido, a API monta o da página a partir do nome.
      onTurnedOn(await saveProfessional(token, {}));
    } catch (reason) {
      setError(messageOf(reason, 'Não foi possível ligar o perfil de personal.'));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <Text style={styles.cardText}>
        Ligue o perfil de personal para convidar alunos por link, acompanhar o que cada um escolhe compartilhar com
        você, prescrever treinos que chegam no celular deles e ganhar uma página pública com os depoimentos que você
        aprovar.
      </Text>
      <Text style={styles.caption}>
        O aluno decide o que você vê (treinos, medidas e fotos) e pode mudar quando quiser. A sua conta de treino
        continua igual, e dá para desligar o perfil depois.
      </Text>
      <Button icon="briefcase-outline" loading={isSaving} onPress={() => void turnOn()} title="Sou personal" />
      {error ? (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </>
  );
}

function StudentsLink() {
  const styles = useStyles();
  const { theme } = useTheme();

  return (
    <Pressable
      accessibilityHint="Abre o painel dos seus alunos"
      accessibilityLabel="Meus alunos"
      accessibilityRole="button"
      onPress={() => router.push(studentsHref)}
      style={({ pressed }) => [styles.linkRow, pressed ? styles.pressed : null]}>
      <View style={styles.linkIcon}>
        <Ionicons color={theme.accent.primary} name="people-outline" size={22} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.linkTitle}>Meus alunos</Text>
        <Text style={styles.linkDescription}>A semana de cada um, as prescrições e os depoimentos.</Text>
      </View>
      <Ionicons color={theme.text.muted} name="chevron-forward" size={20} />
    </Pressable>
  );
}

/**
 * Gera um convite (8 letras, vale 7 dias e serve para um aluno) e abre o compartilhamento na hora. O
 * código e o link ficam à vista para quem prefere copiar. Também é usado na tela de alunos.
 */
export function StudentInvite() {
  const styles = useStyles();
  const { session } = useSession();
  const [invite, setInvite] = useState<CoachingInvite | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const token = session?.token;
  const coachName = session?.user.name ?? '';

  function share(current: CoachingInvite) {
    void shareText(coachingInviteMessage(coachName, current)).catch(() => undefined);
  }

  async function create() {
    if (!token) {
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const next = await createCoachingInvite(token);
      setInvite(next);
      share(next);
    } catch (reason) {
      setError(messageOf(reason, 'Não foi possível criar o convite.'));
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <View style={styles.section}>
      <Button
        icon="person-add-outline"
        loading={isCreating}
        onPress={() => void create()}
        title={invite ? 'Convidar outro aluno' : 'Convidar aluno'}
      />

      {invite ? (
        <View accessibilityLiveRegion="polite" style={styles.inviteBox}>
          <Text style={styles.overline}>Código do convite</Text>
          <Text accessibilityLabel={`Código ${invite.code.split('').join(' ')}`} selectable style={styles.inviteCode}>
            {invite.code}
          </Text>
          <Text style={styles.caption}>
            Vale até {formatShortDate(Date.parse(invite.expiresAt))} e serve para um aluno. Para outro aluno, gere
            outro convite.
          </Text>
          <Text selectable style={styles.inviteUrl}>
            {invite.url}
          </Text>
          <Button icon="share-social-outline" onPress={() => share(invite)} title="Compartilhar de novo" variant="ghost" />
        </View>
      ) : (
        <Text style={styles.caption}>
          O aluno abre o link, aceita e escolhe o que compartilha com você. Cada convite vale 7 dias.
        </Text>
      )}

      {error ? (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

function PublicPage({ profile }: { profile: ProfessionalProfile }) {
  const styles = useStyles();

  function share() {
    void shareText(`Conheça o meu trabalho como personal no Gyn Flow: ${profile.pageUrl}`).catch(
      () => undefined,
    );
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Sua página pública</Text>
      <Pressable
        accessibilityHint="Abre a página no navegador"
        accessibilityLabel={`Abrir a sua página: ${profile.pageUrl}`}
        accessibilityRole="link"
        hitSlop={6}
        onPress={() => void Linking.openURL(profile.pageUrl).catch(() => undefined)}
        style={({ pressed }) => (pressed ? styles.pressed : null)}>
        <Text style={styles.link}>{profile.pageUrl}</Text>
      </Pressable>
      <Text style={styles.caption}>
        Mostra a sua apresentação, a cidade, o CREF como “informado pelo profissional”, quantos alunos você acompanha,
        os alunos que aceitaram aparecer e os depoimentos que você aprovou.
      </Text>
      <Button icon="share-social-outline" onPress={share} title="Compartilhar a página" variant="outline" />
    </View>
  );
}

type ProfileFormProps = {
  onSaved: (profile: ProfessionalProfile) => void;
  profile: ProfessionalProfile;
  token: string;
};

function ProfileForm({ onSaved, profile, token }: ProfileFormProps) {
  const styles = useStyles();
  const { theme } = useTheme();
  const [draft, setDraft] = useState<Draft>(() => draftOf(profile));
  const [slugError, setSlugError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const saved = draftOf(profile);
  const isDirty =
    draft.bio.trim() !== saved.bio ||
    draft.city.trim() !== saved.city ||
    draft.cref.trim() !== saved.cref ||
    draft.slug !== saved.slug;

  function change(field: keyof Draft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
    setIsSaved(false);
    setError(null);

    if (field === 'slug') {
      setSlugError(null);
    }
  }

  async function save() {
    // O hífen que sobrou de um espaço no começo ou no fim sai sozinho, em vez de virar erro.
    const slug = draft.slug.replace(/^-+|-+$/g, '');
    const slugChanged = slug !== profile.slug;

    // Só o endereço novo passa pela regra: o que a API gerou de um nome curto ("li") pode ser menor que 3
    // letras, e não pode travar quem só quer salvar a cidade.
    if (slugChanged && !SLUG_PATTERN.test(slug)) {
      setSlugError(SLUG_MESSAGE);
      return;
    }

    setIsSaving(true);
    setError(null);
    setSlugError(null);

    try {
      // Campo vazio vira null: a página deixa de mostrar aquela linha. O endereço só vai quando mudou.
      const next = await saveProfessional(token, {
        bio: draft.bio.trim() || null,
        city: draft.city.trim() || null,
        cref: draft.cref.trim() || null,
        ...(slugChanged ? { slug } : {}),
      });
      onSaved(next);
      setDraft(draftOf(next));
      setIsSaved(true);
    } catch (reason) {
      if (reason instanceof ApiError && reason.code === 'SLUG_TAKEN') {
        setSlugError(reason.message);
      } else {
        setError(messageOf(reason, 'Não foi possível salvar os dados da página.'));
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Dados da página</Text>
      <Input
        autoCapitalize="characters"
        autoCorrect={false}
        helperText="Informado por você; o Gyn Flow não verifica. Na página aparece como “informado pelo profissional”."
        label="CREF"
        maxLength={CREF_MAX}
        onChangeText={(text) => change('cref', text)}
        placeholder="Ex.: 012345-G/GO"
        value={draft.cref}
      />
      <Input
        autoCapitalize="words"
        label="Cidade"
        maxLength={CITY_MAX}
        onChangeText={(text) => change('city', text)}
        placeholder="Ex.: Goiânia"
        textContentType="addressCity"
        value={draft.city}
      />
      <TextArea
        label="Apresentação"
        maxLength={BIO_MAX}
        onChangeText={(text) => change('bio', text)}
        placeholder="Como você trabalha e para quem é o seu acompanhamento."
        value={draft.bio}
      />
      <Input
        autoCapitalize="none"
        autoCorrect={false}
        error={slugError ?? undefined}
        helperText={`Sua página: ${pageBase(profile)}${draft.slug || '…'}`}
        label="Endereço da página"
        maxLength={SLUG_MAX}
        onChangeText={(text) => change('slug', slugText(text))}
        placeholder="seu-nome"
        value={draft.slug}
      />
      <Button disabled={!isDirty} loading={isSaving} onPress={() => void save()} title="Salvar" variant="outline" />
      {isSaved ? (
        <View accessibilityLiveRegion="polite" style={styles.savedRow}>
          <Ionicons color={theme.status.success} name="checkmark-circle" size={18} />
          <Text style={styles.savedText}>Página atualizada.</Text>
        </View>
      ) : null}
      {error ? (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

function LeaveProfessional({ onLeft, token }: { onLeft: () => void; token: string }) {
  const styles = useStyles();
  const [isLeaving, setIsLeaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function leave() {
    setIsLeaving(true);
    setError(null);

    try {
      await deleteProfessional(token);
      onLeft();
    } catch (reason) {
      setError(messageOf(reason, 'Não foi possível desligar o perfil de personal.'));
      setIsLeaving(false);
    }
  }

  return (
    <>
      <Button
        icon="log-out-outline"
        loading={isLeaving}
        onPress={() =>
          askToConfirm(LEAVE_TITLE, LEAVE_MESSAGE, 'Deixar de ser personal', () => void leave(), 'Continuar personal')
        }
        title="Deixar de ser personal"
        variant="ghost"
      />
      {error ? (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </>
  );
}

type TextAreaProps = {
  label: string;
  maxLength: number;
  onChangeText: (text: string) => void;
  placeholder: string;
  value: string;
};

// Texto de várias linhas: o Input tem altura fixa de uma linha, curta demais para uma apresentação.
function TextArea({ label, maxLength, onChangeText, placeholder, value }: TextAreaProps) {
  const styles = useStyles();
  const { theme } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        cursorColor={theme.accent.primary}
        maxLength={maxLength}
        multiline
        onBlur={() => setIsFocused(false)}
        onChangeText={onChangeText}
        onFocus={() => setIsFocused(true)}
        placeholder={placeholder}
        placeholderTextColor={theme.text.muted}
        selectionColor={theme.accent.primary}
        style={[styles.textArea, isFocused ? styles.textAreaFocused : null]}
        textAlignVertical="top"
        value={value}
      />
      <Text
        accessibilityLabel={`${value.length} de ${maxLength} caracteres`}
        style={[styles.counter, value.length >= maxLength ? styles.counterFull : null]}>
        {value.length}/{maxLength}
      </Text>
    </View>
  );
}

// O mesmo molde dos cartões do Perfil, para o cartão parecer de lá.
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
  flex: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    color: theme.text.primary,
    fontFamily: fonts.extrabold,
    fontSize: 18,
  },
  status: {
    color: theme.text.muted,
    fontFamily: fonts.semibold,
    fontSize: 12,
  },
  cardText: {
    color: theme.text.secondary,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  caption: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    color: theme.text.primary,
    fontFamily: fonts.extrabold,
    fontSize: 16,
  },
  divider: {
    backgroundColor: theme.border.subtle,
    height: 1,
  },
  linkRow: {
    alignItems: 'center',
    backgroundColor: theme.bg.surface,
    borderColor: theme.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 64,
    padding: 12,
  },
  linkIcon: {
    alignItems: 'center',
    backgroundColor: theme.accent.soft,
    borderRadius: radius.sm,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  linkTitle: {
    color: theme.text.primary,
    fontFamily: fonts.extrabold,
    fontSize: 15,
  },
  linkDescription: {
    color: theme.text.secondary,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  link: {
    color: theme.accent.primary,
    fontFamily: fonts.semibold,
    fontSize: 14,
    lineHeight: 20,
    textDecorationLine: 'underline',
  },
  inviteBox: {
    backgroundColor: theme.bg.surface,
    borderColor: theme.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 6,
    padding: 14,
  },
  overline: {
    ...typography.overline,
    color: theme.text.muted,
  },
  inviteCode: {
    color: theme.text.primary,
    fontFamily: fonts.extrabold,
    fontSize: 26,
    fontVariant: ['tabular-nums'],
    letterSpacing: 3,
  },
  inviteUrl: {
    color: theme.text.secondary,
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 18,
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    ...typography.caption,
    color: theme.text.primary,
  },
  textArea: {
    backgroundColor: theme.bg.surface,
    borderColor: theme.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    color: theme.text.primary,
    fontFamily: fonts.medium,
    fontSize: 16,
    lineHeight: 22,
    minHeight: 120,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  textAreaFocused: {
    borderColor: theme.border.focus,
  },
  counter: {
    alignSelf: 'flex-end',
    color: theme.text.muted,
    fontFamily: fonts.medium,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  counterFull: {
    color: theme.status.warning,
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
  notice: {
    backgroundColor: theme.accent.soft,
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
    fontSize: 13,
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.75,
  },
}));
