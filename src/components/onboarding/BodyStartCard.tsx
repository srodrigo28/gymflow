import { Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

import { spacing } from '@/src/constants/spacing';
import { fonts, makeStyles, radius, useTheme, withAlpha, type Theme } from '@/src/theme';

// A faixa desenhada vai de 15 a 40: cobre quase todo mundo sem espremer o marcador.
const SCALE_MIN = 15;
const SCALE_MAX = 40;

// Alturas que a silhueta representa. Fora disso ela para de crescer.
const HEIGHT_MIN = 140;
const HEIGHT_MAX = 200;

const AREA_WIDTH = 96;
const AREA_HEIGHT = 128;
const BASELINE = 120;
const RULER_X = 10;

type Zone = {
  color: (theme: Theme) => string;
  from: number;
  label: string;
  to: number;
};

// Faixas da OMS, com nomes que descrevem em vez de julgar. O `from`/`to` também
// define a largura de cada trecho da barra, para o marcador cair na cor certa.
const zones: Zone[] = [
  { color: (theme) => theme.status.info, from: SCALE_MIN, label: 'abaixo do peso', to: 18.5 },
  { color: (theme) => theme.status.success, from: 18.5, label: 'peso saudável', to: 25 },
  { color: (theme) => theme.status.warning, from: 25, label: 'acima do peso', to: 30 },
  { color: (theme) => theme.status.danger, from: 30, label: 'bem acima do peso', to: SCALE_MAX },
];

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const comma = (value: number, digits = 1) => value.toFixed(digits).replace('.', ',');

export function BodyStartCard({ heightCm, weightKg }: { heightCm?: number; weightKg?: number }) {
  const styles = useStyles();
  const { theme } = useTheme();

  const bmi = weightKg && heightCm ? weightKg / (heightCm / 100) ** 2 : undefined;
  const zone = bmi === undefined ? undefined : (zones.find((item) => bmi < item.to) ?? zones.at(-1)!);
  const zoneColor = zone ? zone.color(theme) : theme.text.muted;
  const markerPercent =
    bmi === undefined ? 0 : ((clamp(bmi, SCALE_MIN, SCALE_MAX) - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * 100;

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Silhouette bmi={bmi} heightCm={heightCm} />

        <View style={styles.info}>
          {bmi === undefined ? (
            <>
              <Text style={styles.waitingTitle}>Seu ponto de partida</Text>
              <Text style={styles.waitingText}>
                Preencha peso e altura para ver de onde você está saindo. É a foto do dia 1 — daqui a um
                mês ela muda.
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.label}>Seu IMC hoje</Text>
              <View style={styles.valueRow}>
                <Text style={styles.value}>{comma(bmi)}</Text>
                <View style={[styles.zonePill, { backgroundColor: withAlpha(zoneColor, 0.18) }]}>
                  <Text style={[styles.zoneText, { color: zoneColor }]}>{zone?.label}</Text>
                </View>
              </View>

              <View style={styles.track}>
                {zones.map((item, index) => (
                  <View
                    key={item.label}
                    style={[
                      index === 0 ? styles.trackStart : null,
                      index === zones.length - 1 ? styles.trackEnd : null,
                      {
                        backgroundColor: withAlpha(item.color(theme), item === zone ? 0.9 : 0.2),
                        flexGrow: item.to - item.from,
                        height: '100%',
                      },
                    ]}
                  />
                ))}
                <View style={[styles.marker, { borderColor: zoneColor, left: `${markerPercent}%` }]} />
              </View>

              {/* Os números ficam no fim de cada faixa, então caem em cima da divisão. */}
              <View style={styles.ticks}>
                {zones.map((item, index) => (
                  <Text key={item.label} style={[styles.tickText, { flexGrow: item.to - item.from }]}>
                    {index < zones.length - 1 ? comma(item.to, item.to % 1 ? 1 : 0) : ''}
                  </Text>
                ))}
              </View>
            </>
          )}
        </View>
      </View>

      <Text style={styles.footnote}>{footnote(zone)}</Text>
    </View>
  );
}


// A ressalva muda com a faixa: falar de músculo só faz sentido para quem o IMC
// aponta acima, que é justamente quem treina pesado e cai ali sem gordura extra.
function footnote(zone?: Zone) {
  if (!zone) {
    return 'Nada aqui é nota nem julgamento: são dois números para medir a sua evolução, não a dos outros.';
  }

  if (zone.from >= 25) {
    return 'O IMC não separa músculo de gordura: quem treina pesado costuma aparecer acima. É o ponto de partida — o que conta é a evolução mês a mês.';
  }

  return 'O IMC é um retrato do dia 1, não uma meta. O que conta é a evolução mês a mês, comparada com você mesmo.';
}

/**
 * Silhueta ao lado de uma régua: a figura cresce com a altura digitada e engrossa
 * de leve com o IMC. A variação é discreta de propósito — a pessoa precisa se
 * reconhecer, não virar caricatura —, e a cor é sempre a do app, nunca a da
 * faixa de peso, para o desenho não virar um veredito.
 */
function Silhouette({ bmi, heightCm }: { bmi?: number; heightCm?: number }) {
  const styles = useStyles();
  const { theme } = useTheme();

  const ratio = heightCm ? (clamp(heightCm, HEIGHT_MIN, HEIGHT_MAX) - HEIGHT_MIN) / (HEIGHT_MAX - HEIGHT_MIN) : 0.45;
  const height = 74 + ratio * 30;
  const width = bmi === undefined ? 1 : clamp(0.88 + (clamp(bmi, 17, 35) - 22) / 42, 0.86, 1.22);

  const top = BASELINE - height;
  const centerX = RULER_X + 12 + (AREA_WIDTH - RULER_X - 12) / 2;

  const headRadius = height * 0.058;
  const headY = top + height * 0.072;
  const shoulderY = top + height * 0.175;
  const waistY = top + height * 0.35;
  const hipY = top + height * 0.47;
  const shoulderHalf = height * 0.115 * width;
  const waistHalf = height * 0.082 * width;
  const hipHalf = height * 0.098 * width;
  const armWidth = height * 0.042 * width;
  const legWidth = height * 0.074 * width;

  const drawn = bmi !== undefined;
  const tint = theme.accent.primary;
  // Preenchida, a silhueta usa a mesma cor no contorno: braços, pernas e tronco
  // se sobrepõem sem deixar emenda à vista.
  const fill = drawn ? tint : 'transparent';
  const stroke = drawn ? tint : withAlpha(theme.text.muted, 0.6);
  const strokeWidth = 1.4;

  return (
    <View style={styles.figure}>
      <Svg height={AREA_HEIGHT} width={AREA_WIDTH}>
        {/* Régua. O tracejado marca a altura informada. */}
        <Line stroke={withAlpha(theme.text.muted, 0.3)} strokeWidth={1} x1={RULER_X} x2={RULER_X} y1={8} y2={BASELINE} />
        {[0, 1, 2, 3, 4, 5, 6].map((index) => (
          <Line
            key={index}
            stroke={withAlpha(theme.text.muted, 0.3)}
            strokeWidth={1}
            x1={RULER_X}
            x2={RULER_X + (index % 2 === 0 ? 6 : 3)}
            y1={8 + ((BASELINE - 8) / 6) * index}
            y2={8 + ((BASELINE - 8) / 6) * index}
          />
        ))}
        <Line
          stroke={withAlpha(theme.text.muted, 0.45)}
          strokeWidth={1}
          x1={RULER_X}
          x2={AREA_WIDTH - 4}
          y1={BASELINE}
          y2={BASELINE}
        />
        {heightCm ? (
          <Line
            stroke={withAlpha(tint, 0.55)}
            strokeDasharray="3 3"
            strokeWidth={1}
            x1={RULER_X}
            x2={AREA_WIDTH - 4}
            y1={top}
            y2={top}
          />
        ) : null}

        {/* Braços ao lado do corpo. */}
        <Rect
          fill={fill}
          height={hipY + height * 0.08 - shoulderY}
          rx={armWidth / 2}
          stroke={stroke}
          strokeWidth={strokeWidth}
          width={armWidth}
          x={centerX - shoulderHalf - armWidth * 0.75}
          y={shoulderY + height * 0.015}
        />
        <Rect
          fill={fill}
          height={hipY + height * 0.08 - shoulderY}
          rx={armWidth / 2}
          stroke={stroke}
          strokeWidth={strokeWidth}
          width={armWidth}
          x={centerX + shoulderHalf - armWidth * 0.25}
          y={shoulderY + height * 0.015}
        />

        {/* Pernas, com uma folga no meio. */}
        <Rect
          fill={fill}
          height={BASELINE - hipY + height * 0.03}
          rx={legWidth / 2}
          stroke={stroke}
          strokeWidth={strokeWidth}
          width={legWidth}
          x={centerX - legWidth - height * 0.008}
          y={hipY - height * 0.03}
        />
        <Rect
          fill={fill}
          height={BASELINE - hipY + height * 0.03}
          rx={legWidth / 2}
          stroke={stroke}
          strokeWidth={strokeWidth}
          width={legWidth}
          x={centerX + height * 0.008}
          y={hipY - height * 0.03}
        />

        {/* Tronco: ombros, cintura e quadril. */}
        <Path
          d={`M ${centerX - shoulderHalf} ${shoulderY + height * 0.02}
              Q ${centerX - shoulderHalf} ${shoulderY - height * 0.01} ${centerX - shoulderHalf * 0.55} ${shoulderY - height * 0.015}
              L ${centerX + shoulderHalf * 0.55} ${shoulderY - height * 0.015}
              Q ${centerX + shoulderHalf} ${shoulderY - height * 0.01} ${centerX + shoulderHalf} ${shoulderY + height * 0.02}
              L ${centerX + waistHalf} ${waistY}
              L ${centerX + hipHalf} ${hipY}
              Q ${centerX} ${hipY + height * 0.035} ${centerX - hipHalf} ${hipY}
              L ${centerX - waistHalf} ${waistY}
              Z`}
          fill={fill}
          stroke={stroke}
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
        />

        {/* Pescoço e cabeça. */}
        <Rect
          fill={fill}
          height={height * 0.05}
          width={height * 0.05}
          x={centerX - height * 0.025}
          y={headY + headRadius * 0.6}
        />
        <Circle cx={centerX} cy={headY} fill={fill} r={headRadius} stroke={stroke} strokeWidth={strokeWidth} />
      </Svg>

    </View>
  );
}

const useStyles = makeStyles((theme) => ({
  card: {
    backgroundColor: theme.bg.surface,
    borderColor: theme.bg.high,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  figure: {
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: 8,
    justifyContent: 'center',
  },
  label: {
    color: theme.text.secondary,
    fontFamily: fonts.semibold,
    fontSize: 13,
  },
  valueRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  value: {
    color: theme.text.primary,
    fontFamily: fonts.extrabold,
    fontSize: 30,
    fontVariant: ['tabular-nums'],
    lineHeight: 34,
  },
  zonePill: {
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  zoneText: {
    fontFamily: fonts.bold,
    fontSize: 12,
  },
  track: {
    backgroundColor: theme.bg.raised,
    borderRadius: radius.pill,
    flexDirection: 'row',
    height: 10,
    marginTop: 6,
  },
  trackStart: {
    borderBottomLeftRadius: radius.pill,
    borderTopLeftRadius: radius.pill,
  },
  trackEnd: {
    borderBottomRightRadius: radius.pill,
    borderTopRightRadius: radius.pill,
  },
  marker: {
    backgroundColor: theme.text.primary,
    borderRadius: radius.pill,
    borderWidth: 3,
    height: 18,
    marginLeft: -9,
    position: 'absolute',
    top: -4,
    width: 18,
  },
  ticks: {
    flexDirection: 'row',
    marginTop: 2,
  },
  tickText: {
    color: theme.text.muted,
    flexBasis: 0,
    fontFamily: fonts.regular,
    fontSize: 10,
    fontVariant: ['tabular-nums'],
    marginRight: -6,
    textAlign: 'right',
  },
  waitingTitle: {
    color: theme.text.primary,
    fontFamily: fonts.extrabold,
    fontSize: 16,
  },
  waitingText: {
    color: theme.text.secondary,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 19,
  },
  footnote: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 17,
  },
}));
