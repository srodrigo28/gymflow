import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useFocusEffect, useLocalSearchParams, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
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

import { StudentStats } from '@/src/components/coaching/StudentStats';
import { Button } from '@/src/components/ui/Button';
import { Screen } from '@/src/components/ui/Screen';
import { modalityLabels } from '@/src/constants/modalities';
import { useSession } from '@/src/contexts/session-context';
import { ApiError } from '@/src/services/api';
import {
  approveTestimonial,
  deleteCoachingLink,
  deletePlan,
  getStudent,
  listPlans,
  updatePlan,
} from '@/src/services/coaching';
import { fonts, makeStyles, radius, typography, useTheme, withAlpha } from '@/src/theme';
import type {
  CoachingPermissions,
  CoachMeasurement,
  CoachWorkout,
  CoachWorkoutSet,
  StudentDetail,
  Testimonial,
  TrainingPlan,
} from '@/src/types/coaching';
import type { RemotePhoto } from '@/src/types/photos';
import type { Modality } from '@/src/types/training';
import {
  formatDistance,
  formatDuration,
  formatSessionDate,
  formatShortDate,
  monthLabel,
  monthShortLabel,
  muscleLabel,
} from '@/src/utils/format';

// Um aluno em detalhe, do ponto de vista do personal: só o que o aluno liberou. Cada parte vazia diz
// por quê (sem a permissão, ou o aluno não guarda aquilo na conta), com a dica que vem da API.

// As URLs das fotos valem 10 minutos. Com menos de 30 segundos de folga, o aluno é pedido de novo antes
// de abrir a foto inteira.
const URL_MARGIN = 30_000;
// 0 = segunda … 6 = domingo, como a prescrição guarda.
const WEEKDAYS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'];

const decimalFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

type MeasureKey = 'weightKg' | 'bodyFatPct' | 'waistCm' | 'hipCm' | 'chestCm' | 'armCm' | 'thighCm';

// A mesma ordem da tela de medidas do aluno: peso primeiro, porque é o que quase todo mundo registra.
const measureColumns: { key: MeasureKey; label: string; unit: string }[] = [
  { key: 'weightKg', label: 'Peso', unit: 'kg' },
  { key: 'bodyFatPct', label: 'Gordura', unit: '%' },
  { key: 'waistCm', label: 'Cintura', unit: 'cm' },
  { key: 'hipCm', label: 'Quadril', unit: 'cm' },
  { key: 'chestCm', label: 'Peito', unit: 'cm' },
  { key: 'armCm', label: 'Braço', unit: 'cm' },
  { key: 'thighCm', label: 'Coxa', unit: 'cm' },
];

const permissionItems: { key: keyof CoachingPermissions; label: string }[] = [
  { key: 'shareWorkouts', label: 'Treinos' },
  { key: 'shareMeasurements', label: 'Medidas' },
  { key: 'sharePhotos', label: 'Fotos' },
];

const poseLabels: Record<RemotePhoto['pose'], string> = { costas: 'Costas', frente: 'Frente', lado: 'Lado' };

// De onde veio o erro de uma ação: ele aparece perto do que foi tocado.
type ActionSource = 'link' | 'plans' | 'testimonial';

// Rotas novas, que ainda não estão nos tipos gerados do expo-router.
const route = (path: string) => path as unknown as Href;

function prescribeHref(studentId: string, planId?: string) {
  const plan = planId ? `&planId=${encodeURIComponent(planId)}` : '';

  return route(`/(app)/alunos/prescrever?studentId=${encodeURIComponent(studentId)}${plan}`);
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

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

function goToStudents() {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace(route('/(app)/alunos'));
  }
}

/** Linha de apoio do exercício: o grupo muscular na musculação; nas outras modalidades, o nome dela. */
function groupLabel(exercise: { modality: string | null; muscle: string }) {
  if (exercise.modality && exercise.modality !== 'musculacao') {
    return modalityLabels[exercise.modality as Modality] ?? muscleLabel(exercise.muscle);
  }

  return muscleLabel(exercise.muscle);
}

// 45 → "45 s"; 1200 → "20 min"; 90 → "1:30".
function timeLabel(seconds: number) {
  if (seconds < 60) {
    return `${seconds} s`;
  }

  return seconds % 60 === 0 ? `${seconds / 60} min` : formatDuration(seconds);
}

// "60 kg × 10 · RPE 8"; no cardio, "20 min · 3,2 km". Mostra o que a série tem, seja qual for o tipo.
function setLabel(set: CoachWorkoutSet) {
  const parts: string[] = [];

  if (set.weightKg !== null && set.reps !== null) {
    parts.push(`${decimalFormat.format(set.weightKg)} kg × ${set.reps}`);
  } else if (set.weightKg !== null) {
    parts.push(`${decimalFormat.format(set.weightKg)} kg`);
  } else if (set.reps !== null) {
    parts.push(plural(set.reps, 'repetição', 'repetições'));
  }

  if (set.durationSec !== null) {
    parts.push(timeLabel(set.durationSec));
  }

  if (set.distanceM !== null) {
    parts.push(formatDistance(set.distanceM));
  }

  if (set.rpe !== null) {
    parts.push(`RPE ${set.rpe}`);
  }

  return parts.join(' · ') || 'feita, sem números';
}

function durationText(workout: CoachWorkout) {
  const started = Date.parse(workout.startedAt);
  const finished = workout.finishedAt ? Date.parse(workout.finishedAt) : Number.NaN;

  if (!Number.isFinite(started) || !Number.isFinite(finished) || finished <= started) {
    return null;
  }

  const minutes = Math.max(1, Math.round((finished - started) / 60_000));

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const rest = minutes % 60;

  return rest ? `${Math.floor(minutes / 60)} h ${rest} min` : `${minutes / 60} h`;
}

// "Hipertrofia · Treino A": o nome da prescrição e o dia dela que o aluno escolheu.
function planDayText(plan: NonNullable<CoachWorkout['plan']>) {
  const day = plan.title ?? (plan.day !== null ? `Dia ${plan.day + 1}` : null);

  return day ? `${plan.name} · ${day}` : plan.name;
}

// "Treino A (seg) · Treino B (qua)"
function daysSummary(plan: TrainingPlan) {
  return plan.days
    .map((day) => (day.weekday !== null ? `${day.title} (${WEEKDAYS[day.weekday] ?? ''})` : day.title))
    .join(' · ');
}

// "22 set"; de outro ano, "22 set 2025".
function measurementDate(takenAt: number) {
  const date = new Date(takenAt);

  return date.getFullYear() === new Date().getFullYear()
    ? formatShortDate(takenAt)
    : `${formatShortDate(takenAt)} ${date.getFullYear()}`;
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// "Hoje, 07:05" no meio da frase vira "hoje, 07:05".
function lowerFirst(text: string) {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

// A chave do cache não muda com a URL assinada: a foto já baixada não desce de novo a cada 10 minutos.
// Se o aluno trocar a foto, a data de atualização muda a chave.
function photoKey(photo: RemotePhoto, size: 'full' | 'thumb') {
  return `aluno-foto-${photo.id}-${photo.updatedAt}-${size}`;
}

export default function AlunoScreen() {
  const styles = useStyles();
  const { theme } = useTheme();
  const { session } = useSession();
  const token = session?.token;
  const params = useLocalSearchParams<{ id: string }>();
  const studentId = typeof params.id === 'string' ? params.id : '';
  const [detail, setDetail] = useState<StudentDetail | null>(null);
  const [plans, setPlans] = useState<TrainingPlan[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [plansError, setPlansError] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  // O que está sendo salvo: o id de uma prescrição, 'testimonial' ou 'link'. Trava só aquele botão.
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<{ from: ActionSource; message: string } | null>(null);
  const [viewer, setViewer] = useState<RemotePhoto | null>(null);
  const [isOpeningPhoto, setIsOpeningPhoto] = useState(false);

  // O detalhe e as prescrições vêm juntos, mas um não segura o outro: se só um falhar, o outro aparece.
  const load = useCallback(async () => {
    if (!token || !studentId) {
      return null;
    }

    const [detailResult, plansResult] = await Promise.allSettled([
      getStudent(token, studentId),
      listPlans(token, studentId),
    ]);
    let fresh: StudentDetail | null = null;

    if (detailResult.status === 'fulfilled') {
      fresh = detailResult.value;
      setDetail(fresh);
      setError(null);
    } else {
      // 404: o vínculo foi desfeito (o aluno também pode desfazer). Não sobra nada para mostrar.
      if (detailResult.reason instanceof ApiError && detailResult.reason.status === 404) {
        setDetail(null);
      }

      setError(messageOf(detailResult.reason, 'Não foi possível carregar o aluno.'));
    }

    if (plansResult.status === 'fulfilled') {
      setPlans(plansResult.value);
      setPlansError(null);
    } else {
      setPlansError(messageOf(plansResult.reason, 'Não foi possível carregar as prescrições.'));
    }

    setIsLoaded(true);

    return fresh;
  }, [studentId, token]);

  // Tudo vem de novo ao voltar à tela: as URLs das fotos valem só 10 minutos, e a prescrição pode ter
  // acabado de mudar.
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

  // Aprovar, ativar, desativar e apagar seguem o mesmo caminho: chama a API e recarrega a tela.
  async function run(key: string, from: ActionSource, action: () => Promise<unknown>, fallback: string) {
    setBusy(key);
    setActionError(null);

    try {
      await action();
      await load();
    } catch (reason) {
      setActionError({ from, message: messageOf(reason, fallback) });
    } finally {
      setBusy(null);
    }
  }

  function approve() {
    if (!token || !detail) {
      return;
    }

    const { linkId } = detail.summary;
    void run('testimonial', 'testimonial', () => approveTestimonial(token, linkId), 'Não foi possível aprovar o depoimento.');
  }

  // A prescrição vai inteira de volta, só com a chave trocada: o servidor confere tudo de novo.
  function togglePlan(plan: TrainingPlan) {
    if (!token) {
      return;
    }

    void run(
      plan.id,
      'plans',
      () => updatePlan(token, plan.id, { active: !plan.active, days: plan.days, name: plan.name, note: plan.note }),
      plan.active ? 'Não foi possível desativar a prescrição.' : 'Não foi possível ativar a prescrição.',
    );
  }

  function confirmDeletePlan(plan: TrainingPlan) {
    askToConfirm(
      'Apagar a prescrição?',
      `“${plan.name}” sai do celular do aluno. Os treinos já feitos com ela continuam no histórico dele.`,
      'Apagar',
      () => {
        if (token) {
          void run(plan.id, 'plans', () => deletePlan(token, plan.id), 'Não foi possível apagar a prescrição.');
        }
      },
    );
  }

  async function unlink(linkId: string) {
    if (!token) {
      return;
    }

    setBusy('link');
    setActionError(null);

    try {
      await deleteCoachingLink(token, linkId);
      goToStudents();
    } catch (reason) {
      setActionError({ from: 'link', message: messageOf(reason, 'Não foi possível desfazer o vínculo.') });
      setBusy(null);
    }
  }

  function confirmUnlink() {
    if (!detail) {
      return;
    }

    const { linkId, student } = detail.summary;
    askToConfirm(
      `Desfazer o vínculo com ${student.name}?`,
      'Você deixa de ver o que o aluno compartilha, e as prescrições entre vocês saem juntas. Os treinos continuam na conta do aluno. Para voltar, é preciso um convite novo.',
      'Desfazer vínculo',
      () => void unlink(linkId),
      'Manter',
    );
  }

  // A foto inteira usa a URL assinada; vencida (ou quase), o aluno é pedido de novo antes de abrir.
  async function openPhoto(photo: RemotePhoto) {
    if (Date.parse(photo.expiresAt) - Date.now() > URL_MARGIN) {
      setViewer(photo);
      return;
    }

    setIsOpeningPhoto(true);
    const fresh = await load();
    setIsOpeningPhoto(false);
    const updated = fresh?.photos?.find((item) => item.id === photo.id);

    if (updated) {
      setViewer(updated);
    }
  }

  const summary = detail?.summary;

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
            onPress={goToStudents}
            style={({ pressed }) => [styles.iconButton, pressed ? styles.pressed : null]}>
            <Ionicons color={theme.text.primary} name="arrow-back" size={20} />
          </Pressable>
          <Text accessibilityRole="header" numberOfLines={2} style={styles.title}>
            {summary?.student.name ?? 'Aluno'}
          </Text>
        </View>

        {error ? (
          <Text accessibilityLiveRegion="polite" style={styles.error}>
            {error}
          </Text>
        ) : null}

        {!studentId ? (
          <>
            <Text accessibilityLiveRegion="polite" style={styles.error}>
              Não deu para saber qual aluno abrir. Volte e toque no aluno de novo.
            </Text>
            <Button icon="people-outline" onPress={goToStudents} title="Voltar aos alunos" variant="outline" />
          </>
        ) : null}

        {studentId && !isLoaded ? (
          <ActivityIndicator accessibilityLabel="Carregando o aluno" color={theme.accent.primary} style={styles.loading} />
        ) : null}

        {isLoaded && !detail ? (
          <>
            <Button icon="refresh" loading={isRefreshing} onPress={refresh} title="Tentar de novo" variant="outline" />
            <Button icon="people-outline" onPress={goToStudents} title="Voltar aos alunos" variant="ghost" />
          </>
        ) : null}

        {detail && summary ? (
          <>
            <SummaryCard detail={detail} />

            {summary.testimonial ? (
              <TestimonialCard
                busy={busy === 'testimonial'}
                error={actionError?.from === 'testimonial' ? actionError.message : null}
                onApprove={approve}
                testimonial={summary.testimonial}
              />
            ) : null}

            <PlansCard
              busyId={busy}
              error={actionError?.from === 'plans' ? actionError.message : null}
              loadError={plansError}
              onDelete={confirmDeletePlan}
              onToggle={togglePlan}
              plans={plans}
              studentId={studentId}
            />

            <WorkoutsCard hint={detail.hints.workouts} workouts={detail.workouts} />
            <MeasurementsCard hint={detail.hints.measurements} measurements={detail.measurements} />
            <PhotosCard busy={isOpeningPhoto} hint={detail.hints.photos} onOpen={openPhoto} photos={detail.photos} />

            <Button
              icon="person-remove-outline"
              loading={busy === 'link'}
              onPress={confirmUnlink}
              title="Desfazer vínculo"
              variant="ghost"
            />
            {actionError?.from === 'link' ? (
              <Text accessibilityLiveRegion="polite" style={styles.error}>
                {actionError.message}
              </Text>
            ) : null}
          </>
        ) : null}
      </ScrollView>

      <PhotoViewer onClose={() => setViewer(null)} photo={viewer} />
    </Screen>
  );
}

function SummaryCard({ detail }: { detail: StudentDetail }) {
  const styles = useStyles();
  const { theme } = useTheme();
  const { summary } = detail;
  const since = Date.parse(summary.since);
  const last = summary.lastWorkoutAt ? Date.parse(summary.lastWorkoutAt) : Number.NaN;

  return (
    <View style={styles.card}>
      <Text style={styles.caption}>
        {Number.isFinite(since) ? `Aluno desde ${formatShortDate(since)}` : 'Aluno'}
        {Number.isFinite(last) ? ` · último treino: ${lowerFirst(formatSessionDate(last))}` : ''}
      </Text>

      <StudentStats student={summary} />

      {summary.missing ? (
        <Text style={styles.secondary}>
          Uma mensagem sua pode ajudar na volta: sem cobrança, só lembrando que o próximo treino já conta.
        </Text>
      ) : null}

      <View style={styles.divider} />

      <Text style={styles.label}>O que o aluno compartilha com você</Text>
      <View style={styles.chips}>
        {permissionItems.map((item) => {
          const isOn = summary.permissions[item.key];

          return (
            <View
              accessibilityLabel={`${item.label}: ${isOn ? 'compartilha' : 'não compartilha'}`}
              accessible
              key={item.key}
              style={[styles.permission, isOn ? { backgroundColor: withAlpha(theme.status.success, 0.14) } : null]}>
              <Ionicons
                color={isOn ? theme.status.success : theme.text.muted}
                name={isOn ? 'checkmark-circle' : 'close-circle-outline'}
                size={16}
              />
              <Text style={[styles.permissionText, isOn ? null : styles.permissionOff]}>{item.label}</Text>
            </View>
          );
        })}
      </View>
      <Text style={styles.caption}>
        O aluno escolhe o que compartilha e pode mudar quando quiser. Medidas e fotos só chegam se ele também as
        guarda na conta.
      </Text>
    </View>
  );
}

type TestimonialCardProps = {
  busy: boolean;
  error: string | null;
  onApprove: () => void;
  testimonial: NonNullable<Testimonial>;
};

function TestimonialCard({ busy, error, onApprove, testimonial }: TestimonialCardProps) {
  const styles = useStyles();
  const { theme } = useTheme();

  return (
    <View style={styles.card}>
      <Text accessibilityRole="header" style={styles.cardTitle}>
        Depoimento
      </Text>
      <Text style={styles.quote}>“{testimonial.text}”</Text>
      {testimonial.approved ? (
        <View style={styles.inline}>
          <Ionicons color={theme.status.success} name="checkmark-circle" size={18} />
          <Text style={styles.secondary}>Aprovado: aparece na sua página pública com o primeiro nome do aluno.</Text>
        </View>
      ) : (
        <>
          <Text style={styles.caption}>Aprovado, ele aparece na sua página pública com o primeiro nome do aluno.</Text>
          <Button
            icon="checkmark-circle-outline"
            loading={busy}
            onPress={onApprove}
            title="Aprovar depoimento"
            variant="outline"
          />
        </>
      )}
      {error ? (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

type PlansCardProps = {
  busyId: string | null;
  error: string | null;
  loadError: string | null;
  onDelete: (plan: TrainingPlan) => void;
  onToggle: (plan: TrainingPlan) => void;
  plans: TrainingPlan[] | null;
  studentId: string;
};

function PlansCard({ busyId, error, loadError, onDelete, onToggle, plans, studentId }: PlansCardProps) {
  const styles = useStyles();
  const { theme } = useTheme();

  return (
    <View style={styles.card}>
      <Text accessibilityRole="header" style={styles.cardTitle}>
        Prescrições
      </Text>
      <Text style={styles.caption}>
        A prescrição ativa aparece no celular do aluno na hora de treinar, e o que ele fez volta para você aqui.
      </Text>
      <Button icon="add-circle-outline" onPress={() => router.push(prescribeHref(studentId))} title="Prescrever treino" />

      {loadError ? (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          {loadError}
        </Text>
      ) : null}

      {plans === null && !loadError ? (
        <ActivityIndicator accessibilityLabel="Carregando as prescrições" color={theme.accent.primary} />
      ) : null}

      {plans?.length === 0 ? <Text style={styles.empty}>Nenhuma prescrição para este aluno ainda.</Text> : null}

      {plans?.map((plan) => {
        const isBusy = busyId === plan.id;
        const updated = Date.parse(plan.updatedAt);

        return (
          <View key={plan.id} style={styles.plan}>
            <View style={styles.planTop}>
              <Text style={styles.planName}>{plan.name}</Text>
              <View
                style={[
                  styles.pill,
                  { backgroundColor: plan.active ? withAlpha(theme.status.success, 0.16) : theme.bg.high },
                ]}>
                <Text style={[styles.pillText, { color: plan.active ? theme.status.success : theme.text.secondary }]}>
                  {plan.active ? 'Ativa' : 'Desativada'}
                </Text>
              </View>
            </View>
            <Text style={styles.secondary}>
              {plural(plan.days.length, 'dia', 'dias')}: {daysSummary(plan)}
            </Text>
            {plan.note ? (
              <Text numberOfLines={3} style={styles.caption}>
                {plan.note}
              </Text>
            ) : null}
            {Number.isFinite(updated) ? (
              <Text style={styles.caption}>Atualizada em {formatShortDate(updated)}</Text>
            ) : null}
            <View style={styles.actions}>
              <RowAction
                accessibilityLabel={`Editar a prescrição ${plan.name}`}
                disabled={isBusy}
                icon="create-outline"
                label="Editar"
                onPress={() => router.push(prescribeHref(studentId, plan.id))}
              />
              <RowAction
                accessibilityLabel={`${plan.active ? 'Desativar' : 'Ativar'} a prescrição ${plan.name}`}
                busy={isBusy}
                disabled={isBusy}
                icon={plan.active ? 'pause-circle-outline' : 'play-circle-outline'}
                label={plan.active ? 'Desativar' : 'Ativar'}
                onPress={() => onToggle(plan)}
              />
              <RowAction
                accessibilityLabel={`Apagar a prescrição ${plan.name}`}
                disabled={isBusy}
                icon="trash-outline"
                label="Apagar"
                onPress={() => onDelete(plan)}
              />
            </View>
          </View>
        );
      })}

      {error ? (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

type RowActionProps = {
  accessibilityLabel: string;
  busy?: boolean;
  disabled?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
};

// Ação compacta da prescrição (o Button ocupa a largura toda).
function RowAction({ accessibilityLabel, busy = false, disabled = false, icon, label, onPress }: RowActionProps) {
  const styles = useStyles();
  const { theme } = useTheme();

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ busy, disabled }}
      disabled={disabled}
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [styles.rowAction, pressed || disabled ? styles.pressed : null]}>
      {busy ? (
        <ActivityIndicator color={theme.text.secondary} size="small" />
      ) : (
        <Ionicons color={theme.text.secondary} name={icon} size={16} />
      )}
      <Text style={styles.rowActionText}>{label}</Text>
    </Pressable>
  );
}

// Por que uma parte veio vazia. A frase da API já diz se falta a permissão ou se o aluno não guarda na conta.
function Hint({ text }: { text: string }) {
  const styles = useStyles();
  const { theme } = useTheme();

  return (
    <View style={styles.hint}>
      <Ionicons color={theme.text.muted} name="information-circle-outline" size={18} />
      <Text style={styles.hintText}>{text}</Text>
    </View>
  );
}

function WorkoutsCard({ hint, workouts }: { hint: string | null; workouts: CoachWorkout[] | null }) {
  const styles = useStyles();

  return (
    <View style={styles.card}>
      <Text accessibilityRole="header" style={styles.cardTitle}>
        Treinos
      </Text>
      {workouts && workouts.length ? (
        <>
          <Text style={styles.caption}>
            {workouts.length === 1
              ? 'O último treino concluído que subiu para a conta.'
              : `Os ${workouts.length} últimos treinos concluídos que subiram para a conta.`}
          </Text>
          {workouts.map((workout) => (
            <WorkoutItem key={workout.id} workout={workout} />
          ))}
        </>
      ) : (
        <Hint text={hint ?? 'Nenhum treino concluído subiu para a conta ainda.'} />
      )}
    </View>
  );
}

function WorkoutItem({ workout }: { workout: CoachWorkout }) {
  const styles = useStyles();
  const { theme } = useTheme();
  const started = Date.parse(workout.startedAt);
  const duration = durationText(workout);

  return (
    <View style={styles.workout}>
      <View style={styles.workoutTop}>
        <Text style={styles.workoutDate}>{Number.isFinite(started) ? formatSessionDate(started) : 'Treino'}</Text>
        {duration ? <Text style={styles.caption}>{duration}</Text> : null}
      </View>

      {workout.plan ? (
        <View style={styles.planTag}>
          <MaterialCommunityIcons color={theme.accent.primary} name="clipboard-text-outline" size={14} />
          <Text numberOfLines={1} style={styles.planTagText}>
            {planDayText(workout.plan)}
          </Text>
        </View>
      ) : null}

      {workout.exercises.map((exercise, index) => (
        <ExerciseItem exercise={exercise} fromPlan={workout.plan !== null} key={`${exercise.exerciseId}-${index}`} />
      ))}

      {workout.missing.length ? (
        <View style={styles.inline}>
          <MaterialCommunityIcons color={theme.text.muted} name="format-list-checks" size={16} />
          <Text style={styles.secondary}>
            {workout.missing.length === 1 ? 'Ficou de fora' : 'Ficaram de fora'}: {workout.missing.join(', ')}.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function ExerciseItem({ exercise, fromPlan }: { exercise: CoachWorkout['exercises'][number]; fromPlan: boolean }) {
  const styles = useStyles();
  const done = exercise.sets.filter((set) => set.done);
  const total = exercise.sets.length;

  return (
    <View style={styles.exercise}>
      <View style={styles.exerciseTop}>
        <Text style={styles.exerciseName}>{exercise.name}</Text>
        {exercise.prescribed ? (
          <Text
            accessibilityLabel={`Prescrito: ${plural(exercise.prescribed.sets, 'série', 'séries')} de ${exercise.prescribed.reps}`}
            style={styles.prescribed}>
            prescrito {exercise.prescribed.sets} × {exercise.prescribed.reps}
          </Text>
        ) : fromPlan ? (
          <Text style={styles.extra}>fora da prescrição</Text>
        ) : null}
      </View>
      <Text style={styles.caption}>
        {groupLabel(exercise)} · {done.length} de {total} {total === 1 ? 'série feita' : 'séries feitas'}
      </Text>
      {done.length ? (
        <View style={styles.sets}>
          {done.map((set, index) => (
            <View key={index} style={styles.setChip}>
              <Text style={styles.setText}>{setLabel(set)}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function MeasurementsCard({ hint, measurements }: { hint: string | null; measurements: CoachMeasurement[] | null }) {
  const styles = useStyles();
  // Só as colunas que têm pelo menos um número: ninguém mede as sete circunferências.
  const columns = measurements
    ? measureColumns.filter((column) => measurements.some((row) => row[column.key] !== null))
    : [];

  return (
    <View style={styles.card}>
      <Text accessibilityRole="header" style={styles.cardTitle}>
        Medidas
      </Text>
      {measurements && measurements.length && columns.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHead]}>
              <Text style={[styles.cell, styles.dateCell, styles.headText]}>Data</Text>
              {columns.map((column) => (
                <View key={column.key} style={styles.cell}>
                  <Text style={styles.headText}>{column.label}</Text>
                  <Text style={styles.unitText}>{column.unit}</Text>
                </View>
              ))}
            </View>
            {measurements.map((row) => (
              <View
                accessibilityLabel={`${measurementDate(row.takenAt)}: ${columns
                  .filter((column) => row[column.key] !== null)
                  .map((column) => `${column.label.toLowerCase()} ${decimalFormat.format(row[column.key] ?? 0)} ${column.unit}`)
                  .join(', ')}`}
                accessible
                key={row.id}
                style={styles.tableRow}>
                <Text style={[styles.cell, styles.dateCell, styles.cellText]}>{measurementDate(row.takenAt)}</Text>
                {columns.map((column) => {
                  const value = row[column.key];

                  return (
                    <Text key={column.key} style={[styles.cell, styles.cellText, value === null ? styles.cellEmpty : null]}>
                      {value === null ? '–' : decimalFormat.format(value)}
                    </Text>
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>
      ) : (
        <Hint text={hint ?? 'Nenhuma medida registrada na conta ainda.'} />
      )}
    </View>
  );
}

type PhotosCardProps = {
  busy: boolean;
  hint: string | null;
  onOpen: (photo: RemotePhoto) => void;
  photos: RemotePhoto[] | null;
};

function PhotosCard({ busy, hint, onOpen, photos }: PhotosCardProps) {
  const styles = useStyles();
  const { theme } = useTheme();

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text accessibilityRole="header" style={[styles.cardTitle, styles.flex]}>
          Fotos
        </Text>
        {busy ? <ActivityIndicator accessibilityLabel="Abrindo a foto" color={theme.accent.primary} size="small" /> : null}
      </View>
      {photos && photos.length ? (
        <>
          <View style={styles.grid}>
            {photos.map((photo) => (
              <Pressable
                accessibilityLabel={`Abrir a foto de ${monthLabel(photo.month)}, pose ${poseLabels[photo.pose]}`}
                accessibilityRole="imagebutton"
                accessibilityState={{ disabled: busy }}
                disabled={busy}
                key={photo.id}
                onPress={() => onOpen(photo)}
                style={({ pressed }) => [styles.tile, pressed ? styles.pressed : null]}>
                {/* Só na memória: é a foto de corpo de outra pessoa, e não deve ficar gravada no aparelho. */}
                <Image
                  cachePolicy="memory"
                  contentFit="cover"
                  source={{ cacheKey: photoKey(photo, 'thumb'), uri: photo.thumbUrl }}
                  style={styles.tileImage}
                  transition={150}
                />
                <Text numberOfLines={1} style={styles.tileLabel}>
                  {monthShortLabel(photo.month)} · {poseLabels[photo.pose]}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.caption}>As fotos são do aluno e só aparecem enquanto ele compartilha com você.</Text>
        </>
      ) : (
        <Hint text={hint ?? 'Nenhuma foto guardada na conta ainda.'} />
      )}
    </View>
  );
}

// A foto inteira, por cima da tela. A miniatura (já na memória) aparece enquanto a foto grande chega.
function PhotoViewer({ onClose, photo }: { onClose: () => void; photo: RemotePhoto | null }) {
  const styles = useStyles();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      animationType="fade"
      navigationBarTranslucent
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={photo !== null}>
      <View style={styles.viewer}>
        {photo ? (
          // Tocar na foto também fecha; para o leitor de tela, o caminho é o botão de fechar.
          <Pressable accessible={false} onPress={onClose} style={styles.viewerStage}>
            <Image
              accessibilityLabel={`Foto de ${monthLabel(photo.month)}, pose ${poseLabels[photo.pose]}`}
              cachePolicy="memory"
              contentFit="contain"
              placeholder={{ cacheKey: photoKey(photo, 'thumb'), uri: photo.thumbUrl }}
              placeholderContentFit="contain"
              source={{ cacheKey: photoKey(photo, 'full'), uri: photo.url }}
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

        {photo ? (
          <View style={[styles.viewerInfo, { paddingBottom: insets.bottom + 16 }]}>
            <Text style={styles.viewerName}>
              {capitalize(monthLabel(photo.month))} · {poseLabels[photo.pose]}
            </Text>
            {photo.note ? <Text style={styles.viewerCaption}>{photo.note}</Text> : null}
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
  loading: {
    marginVertical: 32,
  },
  error: {
    color: theme.status.danger,
    fontFamily: fonts.medium,
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
  cardTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  cardTitle: {
    color: theme.text.primary,
    fontFamily: fonts.extrabold,
    fontSize: 16,
    lineHeight: 22,
  },
  flex: {
    flex: 1,
  },
  label: {
    color: theme.text.primary,
    fontFamily: fonts.bold,
    fontSize: 14,
  },
  secondary: {
    color: theme.text.secondary,
    flexShrink: 1,
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
  empty: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  divider: {
    backgroundColor: theme.border.subtle,
    height: 1,
  },
  inline: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 8,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  permission: {
    alignItems: 'center',
    backgroundColor: theme.bg.raised,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  permissionText: {
    color: theme.text.primary,
    fontFamily: fonts.semibold,
    fontSize: 13,
  },
  permissionOff: {
    color: theme.text.muted,
  },
  quote: {
    color: theme.text.primary,
    fontFamily: fonts.medium,
    fontSize: 15,
    lineHeight: 22,
  },
  plan: {
    backgroundColor: theme.bg.raised,
    borderRadius: radius.sm,
    gap: 6,
    padding: 12,
  },
  planTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  planName: {
    color: theme.text.primary,
    flex: 1,
    fontFamily: fonts.bold,
    fontSize: 15,
  },
  pill: {
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  pillText: {
    fontFamily: fonts.bold,
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 4,
  },
  rowAction: {
    alignItems: 'center',
    backgroundColor: theme.bg.surface,
    borderColor: theme.border.subtle,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 12,
  },
  rowActionText: {
    color: theme.text.secondary,
    fontFamily: fonts.semibold,
    fontSize: 13,
  },
  hint: {
    alignItems: 'flex-start',
    backgroundColor: theme.bg.raised,
    borderRadius: radius.sm,
    flexDirection: 'row',
    gap: 8,
    padding: 12,
  },
  hintText: {
    color: theme.text.secondary,
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  workout: {
    borderColor: theme.border.subtle,
    borderRadius: radius.sm,
    borderWidth: 1,
    gap: 10,
    padding: 12,
  },
  workoutTop: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  workoutDate: {
    color: theme.text.primary,
    fontFamily: fonts.bold,
    fontSize: 15,
  },
  planTag: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: theme.accent.soft,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 6,
    maxWidth: '100%',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  planTagText: {
    color: theme.accent.primary,
    flexShrink: 1,
    fontFamily: fonts.bold,
    fontSize: 12,
  },
  exercise: {
    gap: 4,
  },
  exerciseTop: {
    alignItems: 'baseline',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  exerciseName: {
    color: theme.text.primary,
    flexShrink: 1,
    fontFamily: fonts.semibold,
    fontSize: 14,
  },
  prescribed: {
    color: theme.accent.primary,
    fontFamily: fonts.bold,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  extra: {
    color: theme.text.muted,
    fontFamily: fonts.semibold,
    fontSize: 12,
  },
  sets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  setChip: {
    backgroundColor: theme.bg.raised,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  setText: {
    color: theme.text.primary,
    fontFamily: fonts.medium,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  table: {
    borderColor: theme.border.subtle,
    borderRadius: radius.sm,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tableRow: {
    alignItems: 'center',
    borderBottomColor: theme.border.subtle,
    borderBottomWidth: 1,
    flexDirection: 'row',
    minHeight: 40,
  },
  tableHead: {
    backgroundColor: theme.bg.raised,
  },
  cell: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    width: 72,
  },
  dateCell: {
    width: 92,
  },
  headText: {
    color: theme.text.primary,
    fontFamily: fonts.bold,
    fontSize: 12,
  },
  unitText: {
    color: theme.text.muted,
    fontFamily: fonts.medium,
    fontSize: 11,
  },
  cellText: {
    color: theme.text.primary,
    fontFamily: fonts.medium,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  cellEmpty: {
    color: theme.text.muted,
  },
  grid: {
    columnGap: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 12,
  },
  tile: {
    gap: 4,
    width: '31%',
  },
  tileImage: {
    aspectRatio: 3 / 4,
    backgroundColor: theme.bg.raised,
    borderRadius: radius.sm,
    width: '100%',
  },
  tileLabel: {
    color: theme.text.secondary,
    fontFamily: fonts.semibold,
    fontSize: 12,
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
