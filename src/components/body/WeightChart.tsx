import { useState } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { fonts, makeStyles, useTheme, withAlpha } from '@/src/theme';
import { formatShortDate } from '@/src/utils/format';

type Point = { takenAt: number; weightKg: number };

const HEIGHT = 140;
const PADDING_Y = 18;
// Recuo lateral do tamanho do ponto: sem ele, a primeira e a última bolinha
// ficam cortadas pela borda do gráfico.
const PADDING_X = 6;

export function WeightChart({ points }: { points: Point[] }) {
  const styles = useStyles();
  const { theme } = useTheme();
  const [width, setWidth] = useState(0);

  if (points.length < 2) {
    return (
      <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={styles.empty}>
        <Text style={styles.emptyText}>
          {points.length === 1
            ? 'Registre outra pesagem para a linha aparecer. Duas já contam uma história.'
            : 'Sem pesagens ainda. A primeira vira o ponto zero da sua evolução.'}
        </Text>
      </View>
    );
  }

  const weights = points.map((point) => point.weightKg);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  // Faixa mínima de 2 kg: sem isso, uma variação de 200 g viraria um pico dramático.
  const span = Math.max(max - min, 2);
  const middle = (max + min) / 2;
  const top = middle + span / 2;

  const usableWidth = Math.max(width - PADDING_X * 2, 1);
  const x = (index: number) => (width <= 0 ? 0 : PADDING_X + (index / (points.length - 1)) * usableWidth);
  const y = (weight: number) => PADDING_Y + ((top - weight) / span) * (HEIGHT - PADDING_Y * 2);

  const line = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${x(index)} ${y(point.weightKg)}`).join(' ');
  const area = `${line} L ${x(points.length - 1)} ${HEIGHT} L ${x(0)} ${HEIGHT} Z`;
  const last = points.at(-1)!;

  return (
    <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={styles.wrapper}>
      {width > 0 ? (
        <Svg height={HEIGHT} width={width}>
          <Defs>
            <LinearGradient id="peso" x1="0" x2="0" y1="0" y2="1">
              <Stop offset="0" stopColor={theme.accent.primary} stopOpacity={0.28} />
              <Stop offset="1" stopColor={theme.accent.primary} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Path d={area} fill="url(#peso)" />
          <Path
            d={line}
            fill="none"
            stroke={theme.accent.primary}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
          />
          {points.map((point, index) => (
            <Circle
              cx={x(index)}
              cy={y(point.weightKg)}
              fill={index === points.length - 1 ? theme.accent.primary : theme.bg.surface}
              key={point.takenAt}
              r={index === points.length - 1 ? 5 : 3}
              stroke={theme.accent.primary}
              strokeWidth={1.5}
            />
          ))}
        </Svg>
      ) : (
        <View style={{ height: HEIGHT }} />
      )}

      <View style={styles.axis}>
        <Text style={styles.axisText}>{formatShortDate(points[0].takenAt)}</Text>
        <Text style={[styles.axisText, { color: withAlpha(theme.accent.primary, 0.95) }]}>
          {last.weightKg.toFixed(1).replace('.', ',')} kg
        </Text>
        <Text style={styles.axisText}>{formatShortDate(last.takenAt)}</Text>
      </View>
    </View>
  );
}

const useStyles = makeStyles((theme) => ({
  wrapper: {
    gap: 4,
    width: '100%',
  },
  axis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  axisText: {
    color: theme.text.muted,
    fontFamily: fonts.semibold,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
  empty: {
    justifyContent: 'center',
    minHeight: 84,
    width: '100%',
  },
  emptyText: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
}));
