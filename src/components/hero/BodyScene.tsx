import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useId } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInUp,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';

import { clamp, type SceneProps } from '@/src/components/hero/stage';
import { GlassChip } from '@/src/components/visual/GlassChip';
import { OutlineWord } from '@/src/components/visual/OutlineWord';
import { fonts, makeStyles, radius, typography, useTheme, withAlpha } from '@/src/theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Carga semanal ilustrativa: de 45 para 53 kg, os mesmos +18% de força da cena 1.
const weeklyLoad = [45, 45.5, 47, 48, 49, 50.5, 51.5, 53];
const gain = Math.round((weeklyLoad[weeklyLoad.length - 1] / weeklyLoad[0] - 1) * 100);

// Cena 2: gráfico de carga subindo semana a semana, com recorde e medidas.
export function BodyScene({ isShort, stage }: SceneProps) {
  const styles = useStyles();
  const { theme } = useTheme();
  const cardWidth = Math.min(stage.width - 56, 330);
  const cardHeight = Math.round(clamp(stage.height * 0.62, 150, 230));
  const cardLeft = (stage.width - cardWidth) / 2;
  const cardTop = Math.max((stage.height - cardHeight) / 2 - stage.height * 0.06, 18);
  const wordWidth = stage.width * 0.94;

  return (
    <View
      accessibilityLabel={`Exemplo do gráfico do corpo: carga no agachamento subindo de ${weeklyLoad[0]} para ${weeklyLoad[weeklyLoad.length - 1]} quilos em 8 semanas, mais ${gain} por cento, com um novo recorde.`}
      accessible
      style={styles.fill}>
      <Animated.View
        entering={FadeIn.delay(80).duration(700)}
        style={[styles.absolute, { bottom: stage.height * 0.04, left: (stage.width - wordWidth) / 2 }]}>
        <OutlineWord width={wordWidth} word="CORPO" />
      </Animated.View>

      <Animated.View
        entering={FadeInUp.duration(450)}
        style={[styles.card, { height: cardHeight, left: cardLeft, top: cardTop, width: cardWidth }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconBubble, { backgroundColor: withAlpha(theme.domain.treino, 0.16) }]}>
            <MaterialCommunityIcons color={theme.domain.treino} name="weight-lifter" size={18} />
          </View>
          <View style={styles.cardTitleGroup}>
            <Text numberOfLines={1} style={styles.cardTitle}>
              Carga no agachamento
            </Text>
            <Text style={styles.cardSubtitle}>últimas 8 semanas</Text>
          </View>
          <Text style={[styles.gain, { color: theme.domain.treino }]}>+{gain}%</Text>
        </View>

        <LoadChart height={cardHeight - 92} width={cardWidth - 28} />

        <View style={styles.axis}>
          <Text style={styles.axisLabel}>Sem 1</Text>
          <Text style={styles.axisLabel}>Sem 8</Text>
        </View>
      </Animated.View>

      <Animated.View
        entering={ZoomIn.delay(600).springify().damping(14)}
        style={[styles.absolute, { right: cardLeft - 8, top: cardTop - 18 }]}>
        <GlassChip domain="conquista" float icon="trophy" label={`Novo recorde: ${weeklyLoad[weeklyLoad.length - 1]} kg`} />
      </Animated.View>
      {isShort ? null : (
        <Animated.View
          entering={ZoomIn.delay(750).springify().damping(14)}
          // Encosta só na borda do cartão, sem cobrir os rótulos do eixo.
          style={[styles.absolute, { left: cardLeft - 8, top: cardTop + cardHeight - 6 }]}>
          <GlassChip domain="treino" float floatDelay={700} icon="resize" label="Medidas atualizadas" />
        </Animated.View>
      )}
    </View>
  );
}

// Gráfico de área com curva suave; a linha se desenha e o último ponto pulsa ao entrar.
function LoadChart({ height, width }: { height: number; width: number }) {
  const { theme } = useTheme();
  const gradientId = `load${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const draw = useSharedValue(0);
  const color = theme.domain.treino;
  const padding = 10;
  const min = Math.min(...weeklyLoad) - 2;
  const max = Math.max(...weeklyLoad) + 1;

  const points = weeklyLoad.map((value, index) => ({
    x: padding + (index / (weeklyLoad.length - 1)) * (width - padding * 2),
    y: padding + (1 - (value - min) / (max - min)) * (height - padding * 2),
  }));

  // Curva suave: pontos de controle na metade horizontal de cada trecho.
  const linePath = points.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;
    const previous = points[index - 1];
    const midX = (previous.x + point.x) / 2;
    return `${path} C ${midX} ${previous.y} ${midX} ${point.y} ${point.x} ${point.y}`;
  }, '');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;
  const lastPoint = points[points.length - 1];
  // Comprimento aproximado da curva (soma das cordas com folga) para o traço se desenhar.
  const lineLength =
    points.reduce((total, point, index) => {
      if (index === 0) return 0;
      const previous = points[index - 1];
      return total + Math.hypot(point.x - previous.x, point.y - previous.y);
    }, 0) * 1.08;

  useEffect(() => {
    draw.value = withDelay(200, withTiming(1, { duration: 1100, easing: Easing.out(Easing.cubic) }));
  }, [draw]);

  const lineProps = useAnimatedProps(() => ({
    strokeDashoffset: lineLength * (1 - draw.value),
  }));
  const areaProps = useAnimatedProps(() => ({
    fillOpacity: draw.value,
  }));
  const dotProps = useAnimatedProps(() => ({
    r: draw.value < 0.95 ? 0 : 5,
  }));
  const haloProps = useAnimatedProps(() => ({
    r: draw.value < 0.95 ? 0 : 11,
  }));

  return (
    <Svg height={height} width={width}>
      <Defs>
        <LinearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity={0.32} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      {[0.25, 0.5, 0.75].map((fraction) => (
        <Line
          key={fraction}
          stroke={theme.border.subtle}
          strokeWidth={1}
          x1={0}
          x2={width}
          y1={height * fraction}
          y2={height * fraction}
        />
      ))}
      <AnimatedPath animatedProps={areaProps} d={areaPath} fill={`url(#${gradientId})`} />
      <AnimatedPath
        animatedProps={lineProps}
        d={linePath}
        fill="none"
        stroke={color}
        strokeDasharray={`${lineLength} ${lineLength}`}
        strokeLinecap="round"
        strokeWidth={3}
      />
      <AnimatedCircle animatedProps={haloProps} cx={lastPoint.x} cy={lastPoint.y} fill={withAlpha(color, 0.22)} />
      <AnimatedCircle animatedProps={dotProps} cx={lastPoint.x} cy={lastPoint.y} fill={color} />
    </Svg>
  );
}

const useStyles = makeStyles((theme) => ({
  fill: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  absolute: {
    position: 'absolute',
  },
  card: {
    backgroundColor: theme.bg.overlay,
    borderColor: theme.border.strong,
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: 8,
    padding: 14,
    position: 'absolute',
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  iconBubble: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  cardTitleGroup: {
    flex: 1,
  },
  cardTitle: {
    color: theme.text.primary,
    fontFamily: fonts.bold,
    fontSize: 14,
  },
  cardSubtitle: {
    ...typography.caption,
    color: theme.text.muted,
    fontSize: 12,
  },
  gain: {
    fontFamily: fonts.extrabold,
    fontSize: 22,
    fontVariant: ['tabular-nums'],
  },
  axis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  axisLabel: {
    color: theme.text.muted,
    fontFamily: fonts.medium,
    fontSize: 11,
  },
}));
