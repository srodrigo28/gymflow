import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

import { fonts, makeStyles, radius, useTheme, withAlpha } from '@/src/theme';
import type { CoachingPermissions, StudentSummary } from '@/src/types/coaching';

// Os números de um aluno no painel do personal: a semana contra a meta, o mês, a evolução e o selo de
// quem está há 7 dias ou mais sem treinar. Serve à lista de alunos e ao detalhe de cada um.

const decimalFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1, minimumFractionDigits: 1 });
// Mais que isso não cabe numa linha e não diz nada a mais: a semana tem 7 dias.
const MAX_DOTS = 7;

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/** "+4,3%": a evolução é uma mudança ("subiu tanto"), então vai sempre com sinal. */
export function signedPercent(value: number) {
  const rounded = Math.round(value * 10) / 10;
  const sign = rounded > 0 ? '+' : rounded < 0 ? '−' : '';

  return `${sign}${decimalFormat.format(Math.abs(rounded))}%`;
}

/** "Compartilha treinos e medidas": o que o aluno liberou, nas palavras dele. */
export function sharingText(permissions: CoachingPermissions) {
  const parts = [
    permissions.shareWorkouts ? 'treinos' : null,
    permissions.shareMeasurements ? 'medidas' : null,
    permissions.sharePhotos ? 'fotos' : null,
  ].filter((part): part is string => part !== null);

  if (!parts.length) {
    return 'Não compartilha nada com você por enquanto';
  }

  const list = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} e ${parts[parts.length - 1]}`;

  return `Compartilha ${list}`;
}

/** Sem culpa: só o fato, sem "sumiu" nem "faltou". */
export function missingText(inactiveDays: number | null) {
  return inactiveDays === null
    ? 'Ainda sem treino concluído na conta'
    : `Está há ${plural(inactiveDays, 'dia', 'dias')} sem treinar`;
}

function weekText(weekDays: number, goalDays: number | null) {
  return goalDays === null
    ? `${plural(weekDays, 'dia', 'dias')} com treino nesta semana`
    : `${weekDays} de ${plural(goalDays, 'dia', 'dias')} da meta nesta semana`;
}

/** Tudo o que o bloco mostra, numa frase para o leitor de tela. */
export function statsSpoken(student: StudentSummary) {
  if (student.weekDays === null) {
    return 'Não compartilha os treinos com você.';
  }

  const parts = [
    student.missing ? missingText(student.inactiveDays) : null,
    weekText(student.weekDays, student.goalDays),
    student.monthDays !== null ? `${plural(student.monthDays, 'dia', 'dias')} com treino no mês` : null,
    student.monthProgress !== null ? `evolução do mês de ${signedPercent(student.monthProgress)}` : null,
  ].filter((part): part is string => part !== null);

  return `${parts.join('. ')}.`;
}

export function StudentStats({ student }: { student: StudentSummary }) {
  const styles = useStyles();
  const { theme } = useTheme();

  if (student.weekDays === null) {
    return (
      <View accessibilityLabel={statsSpoken(student)} accessible style={styles.row}>
        <MaterialCommunityIcons color={theme.text.muted} name="eye-off-outline" size={16} />
        <Text style={styles.muted}>Não compartilha os treinos com você.</Text>
      </View>
    );
  }

  const { goalDays, monthDays, monthProgress, weekDays } = student;
  const dots = Math.min(MAX_DOTS, Math.max(goalDays ?? 0, weekDays));
  const progressColor = monthProgress !== null && monthProgress > 0 ? theme.status.success : theme.text.secondary;

  return (
    <View accessibilityLabel={statsSpoken(student)} accessible style={styles.stats}>
      {student.missing ? (
        <View style={[styles.badge, { backgroundColor: withAlpha(theme.status.warning, 0.14) }]}>
          <MaterialCommunityIcons color={theme.status.warning} name="clock-outline" size={14} />
          <Text style={[styles.badgeText, { color: theme.status.warning }]}>{missingText(student.inactiveDays)}</Text>
        </View>
      ) : null}

      <View style={styles.row}>
        {dots > 0 ? (
          <View style={styles.dots}>
            {Array.from({ length: dots }, (_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  index < weekDays ? { backgroundColor: theme.domain.treino, borderColor: theme.domain.treino } : null,
                ]}
              />
            ))}
          </View>
        ) : null}
        <Text style={styles.value}>{weekText(weekDays, goalDays)}</Text>
      </View>

      <View style={styles.chips}>
        {monthDays !== null ? (
          <View style={styles.chip}>
            <MaterialCommunityIcons color={theme.text.secondary} name="calendar-check" size={14} />
            <Text style={styles.chipText}>{plural(monthDays, 'dia', 'dias')} no mês</Text>
          </View>
        ) : null}
        {monthProgress !== null ? (
          <View style={styles.chip}>
            <MaterialCommunityIcons
              color={progressColor}
              name={monthProgress < 0 ? 'trending-down' : 'trending-up'}
              size={14}
            />
            <Text style={styles.chipText}>
              Evolução do mês <Text style={[styles.chipStrong, { color: progressColor }]}>{signedPercent(monthProgress)}</Text>
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const useStyles = makeStyles((theme) => ({
  stats: {
    gap: 8,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  muted: {
    color: theme.text.muted,
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 18,
  },
  badge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontFamily: fonts.bold,
    fontSize: 12,
  },
  dots: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    borderColor: theme.border.strong,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    height: 12,
    width: 12,
  },
  value: {
    color: theme.text.primary,
    flexShrink: 1,
    fontFamily: fonts.semibold,
    fontSize: 13,
    lineHeight: 18,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    alignItems: 'center',
    backgroundColor: theme.bg.raised,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipText: {
    color: theme.text.secondary,
    fontFamily: fonts.medium,
    fontSize: 12,
  },
  chipStrong: {
    fontFamily: fonts.bold,
    fontVariant: ['tabular-nums'],
  },
}));
