import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useEffect, useState, type ComponentProps } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';

import { Screen } from '@/src/components/ui/Screen';
import { AuroraBackground } from '@/src/components/visual/AuroraBackground';
import { spacing } from '@/src/constants/spacing';
import { useSession } from '@/src/contexts/session-context';
import { getBodyTrend } from '@/src/services/body';
import { getOnboardingProfile } from '@/src/services/onboarding';
import { onQuestionnaireRestored } from '@/src/services/questionnaire-sync';
import { getProfilePhoto, pickProfilePhoto } from '@/src/services/profile-photo';
import { fonts, makeStyles, radius, useTheme, withAlpha, type DomainName } from '@/src/theme';
import type { BodyTrend } from '@/src/types/body';
import type { OnboardingProfile, TrainingDuration } from '@/src/types/onboarding';
import { showAlert } from '@/src/utils/alert';
import { formatDelta } from '@/src/utils/format';
import { currentJourneyLevel, hasJourneyAnswers, journeyLabel } from '@/src/utils/journey';

const durationLabels: Record<TrainingDuration, string> = {
  '30_to_45': '30 a 45 min',
  '45_to_60': '45 a 60 min',
  over_60: '+60 min',
  up_to_30: 'até 30 min',
};

type SummaryItem = { icon: ComponentProps<typeof MaterialCommunityIcons>['name']; label: string; value: string };

// O resumo do topo sai das respostas do onboarding (fase da jornada, rotina e duração).
function profileSummary(profile: OnboardingProfile | null): SummaryItem[] {
  if (!hasJourneyAnswers(profile)) {
    return [];
  }

  const items: SummaryItem[] = [
    { icon: 'chart-line', label: 'Fase', value: journeyLabel(currentJourneyLevel(profile)) },
  ];

  if (profile.trainingDaysPerWeek) {
    items.push({ icon: 'calendar-check-outline', label: 'Rotina', value: `${profile.trainingDaysPerWeek}x semana` });
  }

  if (profile.trainingDuration) {
    items.push({ icon: 'timer-outline', label: 'Treino', value: durationLabels[profile.trainingDuration] });
  }

  return items;
}

// O cartão da Evolução mostra o que já mudou, sem número inventado.
function evolutionKicker(trend: BodyTrend | null) {
  if (!trend) {
    return 'Sua evolução';
  }

  if (trend.deltaKg !== undefined) {
    return `${formatDelta(trend.deltaKg, 'kg')} desde o início`;
  }

  if (trend.measurementCount > 0) {
    return `${trend.measurementCount} ${trend.measurementCount === 1 ? 'medição' : 'medições'}`;
  }

  return 'Comece pela primeira medição';
}

// Rotas que ainda não estão nos tipos gerados do expo-router (novas nesta rodada).
const route = (path: string) => path as unknown as Href;

type ProfileMenuItem = {
  accessibilityLabel: string;
  description: string;
  href?: Href;
  icon: ComponentProps<typeof MaterialCommunityIcons>['name'];
  title: string;
  // Cor de domínio quando o card leva a um domínio; 'neutral' usa o acento do tema.
  tone: DomainName | 'neutral';
};

const menuItems: ProfileMenuItem[] = [
  {
    accessibilityLabel: 'Abrir Treino. Registre suas séries, veja o histórico e o volume por grupo muscular.',
    description: 'Registre série por série, veja o histórico e o que está faltando.',
    href: '/(app)/treino',
    icon: 'dumbbell',
    title: 'Treino',
    tone: 'treino',
  },
  {
    accessibilityLabel:
      'Abrir Evolução. Registre peso, medidas e fotos do mês para acompanhar a evolução do corpo.',
    description: 'Peso, medidas e a foto do mês para ver a evolução acontecer.',
    href: '/(app)/corpo',
    icon: 'chart-timeline-variant',
    title: 'Evolução',
    tone: 'conquista',
  },
  {
    accessibilityLabel: 'Abrir Desafios. Crie um desafio, convide amigos e acompanhe o placar.',
    description: 'Chame amigos para treinar junto: cada dia com treino vale um ponto.',
    href: '/(app)/desafios',
    icon: 'flag-checkered',
    title: 'Desafios',
    tone: 'treino',
  },
  {
    accessibilityLabel:
      'Abrir Liga e temporada. Veja seu XP da semana, sua liga, a temporada entre amigos e os troféus.',
    description: 'XP da semana, sua liga, a temporada entre amigos e os troféus.',
    href: '/(app)/liga',
    icon: 'podium',
    title: 'Liga e temporada',
    tone: 'conquista',
  },
  {
    accessibilityLabel:
      'Abrir Sincronizar dispositivos. Veja o que já está na conta, o que falta subir e baixe de novo num aparelho novo.',
    description: 'Seus aparelhos em dia pela conta: o que subiu, o que falta e como restaurar.',
    href: '/(app)/sincronizar',
    icon: 'watch-variant',
    title: 'Sincronizar dispositivos',
    tone: 'neutral',
  },
  {
    accessibilityLabel: 'Abrir Diário do dia. Registre sono, água e humor em menos de um minuto.',
    description: 'Sono, água e humor do dia, em menos de um minuto.',
    href: route('/(app)/diario'),
    icon: 'notebook-heart-outline',
    title: 'Diário do dia',
    tone: 'sono',
  },
  {
    accessibilityLabel:
      'Abrir Alimentações diárias. Informe os tipos de refeições que costuma fazer no dia.',
    description: 'Cadastre refeições comuns, horários e hábitos do dia a dia.',
    href: '/(app)/alimentacao',
    icon: 'food-apple-outline',
    title: 'Alimentações diárias',
    tone: 'alimentacao',
  },
  {
    accessibilityLabel:
      'Abrir Alimentação ideal para escolher. Veja opções alinhadas ao seu objetivo e preferências.',
    description: 'Escolha ideias de alimentação alinhadas ao seu objetivo atual.',
    href: '/(app)/alimentacao/ideal',
    icon: 'silverware-fork-knife',
    title: 'Alimentação ideal para escolher',
    tone: 'alimentacao',
  },
  {
    accessibilityLabel:
      'Abrir Escolhas de treinos. Ajuste tipos de treino favoritos, disponibilidade e foco principal.',
    description: 'Escolha estilos, foco e disponibilidade para seus treinos.',
    href: '/(app)/treino/preferencias',
    icon: 'dumbbell',
    title: 'Escolhas de treinos',
    tone: 'treino',
  },
  {
    accessibilityLabel:
      'Abrir Recomendações. Receba sugestões personalizadas com base no seu perfil e rotina.',
    description: 'Sugestões para treino, descanso e rotina a partir do seu perfil.',
    href: '/(app)/recomendacoes',
    icon: 'lightbulb-on-outline',
    title: 'Recomendações',
    tone: 'neutral',
  },
  {
    accessibilityLabel:
      'Abrir Conquistas. Veja marcos importantes da sua jornada, como constância e treinos concluídos.',
    description: 'Marcos, badges e sinais de constância na sua jornada.',
    href: '/(app)/conquistas',
    icon: 'trophy-outline',
    title: 'Conquistas',
    tone: 'conquista',
  },
  {
    accessibilityLabel: 'Abrir Frase do dia. Publique ou salve uma frase para marcar seu momento.',
    description: 'Registre uma frase curta para manter sua motivação visível.',
    href: '/(app)/frase',
    icon: 'format-quote-close',
    title: 'Frase do dia',
    tone: 'mente',
  },
  {
    accessibilityLabel: 'Abrir Aparência. Escolha o tema de cores do aplicativo.',
    description: 'Escolha o tema de cores que combina com você.',
    href: '/(app)/appearance',
    icon: 'palette-outline',
    title: 'Aparência',
    tone: 'neutral',
  },
];

// Só aparece para administradores (ADMIN_EMAILS na API).
const adminItem: ProfileMenuItem = {
  accessibilityLabel: 'Abrir Painel. Veja cadastros, ativos e treinos da semana.',
  description: 'Cadastros, ativos e treinos da semana: o gatilho dos 200.',
  href: '/(app)/admin',
  icon: 'view-dashboard-outline',
  title: 'Painel',
  tone: 'neutral',
};

export default function HomeScreen() {
  const styles = useStyles();
  const { theme } = useTheme();
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { session, signOut } = useSession();
  const [profile, setProfile] = useState<OnboardingProfile | null>(null);
  const [bodyTrend, setBodyTrend] = useState<BodyTrend | null>(null);
  const summary = profileSummary(profile);
  const userId = session?.user.id;
  const evolutionStatus = evolutionKicker(bodyTrend);

  useEffect(() => {
    if (userId) {
      void getOnboardingProfile(userId).then(setProfile);
    }
  }, [userId]);

  // Num aparelho novo, as respostas podem chegar da conta depois de a home abrir.
  useEffect(
    () =>
      onQuestionnaireRestored(() => {
        if (userId) {
          void getOnboardingProfile(userId).then(setProfile);
        }
      }),
    [userId],
  );

  // Volta da Evolução com a medida nova já contada, e do Perfil com a capa nova.
  useFocusEffect(
    useCallback(() => {
      getBodyTrend()
        .then(setBodyTrend)
        .catch(() => {});

      if (userId) {
        void getProfilePhoto(userId).then(setCoverUri);
      }
    }, [userId]),
  );

  async function changeCover() {
    if (!userId) {
      return;
    }

    try {
      const uri = await pickProfilePhoto(userId);

      if (uri) {
        setCoverUri(uri);
      }
    } catch {
      showAlert('Foto de capa', 'Não foi possível usar essa imagem. Tente outra.');
    }
  }

  async function handleSignOut() {
    setIsSigningOut(true);
    // Sai da rota protegida antes de limpar a sessão; senão o Stack.Protected
    // redirecionaria para o início e a pessoa veria a splash de novo.
    router.replace('/(auth)/welcome');
    await signOut();
  }

  return (
    <Screen edges={['top', 'right', 'left']} style={styles.screen}>
      <View style={styles.profileCover}>
        {coverUri ? (
          <>
            <Image
              accessibilityIgnoresInvertColors
              resizeMode="cover"
              source={{ uri: coverUri }}
              style={styles.profileCoverImage}
            />
            <View style={styles.profileCoverOverlay} />
          </>
        ) : (
          // Sem foto: a capa é a luz aurora do tema.
          <AuroraBackground intensity="hero" />
        )}
        <View style={styles.coverActions}>
          <Pressable
            accessibilityLabel="Abrir Treino"
            accessibilityRole="button"
            onPress={() => router.push('/(app)/treino')}
            style={({ pressed }) => [styles.coverActionBadge, pressed ? styles.pressed : null]}>
            <MaterialCommunityIcons color={theme.accent.primary} name="dumbbell" size={25} />
          </Pressable>
          <Pressable
            accessibilityLabel="Abrir Perfil. Altere foto de capa, nome e senha, ou apague sua conta."
            accessibilityRole="button"
            onPress={() => router.push('/(app)/perfil')}
            style={({ pressed }) => [styles.coverActionBadge, pressed ? styles.pressed : null]}>
            <MaterialCommunityIcons color={theme.accent.primary} name="account-edit-outline" size={25} />
          </Pressable>
          <Pressable
            accessibilityLabel="Trocar a foto de capa"
            accessibilityRole="button"
            onPress={changeCover}
            style={({ pressed }) => [styles.coverActionBadge, pressed ? styles.pressed : null]}>
            <MaterialCommunityIcons color={theme.accent.primary} name="camera-outline" size={25} />
          </Pressable>
        </View>
        <View style={styles.profileHeader}>
          <Text numberOfLines={1} style={styles.name}>
            {session?.user.name}
          </Text>
          <Text style={styles.subtitle}>Acompanhe suas escolhas, rotina e evolução.</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={styles.scrollArea}>
        {/* Só com as respostas do onboarding: sem elas, nada de valor inventado. */}
        {summary.length ? (
          <View
            accessibilityLabel={`Resumo do perfil: ${summary.map((item) => `${item.label} ${item.value}`).join(', ')}.`}
            accessible
            style={styles.quickSummary}>
            {summary.map((item) => (
              <SummaryPill icon={item.icon} key={item.label} label={item.label} value={item.value} />
            ))}
          </View>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Menu do perfil</Text>
          <Text style={styles.sectionDescription}>Escolha uma área para ajustar sua experiência.</Text>
        </View>

        <View style={styles.menuGrid}>
          {(session?.user.role === 'admin' ? [adminItem, ...menuItems] : menuItems).map((item) => (
            <ProfileMenuCard item={item} key={item.title} />
          ))}
        </View>

        <Pressable
          accessibilityLabel={`Abrir Evolução corporal: ${evolutionStatus}. Peso, medidas e fotos ao longo do tempo.`}
          accessibilityRole="button"
          onPress={() => router.push('/(app)/corpo')}
          style={({ pressed }) => [styles.evolutionCard, pressed ? styles.pressed : null]}>
          <View style={styles.evolutionIcon}>
            <MaterialCommunityIcons color={theme.accent.primary} name="human-male-height-variant" size={34} />
          </View>
          <View style={styles.evolutionTextGroup}>
            <Text numberOfLines={1} style={styles.evolutionKicker}>
              {evolutionStatus}
            </Text>
            <Text style={styles.evolutionTitle}>Evolução corporal</Text>
            <Text style={styles.evolutionDescription}>
              Peso, medidas, fotos e progresso em uma linha do tempo visual.
            </Text>
          </View>
          <MaterialCommunityIcons color={theme.text.secondary} name="chevron-right" size={26} />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          disabled={isSigningOut}
          onPress={handleSignOut}
          style={({ pressed }) => [styles.signOut, pressed || isSigningOut ? styles.pressed : null]}>
          <MaterialCommunityIcons color={theme.text.secondary} name="logout" size={20} />
          <Text style={styles.signOutText}>{isSigningOut ? 'Saindo...' : 'Sair da conta'}</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

function SummaryPill({
  icon,
  label,
  value,
}: {
  icon: ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
  value: string;
}) {
  const styles = useStyles();
  const { theme } = useTheme();

  return (
    <View style={styles.summaryPill}>
      <MaterialCommunityIcons color={theme.accent.primary} name={icon} size={20} />
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

function ProfileMenuCard({ item }: { item: ProfileMenuItem }) {
  const styles = useStyles();
  const { theme } = useTheme();
  const toneColor = item.tone === 'neutral' ? theme.accent.primary : theme.domain[item.tone];

  return (
    <Pressable
      accessibilityLabel={item.accessibilityLabel}
      accessibilityRole="button"
      onPress={item.href ? () => router.push(item.href as Href) : undefined}
      style={({ pressed }) => [styles.menuCard, pressed ? styles.pressed : null]}>
      <View style={[styles.menuImage, { backgroundColor: withAlpha(toneColor, 0.16) }]}>
        <MaterialCommunityIcons color={toneColor} name={item.icon} size={32} />
      </View>
      <View style={styles.menuCardText}>
        <Text style={styles.menuCardTitle}>{item.title}</Text>
        <Text style={styles.menuCardDescription}>{item.description}</Text>
      </View>
      <MaterialCommunityIcons color={theme.text.muted} name="arrow-right" size={20} />
    </Pressable>
  );
}

const useStyles = makeStyles((theme) => ({
  screen: {
    paddingHorizontal: 0,
  },
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  scrollArea: {
    flex: 1,
  },
  profileCover: {
    backgroundColor: theme.bg.surface,
    height: 274,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    width: '100%',
  },
  profileCoverImage: {
    height: '100%',
    opacity: 0.9,
    position: 'absolute',
    width: '100%',
  },
  profileCoverOverlay: {
    backgroundColor: withAlpha(theme.bg.base, 0.35),
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  coverActions: {
    gap: spacing.sm,
    position: 'absolute',
    right: spacing.md,
    top: spacing.md,
  },
  coverActionBadge: {
    alignItems: 'center',
    backgroundColor: withAlpha(theme.bg.base, 0.6),
    borderColor: withAlpha(theme.accent.primary, 0.6),
    borderRadius: radius.sm,
    borderWidth: 1,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  profileHeader: {
    alignItems: 'center',
    alignSelf: 'center',
    gap: spacing.sm,
    maxWidth: 420,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.md,
    width: '100%',
  },
  name: {
    color: theme.text.primary,
    fontFamily: fonts.extrabold,
    fontSize: 24,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  subtitle: {
    color: theme.text.secondary,
    fontFamily: fonts.medium,
    fontSize: 15,
    lineHeight: 21,
    maxWidth: 300,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  quickSummary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  summaryPill: {
    alignItems: 'center',
    backgroundColor: theme.bg.surface,
    borderColor: theme.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    flexGrow: 1,
    gap: 4,
    minHeight: 92,
    minWidth: 104,
    padding: spacing.sm,
  },
  summaryLabel: {
    color: theme.text.secondary,
    fontFamily: fonts.semibold,
    fontSize: 12,
    textAlign: 'center',
  },
  summaryValue: {
    color: theme.text.primary,
    fontFamily: fonts.extrabold,
    fontSize: 14,
    textAlign: 'center',
  },
  evolutionCard: {
    alignItems: 'center',
    backgroundColor: theme.accent.soft,
    borderColor: theme.accent.primary,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  evolutionIcon: {
    alignItems: 'center',
    backgroundColor: theme.bg.base,
    borderRadius: radius.sm,
    height: 58,
    justifyContent: 'center',
    width: 58,
  },
  evolutionTextGroup: {
    flex: 1,
    gap: 3,
  },
  evolutionKicker: {
    color: theme.accent.primary,
    fontFamily: fonts.bold,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  evolutionTitle: {
    color: theme.text.primary,
    fontFamily: fonts.extrabold,
    fontSize: 18,
  },
  evolutionDescription: {
    color: theme.text.secondary,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  sectionHeader: {
    alignItems: 'center',
    gap: 4,
  },
  sectionTitle: {
    color: theme.text.primary,
    fontFamily: fonts.extrabold,
    fontSize: 20,
    textAlign: 'center',
  },
  sectionDescription: {
    color: theme.text.secondary,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  menuGrid: {
    gap: spacing.sm,
  },
  menuCard: {
    alignItems: 'center',
    backgroundColor: theme.bg.surface,
    borderColor: theme.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 104,
    padding: spacing.md,
  },
  menuImage: {
    alignItems: 'center',
    borderRadius: radius.md,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  menuCardText: {
    flex: 1,
    gap: 4,
  },
  menuCardTitle: {
    color: theme.text.primary,
    fontFamily: fonts.extrabold,
    fontSize: 16,
  },
  menuCardDescription: {
    color: theme.text.secondary,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  signOut: {
    alignItems: 'center',
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: spacing.lg,
  },
  signOutText: {
    color: theme.text.secondary,
    fontFamily: fonts.semibold,
    fontSize: 15,
  },
  pressed: {
    opacity: 0.72,
  },
}));
