import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

import { AuroraBackground } from '@/src/components/visual/AuroraBackground';
import { fonts, makeStyles, radius, useTheme, withAlpha } from '@/src/theme';
import { formatVolume, monthLabel } from '@/src/utils/format';

/** Proporção 4:5, que é a maior que o Instagram e o WhatsApp mostram sem cortar. */
export const SHARE_WIDTH = 360;
export const SHARE_HEIGHT = 450;

export type ShareContent =
  | { exercise: string; kind: 'recorde'; reps: number; weightKg: number }
  | { cardioMinutes: number; kind: 'semana'; sessionCount: number; volumeKg: number }
  // Semanas seguidas com treino e quantos dias desta semana já têm treino.
  | { daysThisWeek: number; kind: 'sequencia'; weeks: number }
  // Retrospectiva do mês: `month` no formato AAAA-MM.
  | { kind: 'mes'; month: string; prCount: number; sessionCount: number; topMuscle: string | null; volumeKg: number }
  // Troféu da conta (liga ou temporada). `period` já vem pronto para ler ("setembro de 2026").
  | { description: string; kind: 'trofeu'; period: string | null; title: string };

export function ShareCard({ content, name }: { content: ShareContent; name?: string }) {
  const styles = useStyles();
  const { theme } = useTheme();

  return (
    <View style={styles.card}>
      <AuroraBackground />

      <View style={styles.top}>
        <MaterialCommunityIcons color={theme.accent.primary} name="dumbbell" size={20} />
        <Text style={styles.brand}>Gyn Flow</Text>
      </View>

      {content.kind === 'recorde' ? (
        <View style={styles.middle}>
          <Tag color={theme.domain.conquista} icon="trophy" label="Novo recorde" />
          <Text numberOfLines={2} style={styles.exercise}>
            {content.exercise}
          </Text>
          <View style={styles.numberRow}>
            <Text style={styles.number}>{String(content.weightKg).replace('.', ',')}</Text>
            <Text style={styles.unit}>kg</Text>
          </View>
          <Text style={styles.detail}>{content.reps} repetições</Text>
        </View>
      ) : content.kind === 'semana' ? (
        <View style={styles.middle}>
          <Tag color={theme.accent.primary} icon="calendar-check" label="Minha semana" />
          <View style={styles.numberRow}>
            <Text style={styles.number}>{content.sessionCount}</Text>
            <Text style={styles.unit}>{content.sessionCount === 1 ? 'treino' : 'treinos'}</Text>
          </View>
          {/* Zero não entra na imagem: "0 min de cardio" não é conquista para exibir. */}
          <View style={styles.stats}>
            {content.volumeKg > 0 ? <Stat label="volume" value={formatVolume(content.volumeKg)} /> : null}
            {content.cardioMinutes > 0 ? <Stat label="cardio" value={`${content.cardioMinutes} min`} /> : null}
          </View>
        </View>
      ) : content.kind === 'sequencia' ? (
        <View style={styles.middle}>
          <Tag color={theme.domain.conquista} icon="fire" label="Sequência" />
          <View style={styles.numberRow}>
            <Text style={styles.number}>{content.weeks}</Text>
            <Text style={styles.unit}>{content.weeks === 1 ? 'semana seguida' : 'semanas seguidas'}</Text>
          </View>
          <Text style={styles.detail}>
            {content.daysThisWeek > 0
              ? `${content.daysThisWeek} ${content.daysThisWeek === 1 ? 'dia' : 'dias'} de treino nesta semana`
              : 'sem falhar uma semana'}
          </Text>
        </View>
      ) : content.kind === 'trofeu' ? (
        <View style={styles.middle}>
          <Tag color={theme.domain.conquista} icon="trophy" label="Troféu" />
          <MaterialCommunityIcons color={theme.domain.conquista} name="trophy" size={72} style={styles.trophyIcon} />
          <Text numberOfLines={2} style={styles.trophyTitle}>
            {content.title}
          </Text>
          {content.description ? (
            <Text numberOfLines={3} style={styles.trophyDescription}>
              {content.description}
            </Text>
          ) : null}
          {content.period ? <Text style={styles.trophyPeriod}>{content.period}</Text> : null}
        </View>
      ) : (
        <View style={styles.middle}>
          <Tag color={theme.accent.primary} icon="calendar-month" label={`Meu ${monthLabel(content.month)}`} />
          <View style={styles.numberRow}>
            <Text style={styles.number}>{content.sessionCount}</Text>
            <Text style={styles.unit}>{content.sessionCount === 1 ? 'treino' : 'treinos'}</Text>
          </View>
          <View style={styles.stats}>
            {content.volumeKg > 0 ? <Stat label="volume" value={formatVolume(content.volumeKg)} /> : null}
            {content.prCount > 0 ? (
              <Stat label={content.prCount === 1 ? 'recorde' : 'recordes'} value={String(content.prCount)} />
            ) : null}
            {content.topMuscle ? <Stat label="mais treinado" value={content.topMuscle} /> : null}
          </View>
        </View>
      )}

      <View style={styles.bottom}>
        <Text numberOfLines={1} style={styles.name}>
          {name ?? 'Em evolução'}
        </Text>
        <Text style={styles.tagline}>disciplina hoje, resultados sempre</Text>
      </View>
    </View>
  );
}

function Tag({
  color,
  icon,
  label,
}: {
  color: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
}) {
  const styles = useStyles();

  return (
    <View style={[styles.tag, { backgroundColor: withAlpha(color, 0.2) }]}>
      <MaterialCommunityIcons color={color} name={icon} size={14} />
      <Text style={[styles.tagText, { color }]}>{label}</Text>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const styles = useStyles();

  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const useStyles = makeStyles((theme) => ({
  card: {
    backgroundColor: theme.bg.base,
    // Sem cantos arredondados: canto transparente vira preto ou branco quando o app de
    // destino converte a imagem. Quem mostra a prévia arredonda por fora.
    height: SHARE_HEIGHT,
    justifyContent: 'space-between',
    overflow: 'hidden',
    padding: 24,
    width: SHARE_WIDTH,
  },
  top: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  brand: {
    color: theme.text.primary,
    fontFamily: fonts.extrabold,
    fontSize: 16,
    letterSpacing: 0.2,
  },
  middle: {
    gap: 8,
  },
  tag: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tagText: {
    fontFamily: fonts.bold,
    fontSize: 12,
  },
  exercise: {
    color: theme.text.primary,
    fontFamily: fonts.bold,
    fontSize: 20,
    lineHeight: 26,
  },
  numberRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  number: {
    color: theme.text.primary,
    fontFamily: fonts.extrabold,
    fontSize: 72,
    fontVariant: ['tabular-nums'],
    lineHeight: 78,
  },
  unit: {
    color: theme.accent.primary,
    fontFamily: fonts.bold,
    fontSize: 22,
  },
  detail: {
    color: theme.text.secondary,
    fontFamily: fonts.semibold,
    fontSize: 16,
  },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
    marginTop: 4,
  },
  stat: {
    gap: 2,
  },
  statValue: {
    color: theme.text.primary,
    fontFamily: fonts.extrabold,
    fontSize: 22,
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 13,
  },
  // O glifo tem respiro de uns 4 px de cada lado: o recuo alinha a taça com o texto de baixo.
  trophyIcon: {
    marginLeft: -4,
  },
  trophyTitle: {
    color: theme.text.primary,
    fontFamily: fonts.extrabold,
    fontSize: 28,
    letterSpacing: -0.3,
    lineHeight: 34,
  },
  trophyDescription: {
    color: theme.text.secondary,
    fontFamily: fonts.semibold,
    fontSize: 16,
    lineHeight: 22,
  },
  trophyPeriod: {
    color: theme.accent.primary,
    fontFamily: fonts.bold,
    fontSize: 16,
    marginTop: 2,
  },
  bottom: {
    gap: 2,
  },
  name: {
    color: theme.text.primary,
    fontFamily: fonts.bold,
    fontSize: 15,
  },
  tagline: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 12,
  },
}));
