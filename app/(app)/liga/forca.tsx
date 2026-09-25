import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { Screen } from '@/src/components/ui/Screen';
import { useSession } from '@/src/contexts/session-context';
import { ApiError } from '@/src/services/api';
import { getWeightSeries } from '@/src/services/body';
import { deleteStrengthProfile, getSeason, getStrengthProfile, saveStrengthProfile } from '@/src/services/league';
import { getOnboardingProfile } from '@/src/services/onboarding';
import { syncWorkouts } from '@/src/services/sync';
import { fonts, makeStyles, radius, typography, useTheme, withAlpha } from '@/src/theme';
import type { DotsFormula, SeasonCategory, SeasonEntry, StrengthProfile } from '@/src/types/league';

type WeightPoint = Awaited<ReturnType<typeof getWeightSeries>>[number];

// O que o aparelho já sabe para sugerir no formulário. Nada sai daqui sem a pessoa tocar em entrar.
type Prefill = {
  formula: DotsFormula | null;
  weightKg: number | null;
  // De onde veio o peso sugerido: a última pesagem da Evolução ou, sem nenhuma, o questionário.
  weightSource: 'measurement' | 'questionnaire' | null;
  weightTakenAt: number | null;
};

type FormErrors = { form?: string; formula?: string; weight?: string };

// Os limites que a API aceita para o peso corporal.
const MIN_WEIGHT_KG = 30;
const MAX_WEIGHT_KG = 300;
// O placar mostra os dez primeiros; você aparece no fim se estiver mais abaixo.
const MAX_ENTRIES = 10;
// Quanto a tela espera os treinos subirem antes de pedir a pontuação.
const SYNC_WAIT_MS = 4000;

const LIFTS = ['Agachamento livre', 'Supino reto', 'Levantamento terra'];

const formulas: { label: string; value: DotsFormula }[] = [
  { label: 'Masculina', value: 'male' },
  { label: 'Feminina', value: 'female' },
];

const scoreFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1, minimumFractionDigits: 1 });

// As mensagens da API já vêm prontas para a tela; qualquer outro erro vira uma frase nossa.
function messageOf(reason: unknown, fallback: string) {
  return reason instanceof ApiError ? reason.message : fallback;
}

// A melhor série de agora há pouco precisa estar na conta para contar no DOTS. A espera tem limite:
// com a rede ruim, a tela carrega com o que o servidor já tem.
function syncFirst(token: string) {
  return Promise.race([
    syncWorkouts(token).catch(() => undefined),
    new Promise<void>((resolve) => setTimeout(resolve, SYNC_WAIT_MS)),
  ]);
}

// "82,5" → 82.5. Vazio, ou o que não for número, vira undefined.
function parseDecimal(text: string) {
  const value = Number(text.trim().replace(',', '.'));

  return text.trim() && Number.isFinite(value) ? value : undefined;
}

function decimalText(value: number | null) {
  return value === null ? '' : String(value).replace('.', ',');
}

function formulaLabel(formula: DotsFormula) {
  return formula === 'male' ? 'masculina' : 'feminina';
}

export default function ForcaScreen() {
  const styles = useStyles();
  const { theme } = useTheme();
  const { session } = useSession();
  // undefined enquanto não se sabe; null é quem ainda não entrou no ranking.
  const [profile, setProfile] = useState<StrengthProfile | null | undefined>(undefined);
  // undefined enquanto a temporada não chega; null quando ela chegou sem a categoria de força.
  const [category, setCategory] = useState<SeasonCategory | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [prefill, setPrefill] = useState<Prefill | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  // null: a pessoa ainda não mexeu no campo, e ele mostra a sugestão.
  const [weightText, setWeightText] = useState<string | null>(null);
  const [formula, setFormula] = useState<DotsFormula | null>(null);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);
  const token = session?.token;
  const userId = session?.user.id;
  const shownWeight = weightText ?? decimalText(prefill?.weightKg ?? null);
  const shownFormula = formula ?? prefill?.formula ?? null;

  // O perfil e a pontuação vêm juntos, mas um não segura o outro.
  const load = useCallback(async () => {
    if (!token) {
      return;
    }

    await syncFirst(token);

    const [strength, season] = await Promise.allSettled([getStrengthProfile(token), getSeason(token)]);

    if (strength.status === 'fulfilled') {
      setProfile(strength.value);
    }

    if (season.status === 'fulfilled') {
      setCategory(season.value.categories.find((item) => item.id === 'forca') ?? null);
    }

    const failure = [strength, season].find(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    );
    setError(
      failure ? messageOf(failure.reason, 'Não foi possível carregar o ranking de força. Tente de novo em instantes.') : null,
    );
    setIsLoaded(true);
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  // Sugestões para o formulário: o peso da última pesagem da Evolução (ou, sem nenhuma, o do
  // questionário) e a fórmula a partir do sexo informado no questionário.
  useEffect(() => {
    if (!userId) {
      return;
    }

    let active = true;

    // Sem o banco local (no navegador), vale o peso do questionário.
    void Promise.all([
      getWeightSeries(1).catch((): WeightPoint[] => []),
      getOnboardingProfile(userId).catch(() => null),
    ]).then(([series, answers]) => {
      if (!active) {
        return;
      }

      const latest = series[series.length - 1];
      const sex = answers?.sex;
      const answeredWeight = answers?.weightKg ?? null;

      setPrefill({
        formula: sex === 'male' || sex === 'female' ? sex : null,
        weightKg: latest?.weightKg ?? answeredWeight,
        weightSource: latest ? 'measurement' : answeredWeight !== null ? 'questionnaire' : null,
        weightTakenAt: latest?.takenAt ?? null,
      });
    });

    return () => {
      active = false;
    };
  }, [userId]);

  async function refresh() {
    setIsRefreshing(true);
    await load();
    setIsRefreshing(false);
  }

  function resetForm() {
    setWeightText(null);
    setFormula(null);
    setFormErrors({});
  }

  // Atualizar o peso começa pelo mais recente: a pesagem da Evolução, se for mais nova que a da conta.
  function openEditor() {
    if (!profile) {
      return;
    }

    const localWeight = prefill?.weightKg ?? null;
    const localTakenAt = prefill?.weightTakenAt ?? null;
    const weight =
      localWeight !== null && localTakenAt !== null && localTakenAt > Date.parse(profile.updatedAt)
        ? localWeight
        : profile.bodyweightKg;

    setWeightText(decimalText(weight));
    setFormula(profile.formula);
    setFormErrors({});
    setLeaveError(null);
    setIsEditing(true);
  }

  function closeEditor() {
    resetForm();
    setIsEditing(false);
  }

  async function handleSave() {
    const weightKg = parseDecimal(shownWeight);
    const found: FormErrors = {};

    if (weightKg === undefined || weightKg < MIN_WEIGHT_KG || weightKg > MAX_WEIGHT_KG) {
      found.weight = `Informe um peso entre ${MIN_WEIGHT_KG} e ${MAX_WEIGHT_KG} kg.`;
    }

    if (!shownFormula) {
      found.formula = 'Escolha a fórmula do DOTS.';
    }

    setFormErrors(found);

    if (Object.keys(found).length > 0 || weightKg === undefined || !shownFormula || !token) {
      return;
    }

    setIsSaving(true);

    try {
      const saved = await saveStrengthProfile(token, {
        bodyweightKg: Math.round(weightKg * 10) / 10,
        formula: shownFormula,
      });
      setProfile(saved);
      closeEditor();
      await load();
    } catch (reason) {
      setFormErrors({ form: messageOf(reason, 'Não foi possível salvar. Tente de novo.') });
    } finally {
      setIsSaving(false);
    }
  }

  async function leave() {
    if (!token) {
      return;
    }

    setIsLeaving(true);
    setLeaveError(null);

    try {
      await deleteStrengthProfile(token);
      setProfile(null);
      closeEditor();
      await load();
    } catch (reason) {
      setLeaveError(messageOf(reason, 'Não foi possível sair agora. Tente de novo.'));
    } finally {
      setIsLeaving(false);
    }
  }

  function confirmLeave() {
    Alert.alert(
      'Sair do ranking de força?',
      'O seu peso e a fórmula são apagados da conta, e você deixa de aparecer no ranking de força. Dá para entrar de novo quando quiser.',
      [
        { style: 'cancel', text: 'Ficar' },
        { onPress: () => void leave(), style: 'destructive', text: 'Sair e apagar' },
      ],
    );
  }

  const form = (
    <StrengthForm
      errors={formErrors}
      formula={shownFormula}
      onChangeFormula={(value) => {
        setFormula(value);
        setFormErrors((current) => ({ ...current, form: undefined, formula: undefined }));
      }}
      onChangeWeight={(text) => {
        setWeightText(text);
        setFormErrors((current) => ({ ...current, form: undefined, weight: undefined }));
      }}
      weightHint={
        weightText !== null || !prefill?.weightSource
          ? undefined
          : prefill.weightSource === 'measurement'
            ? 'Sugerido pela sua última pesagem na Evolução. Confira antes de entrar.'
            : 'Sugerido pelo questionário do início. Confira antes de entrar.'
      }
      weightText={shownWeight}
    />
  );

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
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(app)/liga'))}
            style={({ pressed }) => [styles.iconButton, pressed ? styles.pressed : null]}>
            <Ionicons color={theme.text.primary} name="arrow-back" size={20} />
          </Pressable>
          <Text accessibilityRole="header" style={styles.title}>
            Força relativa (DOTS)
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHead}>
            <View style={[styles.headIcon, { backgroundColor: withAlpha(theme.domain.treino, 0.16) }]}>
              <MaterialCommunityIcons color={theme.domain.treino} name="scale-balance" size={22} />
            </View>
            <Text accessibilityRole="header" style={styles.cardTitle}>
              Como funciona
            </Text>
          </View>
          <Text style={styles.secondary}>
            O DOTS compara força entre pessoas de tamanhos diferentes: soma a melhor série do mês no agachamento
            livre, no supino reto e no levantamento terra (carga estimada para 1 repetição) e ajusta pelo peso
            corporal. É o padrão do powerlifting no lugar do Wilks.
          </Text>
        </View>

        {error ? (
          <Text accessibilityLiveRegion="polite" style={styles.error}>
            {error}
          </Text>
        ) : null}

        {!isLoaded ? (
          <ActivityIndicator
            accessibilityLabel="Carregando o ranking de força"
            color={theme.accent.primary}
            style={styles.loading}
          />
        ) : null}

        {/* Sem saber se a pessoa já entrou, não dá para mostrar nem o convite nem o perfil. */}
        {isLoaded && profile === undefined ? (
          <Button icon="refresh" loading={isRefreshing} onPress={refresh} title="Tentar de novo" variant="outline" />
        ) : null}

        {profile === null ? (
          <View style={[styles.card, styles.consentCard]}>
            <View style={styles.cardHead}>
              <View style={[styles.headIcon, { backgroundColor: withAlpha(theme.accent.primary, 0.14) }]}>
                <MaterialCommunityIcons color={theme.accent.primary} name="shield-lock-outline" size={22} />
              </View>
              <Text accessibilityRole="header" style={styles.cardTitle}>
                Entrar no ranking de força
              </Text>
            </View>
            <Text style={styles.secondary}>
              Para entrar, informe seu peso e a fórmula do DOTS (masculina ou feminina). Eles ficam na conta só para
              esse cálculo: ninguém vê o seu peso, só a pontuação. Você pode sair quando quiser, e eles são apagados.
            </Text>
            {form}
            <Button
              haptic
              icon="enter-outline"
              loading={isSaving}
              onPress={handleSave}
              title="Entrar no ranking de força"
            />
          </View>
        ) : null}

        {profile ? (
          <View style={styles.card}>
            <View style={styles.cardHead}>
              <View style={[styles.headIcon, { backgroundColor: withAlpha(theme.status.success, 0.16) }]}>
                <MaterialCommunityIcons color={theme.status.success} name="check-decagram" size={22} />
              </View>
              <Text accessibilityRole="header" style={styles.cardTitle}>
                Você está no ranking de força
              </Text>
            </View>

            <ScoreBox category={category} />

            {category?.pending.length ? <PendingBox items={category.pending} /> : null}

            <View style={styles.lifts}>
              <Text style={styles.fieldLabel}>Entram na conta, com a melhor série do mês</Text>
              {LIFTS.map((lift) => (
                <View key={lift} style={styles.liftRow}>
                  <MaterialCommunityIcons color={theme.domain.treino} name="weight-lifter" size={18} />
                  <Text style={styles.liftText}>{lift}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.caption}>
              No cálculo: {decimalText(profile.bodyweightKg)} kg, fórmula {formulaLabel(profile.formula)}. Só você vê
              o seu peso.
            </Text>

            {isEditing ? (
              <View style={styles.editor}>
                {form}
                <Button loading={isSaving} onPress={handleSave} title="Salvar peso" />
                <Button disabled={isSaving} onPress={closeEditor} title="Cancelar" variant="ghost" />
              </View>
            ) : (
              <Button icon="scale-outline" onPress={openEditor} title="Atualizar peso" variant="outline" />
            )}

            <Button loading={isLeaving} onPress={confirmLeave} title="Sair do ranking de força" variant="ghost" />
            {leaveError ? (
              <Text accessibilityLiveRegion="polite" style={styles.error}>
                {leaveError}
              </Text>
            ) : null}
          </View>
        ) : null}

        {category && category.entries.length ? <RankingCard category={category} /> : null}
      </ScrollView>
    </Screen>
  );
}

type StrengthFormProps = {
  errors: FormErrors;
  formula: DotsFormula | null;
  onChangeFormula: (formula: DotsFormula) => void;
  onChangeWeight: (text: string) => void;
  weightHint?: string;
  weightText: string;
};

function StrengthForm({ errors, formula, onChangeFormula, onChangeWeight, weightHint, weightText }: StrengthFormProps) {
  const styles = useStyles();

  return (
    <View style={styles.form}>
      <Input
        error={errors.weight}
        helperText={weightHint}
        keyboardType="decimal-pad"
        label="Seu peso"
        maxLength={6}
        onChangeText={onChangeWeight}
        placeholder="Ex.: 82,5"
        rightText="kg"
        value={weightText}
      />

      <View style={styles.formulaGroup}>
        <Text style={styles.fieldLabel}>Fórmula do DOTS</Text>
        <View accessibilityLabel="Fórmula do DOTS" accessibilityRole="radiogroup" style={styles.formulaRow}>
          {formulas.map((item) => {
            const isSelected = item.value === formula;

            return (
              <Pressable
                accessibilityLabel={`Fórmula ${item.label.toLowerCase()}`}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
                key={item.value}
                onPress={() => onChangeFormula(item.value)}
                style={({ pressed }) => [
                  styles.formulaChip,
                  isSelected ? styles.formulaChipActive : null,
                  pressed ? styles.pressed : null,
                ]}>
                <Text style={[styles.formulaText, isSelected ? styles.formulaTextActive : null]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>
        {errors.formula ? (
          <Text accessibilityLiveRegion="polite" style={styles.error}>
            {errors.formula}
          </Text>
        ) : (
          <Text style={styles.caption}>O DOTS tem coeficientes diferentes para homens e mulheres.</Text>
        )}
      </View>

      {errors.form ? (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          {errors.form}
        </Text>
      ) : null}
    </View>
  );
}

// `category`: undefined quando a temporada não carregou; null quando ela veio sem a força.
function ScoreBox({ category }: { category: SeasonCategory | null | undefined }) {
  const styles = useStyles();

  if (!category) {
    return (
      <View style={styles.scoreBox}>
        <Text style={styles.caption}>
          {category === undefined
            ? 'A pontuação deste mês não carregou agora. Puxe a tela para tentar de novo.'
            : 'A pontuação de força ainda não está disponível neste mês.'}
        </Text>
      </View>
    );
  }

  const { entries, me } = category;
  const score = me.value !== null ? scoreFormat.format(me.value) : null;
  const total = Math.max(entries.length, me.rank ?? 0);
  const rankText = me.rank !== null ? `${me.rank}º de ${total} · ${category.scope}` : null;
  // Sem posição, a dica do servidor diz o que falta; sem pontuação nem dica, fica a nossa.
  const hint =
    me.rank !== null
      ? null
      : (me.hint ?? (score === null ? 'A pontuação aparece com a primeira série de um dos três levantamentos.' : null));

  return (
    <View
      accessibilityLabel={`Seu DOTS neste mês: ${score ?? 'sem pontuação ainda'}.${rankText ? ` ${rankText}.` : ''}${
        hint ? ` ${hint}` : ''
      }`}
      accessible
      style={styles.scoreBox}>
      <Text style={styles.overline}>Seu DOTS neste mês</Text>
      <View style={styles.scoreRow}>
        <Text style={styles.score}>{score ?? '—'}</Text>
        {score ? <Text style={styles.scoreUnit}>pontos</Text> : null}
      </View>
      {rankText ? <Text style={styles.rankText}>{rankText}</Text> : null}
      {hint ? <Text style={styles.caption}>{hint}</Text> : null}
    </View>
  );
}

function PendingBox({ items }: { items: string[] }) {
  const styles = useStyles();
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.pendingBox,
        { backgroundColor: withAlpha(theme.status.warning, 0.1), borderColor: withAlpha(theme.status.warning, 0.4) },
      ]}>
      {items.map((item, index) => (
        <View accessibilityLabel={`${item}, a confirmar`} accessible key={`${index}-${item}`} style={styles.pendingRow}>
          <MaterialCommunityIcons color={theme.status.warning} name="alert-circle-outline" size={16} />
          <Text style={styles.pendingText}>{item}</Text>
          <Text style={[styles.pendingTag, { color: theme.status.warning }]}>a confirmar</Text>
        </View>
      ))}
      <Text style={styles.caption}>Uma marca muito acima das anteriores fica a confirmar e não conta por enquanto.</Text>
    </View>
  );
}

// O placar do mês. Com o DOTS, quem pesa diferente e tem a mesma pontuação fica lado a lado.
function RankingCard({ category }: { category: SeasonCategory }) {
  const styles = useStyles();
  const { theme } = useTheme();
  const top = category.entries.slice(0, MAX_ENTRIES);
  const mine = category.entries.find((entry) => entry.isMe);
  const mineBelow = mine && !top.includes(mine) ? mine : null;

  return (
    <View style={styles.card}>
      <View style={styles.rankingHead}>
        <Text accessibilityRole="header" style={styles.cardTitle}>
          Ranking de força do mês
        </Text>
        <Text style={styles.caption}>{category.scope}</Text>
      </View>
      <View style={styles.board}>
        {top.map((entry) => (
          <EntryRow entry={entry} key={entry.userId} />
        ))}
        {mineBelow ? (
          <>
            <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.gapRow}>
              <MaterialCommunityIcons color={theme.text.muted} name="dots-horizontal" size={18} />
            </View>
            <EntryRow entry={mineBelow} />
          </>
        ) : null}
      </View>
      <Text style={styles.caption}>Só a pontuação aparece aqui. O peso de cada um fica guardado na conta dele.</Text>
    </View>
  );
}

function EntryRow({ entry }: { entry: SeasonEntry }) {
  const styles = useStyles();
  const { theme } = useTheme();
  const value = `${scoreFormat.format(entry.value)} pts`;
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
          <Text style={styles.rankNumber}>{entry.rank}º</Text>
        )}
      </View>
      <Text numberOfLines={1} style={[styles.name, entry.isMe ? styles.nameMe : null]}>
        {entry.isMe ? `${entry.name} (você)` : entry.name}
      </Text>
      <Text style={styles.value}>{value}</Text>
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
  card: {
    backgroundColor: theme.bg.surface,
    borderColor: theme.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  consentCard: {
    borderColor: withAlpha(theme.accent.primary, 0.4),
  },
  cardHead: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  headIcon: {
    alignItems: 'center',
    borderRadius: radius.sm,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  cardTitle: {
    color: theme.text.primary,
    flex: 1,
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
    flexShrink: 1,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  fieldLabel: {
    ...typography.caption,
    color: theme.text.primary,
  },
  form: {
    gap: 14,
  },
  formulaGroup: {
    gap: 8,
  },
  formulaRow: {
    flexDirection: 'row',
    gap: 10,
  },
  formulaChip: {
    alignItems: 'center',
    backgroundColor: theme.bg.raised,
    borderColor: theme.border.subtle,
    borderRadius: radius.pill,
    borderWidth: 1,
    flex: 1,
    height: 44,
    justifyContent: 'center',
  },
  formulaChipActive: {
    backgroundColor: theme.accent.primary,
    borderColor: theme.accent.primary,
  },
  formulaText: {
    color: theme.text.primary,
    fontFamily: fonts.semibold,
    fontSize: 15,
  },
  formulaTextActive: {
    color: theme.accent.onPrimary,
  },
  editor: {
    borderTopColor: theme.border.subtle,
    borderTopWidth: 1,
    gap: 10,
    paddingTop: 14,
  },
  scoreBox: {
    backgroundColor: theme.bg.raised,
    borderRadius: radius.sm,
    gap: 4,
    padding: 14,
  },
  overline: {
    ...typography.overline,
    color: theme.text.muted,
  },
  scoreRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: 8,
  },
  score: {
    color: theme.text.primary,
    fontFamily: fonts.extrabold,
    fontSize: 36,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.6,
    lineHeight: 42,
  },
  scoreUnit: {
    color: theme.text.secondary,
    fontFamily: fonts.semibold,
    fontSize: 15,
  },
  rankText: {
    color: theme.accent.primary,
    fontFamily: fonts.bold,
    fontSize: 14,
  },
  lifts: {
    gap: 8,
  },
  liftRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  liftText: {
    color: theme.text.primary,
    fontFamily: fonts.medium,
    fontSize: 14,
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
  rankingHead: {
    gap: 2,
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
  rankNumber: {
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
  pressed: {
    opacity: 0.75,
  },
}));
