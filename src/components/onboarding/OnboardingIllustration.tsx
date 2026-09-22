import Svg, { Circle, Defs, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

import { useTheme } from '@/src/theme';

type IllustrationName =
  | 'welcome'
  | 'sex'
  | 'work'
  | 'training'
  | 'metrics'
  | 'sleep'
  | 'history'
  | 'nutrition'
  | 'photos'
  | 'summary';

type IllustrationColors = {
  accent: string;
  backdrop: string;
  ink: string;
  onAccent: string;
  plate: string;
};

type OnboardingIllustrationProps = {
  compact?: boolean;
  name: IllustrationName;
};

export function OnboardingIllustration({ compact = false, name }: OnboardingIllustrationProps) {
  const { theme } = useTheme();
  const c: IllustrationColors = {
    accent: theme.accent.primary,
    backdrop: theme.bg.surface,
    ink: theme.text.primary,
    onAccent: theme.accent.onPrimary,
    plate: theme.bg.raised,
  };

  return (
    <Svg width="100%" height={compact ? 104 : 148} viewBox="0 0 320 180">
      <Defs />
      <Circle cx="160" cy="90" r="78" fill={c.backdrop} />
      <Circle cx="92" cy="48" r="10" fill={c.accent} opacity={0.28} />
      <Circle cx="235" cy="138" r="14" fill={c.accent} opacity={0.18} />

      {name === 'welcome' ? <Welcome c={c} /> : null}
      {name === 'sex' ? <Sex c={c} /> : null}
      {name === 'work' ? <Work c={c} /> : null}
      {name === 'training' ? <Training c={c} /> : null}
      {name === 'metrics' ? <Metrics c={c} /> : null}
      {name === 'sleep' ? <Sleep c={c} /> : null}
      {name === 'history' ? <History c={c} /> : null}
      {name === 'nutrition' ? <Nutrition c={c} /> : null}
      {name === 'photos' ? <Photos c={c} /> : null}
      {name === 'summary' ? <Summary c={c} /> : null}
    </Svg>
  );
}

function Welcome({ c }: { c: IllustrationColors }) {
  return (
    <G>
      <Circle cx="160" cy="78" r="28" fill={c.accent} />
      <Path d="M118 130c10-28 74-28 84 0" fill="none" stroke={c.ink} strokeWidth="12" strokeLinecap="round" />
      <SvgText x="160" y="84" fill={c.onAccent} fontSize="24" fontWeight="700" textAnchor="middle">
        :)
      </SvgText>
    </G>
  );
}

function Sex({ c }: { c: IllustrationColors }) {
  return (
    <G>
      <Circle cx="132" cy="78" r="24" fill={c.accent} />
      <Circle cx="188" cy="78" r="24" fill={c.plate} stroke={c.accent} strokeWidth="4" />
      <Path d="M112 130c10-24 38-24 48 0M168 130c10-24 38-24 48 0" stroke={c.ink} strokeWidth="10" strokeLinecap="round" />
    </G>
  );
}

function Work({ c }: { c: IllustrationColors }) {
  return (
    <G>
      <Rect x="110" y="58" width="100" height="74" rx="12" fill={c.plate} stroke={c.accent} strokeWidth="4" />
      <Rect x="136" y="44" width="48" height="22" rx="7" fill={c.accent} />
      <Line x1="126" y1="90" x2="194" y2="90" stroke={c.ink} strokeWidth="8" strokeLinecap="round" />
      <SvgText x="160" y="121" fill={c.ink} fontSize="18" textAnchor="middle">
        job
      </SvgText>
    </G>
  );
}

function Training({ c }: { c: IllustrationColors }) {
  return (
    <G>
      <Line x1="100" y1="94" x2="220" y2="94" stroke={c.accent} strokeWidth="12" strokeLinecap="round" />
      <Rect x="82" y="68" width="18" height="52" rx="5" fill={c.ink} />
      <Rect x="220" y="68" width="18" height="52" rx="5" fill={c.ink} />
      <Circle cx="160" cy="54" r="18" fill={c.accent} />
      <Path d="M134 140c8-28 44-28 52 0" stroke={c.ink} strokeWidth="10" strokeLinecap="round" />
    </G>
  );
}

function Metrics({ c }: { c: IllustrationColors }) {
  return (
    <G>
      <Rect x="104" y="54" width="112" height="92" rx="18" fill={c.plate} stroke={c.accent} strokeWidth="4" />
      <Path d="M126 86c18-18 50-18 68 0" stroke={c.ink} strokeWidth="8" strokeLinecap="round" />
      <Line x1="160" y1="88" x2="174" y2="72" stroke={c.accent} strokeWidth="6" strokeLinecap="round" />
      <SvgText x="160" y="126" fill={c.ink} fontSize="18" fontWeight="700" textAnchor="middle">
        kg/cm
      </SvgText>
    </G>
  );
}

function Sleep({ c }: { c: IllustrationColors }) {
  return (
    <G>
      <Path d="M132 52c-18 42 12 78 54 76-12 10-28 16-46 16-38 0-68-30-68-68 0-18 7-34 18-46 0 38 22 60 42 22z" fill={c.accent} />
      <SvgText x="206" y="76" fill={c.ink} fontSize="28" fontWeight="700">
        z
      </SvgText>
      <SvgText x="228" y="55" fill={c.ink} fontSize="18" fontWeight="700">
        z
      </SvgText>
    </G>
  );
}

function History({ c }: { c: IllustrationColors }) {
  return (
    <G>
      <Circle cx="160" cy="94" r="48" fill={c.plate} stroke={c.accent} strokeWidth="5" />
      <Line x1="160" y1="94" x2="160" y2="66" stroke={c.ink} strokeWidth="8" strokeLinecap="round" />
      <Line x1="160" y1="94" x2="184" y2="110" stroke={c.ink} strokeWidth="8" strokeLinecap="round" />
      <Path d="M112 50l-12-8M208 50l12-8" stroke={c.accent} strokeWidth="7" strokeLinecap="round" />
    </G>
  );
}

function Nutrition({ c }: { c: IllustrationColors }) {
  return (
    <G>
      <Path d="M132 62c26-28 78 2 48 46-14 20-32 34-48 42-16-8-34-22-48-42-30-44 22-74 48-46z" fill={c.accent} />
      <Path d="M184 52c18-18 34-12 42-2-15 2-28 8-42 26z" fill={c.ink} />
      <SvgText x="132" y="110" fill={c.onAccent} fontSize="22" fontWeight="700" textAnchor="middle">
        yum
      </SvgText>
    </G>
  );
}

function Photos({ c }: { c: IllustrationColors }) {
  return (
    <G>
      <Rect x="100" y="58" width="120" height="82" rx="14" fill={c.plate} stroke={c.accent} strokeWidth="4" />
      <Circle cx="160" cy="98" r="24" fill={c.accent} />
      <Circle cx="160" cy="98" r="10" fill={c.onAccent} />
      <Rect x="128" y="44" width="64" height="20" rx="8" fill={c.ink} />
    </G>
  );
}

function Summary({ c }: { c: IllustrationColors }) {
  return (
    <G>
      <Rect x="104" y="42" width="112" height="106" rx="14" fill={c.plate} stroke={c.accent} strokeWidth="4" />
      <Line x1="128" y1="74" x2="190" y2="74" stroke={c.ink} strokeWidth="7" strokeLinecap="round" />
      <Line x1="128" y1="100" x2="178" y2="100" stroke={c.ink} strokeWidth="7" strokeLinecap="round" />
      <Line x1="128" y1="126" x2="194" y2="126" stroke={c.ink} strokeWidth="7" strokeLinecap="round" />
      <Path d="M212 50l12 12 26-30" stroke={c.accent} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </G>
  );
}
