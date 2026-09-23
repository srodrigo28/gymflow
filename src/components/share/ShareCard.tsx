import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

import { AuroraBackground } from '@/src/components/visual/AuroraBackground';
import { fonts, makeStyles, radius, useTheme, withAlpha } from '@/src/theme';
import { formatVolume } from '@/src/utils/format';

/** Proporção 4:5, que é a maior que o Instagram e o WhatsApp mostram sem cortar. */
export const SHARE_WIDTH = 360;
export const SHARE_HEIGHT = 450;

export type ShareContent =
  | { exercise: string; kind: 'recorde'; reps: number; weightKg: number }
  | { cardioMinutes: number; kind: 'semana'; sessionCount: number; volumeKg: number };

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
          <View style={[styles.tag, { backgroundColor: withAlpha(theme.domain.conquista, 0.2) }]}>
            <MaterialCommunityIcons color={theme.domain.conquista} name="trophy" size={14} />
            <Text style={[styles.tagText, { color: theme.domain.conquista }]}>Novo recorde</Text>
          </View>
          <Text numberOfLines={2} style={styles.exercise}>
            {content.exercise}
          </Text>
          <View style={styles.numberRow}>
            <Text style={styles.number}>{String(content.weightKg).replace('.', ',')}</Text>
            <Text style={styles.unit}>kg</Text>
          </View>
          <Text style={styles.detail}>{content.reps} repetições</Text>
        </View>
      ) : (
        <View style={styles.middle}>
          <View style={[styles.tag, { backgroundColor: withAlpha(theme.accent.primary, 0.2) }]}>
            <MaterialCommunityIcons color={theme.accent.primary} name="calendar-check" size={14} />
            <Text style={[styles.tagText, { color: theme.accent.primary }]}>Minha semana</Text>
          </View>
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
