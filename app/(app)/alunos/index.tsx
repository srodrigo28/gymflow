import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';

import { StudentInvite } from '@/src/components/coaching/ProfessionalCard';
import { sharingText, statsSpoken, StudentStats } from '@/src/components/coaching/StudentStats';
import { Button } from '@/src/components/ui/Button';
import { Screen } from '@/src/components/ui/Screen';
import { useSession } from '@/src/contexts/session-context';
import { ApiError } from '@/src/services/api';
import { approveTestimonial, listStudents } from '@/src/services/coaching';
import { fonts, makeStyles, radius, typography, useTheme } from '@/src/theme';
import type { StudentSummary } from '@/src/types/coaching';

// Rotas novas, que ainda não estão nos tipos gerados do expo-router.
const route = (path: string) => path as unknown as Href;

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

// As mensagens da API já vêm prontas para a tela; qualquer outro erro vira uma frase nossa.
function messageOf(reason: unknown, fallback: string) {
  return reason instanceof ApiError ? reason.message : fallback;
}

// Em ordem alfabética: é assim que o personal procura alguém numa lista que só cresce.
function byName(list: StudentSummary[]) {
  return [...list].sort((a, b) => a.student.name.localeCompare(b.student.name, 'pt-BR'));
}

// "3 alunos · 1 está há 7 dias ou mais sem treinar · 1 depoimento para aprovar". Quem ainda não tem
// treino na conta conta à parte: não parou, só não começou.
function summaryText(students: StudentSummary[]) {
  const away = students.filter((student) => student.missing && student.inactiveDays !== null).length;
  const notStarted = students.filter((student) => student.missing && student.inactiveDays === null).length;
  const pending = students.filter((student) => student.testimonial && !student.testimonial.approved).length;

  return [
    plural(students.length, 'aluno', 'alunos'),
    away ? `${away} ${away === 1 ? 'está' : 'estão'} há 7 dias ou mais sem treinar` : null,
    notStarted ? `${notStarted} ainda sem treino na conta` : null,
    pending ? plural(pending, 'depoimento para aprovar', 'depoimentos para aprovar') : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

// "Ana Paula Souza" → "AS": a primeira letra do primeiro e do último nome.
function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.charAt(0) ?? '';
  const last = words.length > 1 ? (words[words.length - 1]?.charAt(0) ?? '') : '';

  return `${first}${last}`.toUpperCase() || '?';
}

export default function AlunosScreen() {
  const styles = useStyles();
  const { theme } = useTheme();
  const { session } = useSession();
  const token = session?.token;
  const [students, setStudents] = useState<StudentSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  // A conta não tem o perfil de personal ligado (quem chegou aqui por um link antigo, por exemplo).
  const [needsProfile, setNeedsProfile] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  // O vínculo com uma aprovação em andamento: trava só aquele botão.
  const [busyLinkId, setBusyLinkId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      return;
    }

    try {
      setStudents(byName(await listStudents(token)));
      setError(null);
      setNeedsProfile(false);
    } catch (reason) {
      setError(messageOf(reason, 'Não foi possível carregar os seus alunos.'));
      setNeedsProfile(reason instanceof ApiError && reason.code === 'PROFESSIONAL_REQUIRED');
    }
  }, [token]);

  // Na volta do detalhe, a lista já mostra a prescrição nova ou o vínculo desfeito.
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

  async function approve(student: StudentSummary) {
    if (!token) {
      return;
    }

    setBusyLinkId(student.linkId);
    setActionError(null);

    const text = student.testimonial?.text;

    if (!text) {
      setBusyLinkId(null);
      return;
    }

    try {
      await approveTestimonial(token, student.linkId, text);
      await load();
    } catch (reason) {
      setActionError(messageOf(reason, 'Não foi possível aprovar o depoimento.'));
      // O aluno pode ter trocado o texto: a lista volta com o depoimento de agora.
      void load();
    } finally {
      setBusyLinkId(null);
    }
  }

  const isEmpty = students !== null && students.length === 0;

  const inviteCard = (
    <View style={styles.card}>
      <Text accessibilityRole="header" style={styles.cardTitle}>
        {isEmpty ? 'Comece pelo convite' : 'Convidar aluno'}
      </Text>
      {isEmpty ? (
        <Text style={styles.secondary}>
          Você ainda não tem alunos por aqui. Mande o convite pelo WhatsApp ou por onde preferir: é por ele que o
          aluno entra no seu painel.
        </Text>
      ) : null}
      <StudentInvite />
    </View>
  );

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
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(app)/perfil'))}
            style={({ pressed }) => [styles.iconButton, pressed ? styles.pressed : null]}>
            <Ionicons color={theme.text.primary} name="arrow-back" size={20} />
          </Pressable>
          <Text accessibilityRole="header" style={styles.title}>
            Meus alunos
          </Text>
        </View>

        <Text style={styles.intro}>
          Cada aluno escolhe o que compartilha com você (treinos, medidas e fotos) e pode mudar quando quiser. Medidas
          e fotos só chegam se ele também as guarda na conta.
        </Text>

        {error ? (
          <Text accessibilityLiveRegion="polite" style={styles.error}>
            {error}
          </Text>
        ) : null}

        {needsProfile ? (
          <Button icon="person-outline" onPress={() => router.replace('/(app)/perfil')} title="Ir para o Perfil" />
        ) : null}

        {students === null && !error ? (
          <ActivityIndicator
            accessibilityLabel="Carregando os seus alunos"
            color={theme.accent.primary}
            style={styles.loading}
          />
        ) : null}

        {students === null && error && !needsProfile ? (
          <Button icon="refresh" loading={isRefreshing} onPress={refresh} title="Tentar de novo" variant="outline" />
        ) : null}

        {isEmpty ? inviteCard : null}

        {students && students.length > 0 ? (
          <>
            <Text accessibilityLiveRegion="polite" style={styles.summary}>
              {summaryText(students)}
            </Text>
            {actionError ? (
              <Text accessibilityLiveRegion="polite" style={styles.error}>
                {actionError}
              </Text>
            ) : null}
            {students.map((student) => (
              <StudentCard
                busy={busyLinkId === student.linkId}
                key={student.linkId}
                onApprove={() => void approve(student)}
                student={student}
              />
            ))}
            {inviteCard}
          </>
        ) : null}

        {students !== null ? (
          <Pressable
            accessibilityHint="Abre o ranking de personais"
            accessibilityLabel="Ranking de personais. Pela aderência e pela evolução média dos alunos, nunca por peso."
            accessibilityRole="button"
            onPress={() => router.push(route('/(app)/alunos/ranking'))}
            style={({ pressed }) => [styles.link, pressed ? styles.pressed : null]}>
            <View style={styles.linkIcon}>
              <MaterialCommunityIcons color={theme.domain.conquista} name="podium" size={24} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.linkTitle}>Ranking de personais</Text>
              <Text style={styles.linkDescription}>
                Pela aderência e pela evolução média dos alunos, nunca por peso.
              </Text>
            </View>
            <MaterialCommunityIcons color={theme.text.muted} name="chevron-right" size={22} />
          </Pressable>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

type StudentCardProps = {
  busy: boolean;
  onApprove: () => void;
  student: StudentSummary;
};

function StudentCard({ busy, onApprove, student }: StudentCardProps) {
  const styles = useStyles();
  const { theme } = useTheme();
  const { name } = student.student;
  const pending = student.testimonial && !student.testimonial.approved ? student.testimonial : null;
  const planText = student.activePlan ? `Prescrição ativa: ${student.activePlan.name}` : 'Sem prescrição ativa';

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityHint="Abre o que o aluno compartilha com você e as prescrições dele"
        accessibilityLabel={`${name}. ${sharingText(student.permissions)}. ${statsSpoken(student)} ${planText}.`}
        accessibilityRole="button"
        onPress={() => router.push(route(`/(app)/alunos/${encodeURIComponent(student.student.id)}`))}
        style={({ pressed }) => [styles.studentMain, pressed ? styles.pressed : null]}>
        <View style={styles.studentTop}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(name)}</Text>
          </View>
          <View style={styles.flex}>
            <Text numberOfLines={1} style={styles.name}>
              {name}
            </Text>
            <Text numberOfLines={1} style={styles.caption}>
              {sharingText(student.permissions)}
            </Text>
          </View>
          <Ionicons color={theme.text.muted} name="chevron-forward" size={20} />
        </View>

        {/* O rótulo do toque já lê os números: escondido aqui, o bloco não é lido duas vezes. */}
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <StudentStats student={student} />
        </View>

        <View style={styles.planRow}>
          <MaterialCommunityIcons
            color={student.activePlan ? theme.accent.primary : theme.text.muted}
            name="clipboard-text-outline"
            size={16}
          />
          <Text numberOfLines={1} style={[styles.planText, student.activePlan ? null : styles.planTextMuted]}>
            {planText}
          </Text>
        </View>
      </Pressable>

      {pending ? (
        <View style={styles.testimonial}>
          <Text style={styles.overline}>Depoimento para aprovar</Text>
          <Text style={styles.testimonialText}>“{pending.text}”</Text>
          <Text style={styles.caption}>Aprovado, ele aparece na sua página pública com o primeiro nome do aluno.</Text>
          <Pressable
            accessibilityLabel={`Aprovar o depoimento de ${name}`}
            accessibilityRole="button"
            accessibilityState={{ busy, disabled: busy }}
            disabled={busy}
            hitSlop={6}
            onPress={onApprove}
            style={({ pressed }) => [styles.smallButton, pressed || busy ? styles.pressed : null]}>
            {busy ? (
              <ActivityIndicator color={theme.accent.onPrimary} size="small" />
            ) : (
              <Text style={styles.smallButtonText}>Aprovar</Text>
            )}
          </Pressable>
        </View>
      ) : null}
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
  summary: {
    color: theme.text.primary,
    fontFamily: fonts.semibold,
    fontSize: 14,
    lineHeight: 20,
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
  secondary: {
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
  flex: {
    flex: 1,
    gap: 2,
  },
  studentMain: {
    gap: 12,
  },
  studentTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: theme.accent.soft,
    borderRadius: radius.pill,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  avatarText: {
    color: theme.accent.primary,
    fontFamily: fonts.extrabold,
    fontSize: 15,
  },
  name: {
    color: theme.text.primary,
    fontFamily: fonts.bold,
    fontSize: 16,
  },
  planRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  planText: {
    color: theme.text.primary,
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: 13,
  },
  planTextMuted: {
    color: theme.text.muted,
    fontFamily: fonts.medium,
  },
  testimonial: {
    backgroundColor: theme.bg.raised,
    borderRadius: radius.sm,
    gap: 8,
    padding: 12,
  },
  overline: {
    ...typography.overline,
    color: theme.text.muted,
  },
  testimonialText: {
    color: theme.text.primary,
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 20,
  },
  smallButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: theme.accent.primary,
    borderRadius: radius.pill,
    height: 36,
    justifyContent: 'center',
    minWidth: 96,
    paddingHorizontal: 16,
  },
  smallButtonText: {
    color: theme.accent.onPrimary,
    fontFamily: fonts.bold,
    fontSize: 13,
  },
  link: {
    alignItems: 'center',
    backgroundColor: theme.bg.surface,
    borderColor: theme.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    padding: 14,
  },
  linkIcon: {
    alignItems: 'center',
    backgroundColor: theme.bg.raised,
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
  pressed: {
    opacity: 0.75,
  },
}));
