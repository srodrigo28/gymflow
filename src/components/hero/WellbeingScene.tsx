import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  ZoomIn,
  type SharedValue,
} from 'react-native-reanimated';

import { clamp, type SceneProps } from '@/src/components/hero/stage';
import { GlassChip } from '@/src/components/visual/GlassChip';
import { OutlineWord } from '@/src/components/visual/OutlineWord';
import { fonts, makeStyles, radius, typography, useTheme, withAlpha, type DomainName } from '@/src/theme';

// Valores ilustrativos: semana de sono, água de hoje e humor na escala de 1 a 5.
type Tile = {
  domain: DomainName;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
} & (
  | { kind: 'bars'; week: number[] }
  | { kind: 'level'; level: number }
  | { kind: 'scale'; score: number }
);

const tiles: Tile[] = [
  { domain: 'sono', icon: 'moon', kind: 'bars', label: 'de sono', value: '7h40', week: [0.55, 0.7, 0.5, 0.8, 0.72, 0.92, 0.85] },
  { domain: 'agua', icon: 'water', kind: 'level', label: 'de água hoje', level: 0.7, value: '2,1 L' },
  { domain: 'mente', icon: 'happy', kind: 'scale', label: 'de humor', score: 4, value: 'Bem' },
];

const GAP = 10;

// Cena 3: sono, água e humor, cada um na cor do seu domínio.
export function WellbeingScene({ isShort, stage }: SceneProps) {
  const styles = useStyles();
  const tileWidth = Math.min((stage.width - 40 - GAP * 2) / 3, 118);
  const tileHeight = Math.round(clamp(stage.height * 0.56, 140, 196));
  const rowWidth = tileWidth * 3 + GAP * 2;
  const rowTop = Math.max((stage.height - tileHeight) / 2 - stage.height * 0.05, 26);
  const wordWidth = stage.width * 0.94;

  return (
    <View
      accessibilityLabel="Exemplo do painel de bem-estar: 7 horas e 40 minutos de sono, 2,1 litros de água hoje e humor bom."
      accessible
      style={styles.fill}>
      <Animated.View
        entering={FadeIn.delay(80).duration(700)}
        style={[styles.absolute, { bottom: stage.height * 0.04, left: (stage.width - wordWidth) / 2 }]}>
        <OutlineWord width={wordWidth} word="MENTE" />
      </Animated.View>

      <View style={[styles.row, { gap: GAP, left: (stage.width - rowWidth) / 2, top: rowTop }]}>
        {tiles.map((tile, index) => (
          <Animated.View
            entering={FadeInUp.delay(index * 90).duration(450)}
            key={tile.domain}
            // O cartão do meio sobe um pouco, para a fileira não ficar rígida.
            style={index === 1 ? { marginTop: -18 } : null}>
            <WellbeingTile delay={300 + index * 120} height={tileHeight} tile={tile} width={tileWidth} />
          </Animated.View>
        ))}
      </View>

      {isShort ? null : (
        <Animated.View
          entering={ZoomIn.delay(700).springify().damping(14)}
          style={[styles.absolute, { right: (stage.width - rowWidth) / 2 - 6, top: rowTop - 40 }]}>
          <GlassChip domain="conquista" float icon="sparkles" label="Semana equilibrada" />
        </Animated.View>
      )}
    </View>
  );
}

function WellbeingTile({ delay, height, tile, width }: { delay: number; height: number; tile: Tile; width: number }) {
  const styles = useStyles();
  const { theme } = useTheme();
  const color = theme.domain[tile.domain];

  return (
    <View style={[styles.tile, { height, width }]}>
      <View style={[styles.iconBubble, { backgroundColor: withAlpha(color, 0.18) }]}>
        <Ionicons color={color} name={tile.icon} size={16} />
      </View>
      <Text adjustsFontSizeToFit numberOfLines={1} style={styles.value}>
        {tile.value}
      </Text>
      <Text numberOfLines={2} style={styles.label}>
        {tile.label}
      </Text>
      <View style={styles.viz}>
        {tile.kind === 'bars' ? <WeekBars color={color} delay={delay} week={tile.week} /> : null}
        {tile.kind === 'level' ? <LevelFill color={color} delay={delay} level={tile.level} /> : null}
        {tile.kind === 'scale' ? <ScaleDots color={color} delay={delay} score={tile.score} /> : null}
      </View>
    </View>
  );
}

function useGrow(delay: number) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(delay, withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }));
  }, [delay, progress]);

  return progress;
}

// Barras da semana crescendo de baixo para cima.
function WeekBars({ color, delay, week }: { color: string; delay: number; week: number[] }) {
  const styles = useStyles();
  const progress = useGrow(delay);

  return (
    <View style={styles.bars}>
      {week.map((value, index) => (
        <GrowingBar
          color={index === week.length - 1 ? color : withAlpha(color, 0.45)}
          key={index}
          progress={progress}
          value={value}
        />
      ))}
    </View>
  );
}

function GrowingBar({
  color,
  progress,
  value,
}: {
  color: string;
  progress: SharedValue<number>;
  value: number;
}) {
  const styles = useStyles();
  const animatedStyle = useAnimatedStyle(() => ({
    height: `${value * progress.value * 100}%`,
  }));

  return (
    <View style={styles.barTrack}>
      <Animated.View style={[styles.bar, { backgroundColor: color }, animatedStyle]} />
    </View>
  );
}

// Cápsula enchendo até o nível do dia.
function LevelFill({ color, delay, level }: { color: string; delay: number; level: number }) {
  const styles = useStyles();
  const progress = useGrow(delay);
  const animatedStyle = useAnimatedStyle(() => ({
    height: `${level * progress.value * 100}%`,
  }));

  return (
    <View style={[styles.capsule, { borderColor: withAlpha(color, 0.35) }]}>
      <Animated.View style={[styles.capsuleFill, { backgroundColor: withAlpha(color, 0.85) }, animatedStyle]} />
    </View>
  );
}

// Escala de 1 a 5 pontos, acendendo um a um.
function ScaleDots({ color, delay, score }: { color: string; delay: number; score: number }) {
  const styles = useStyles();

  return (
    <View style={styles.dots}>
      {[1, 2, 3, 4, 5].map((step) => (
        <Animated.View
          entering={ZoomIn.delay(delay + step * 90)}
          key={step}
          style={[styles.dot, { backgroundColor: step <= score ? color : withAlpha(color, 0.18) }]}
        />
      ))}
    </View>
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
  row: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    position: 'absolute',
  },
  tile: {
    backgroundColor: theme.bg.overlay,
    borderColor: theme.border.strong,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: 4,
    padding: 12,
  },
  iconBubble: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 30,
    justifyContent: 'center',
    marginBottom: 4,
    width: 30,
  },
  value: {
    color: theme.text.primary,
    fontFamily: fonts.extrabold,
    fontSize: 22,
    fontVariant: ['tabular-nums'],
  },
  label: {
    ...typography.caption,
    color: theme.text.muted,
    fontSize: 11,
    lineHeight: 14,
  },
  viz: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingTop: 6,
  },
  bars: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 3,
    height: '100%',
    maxHeight: 44,
  },
  barTrack: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
  },
  bar: {
    borderRadius: radius.pill,
    width: '100%',
  },
  capsule: {
    alignSelf: 'flex-start',
    borderRadius: radius.md,
    borderWidth: 1,
    height: '100%',
    justifyContent: 'flex-end',
    maxHeight: 44,
    overflow: 'hidden',
    padding: 3,
    width: 26,
  },
  capsuleFill: {
    borderRadius: radius.sm,
    width: '100%',
  },
  dots: {
    flexDirection: 'row',
    gap: 5,
    paddingBottom: 4,
  },
  dot: {
    borderRadius: radius.pill,
    height: 10,
    width: 10,
  },
}));
