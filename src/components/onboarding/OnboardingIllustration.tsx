import Svg, { Circle, Defs, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

import { colors } from '@/src/constants/colors';

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

type OnboardingIllustrationProps = {
  compact?: boolean;
  name: IllustrationName;
};

export function OnboardingIllustration({ compact = false, name }: OnboardingIllustrationProps) {
  return (
    <Svg width="100%" height={compact ? 104 : 148} viewBox="0 0 320 180">
      <Defs />
      <Circle cx="160" cy="90" r="78" fill="#1C1C20" />
      <Circle cx="92" cy="48" r="10" fill={colors.primary} opacity={0.28} />
      <Circle cx="235" cy="138" r="14" fill={colors.primary} opacity={0.18} />

      {name === 'welcome' ? <Welcome /> : null}
      {name === 'sex' ? <Sex /> : null}
      {name === 'work' ? <Work /> : null}
      {name === 'training' ? <Training /> : null}
      {name === 'metrics' ? <Metrics /> : null}
      {name === 'sleep' ? <Sleep /> : null}
      {name === 'history' ? <History /> : null}
      {name === 'nutrition' ? <Nutrition /> : null}
      {name === 'photos' ? <Photos /> : null}
      {name === 'summary' ? <Summary /> : null}
    </Svg>
  );
}

function Welcome() {
  return (
    <G>
      <Circle cx="160" cy="78" r="28" fill={colors.primary} />
      <Path d="M118 130c10-28 74-28 84 0" fill="none" stroke="#FFFFFF" strokeWidth="12" strokeLinecap="round" />
      <SvgText x="160" y="84" fill="#121214" fontSize="24" fontWeight="700" textAnchor="middle">
        :)
      </SvgText>
    </G>
  );
}

function Sex() {
  return (
    <G>
      <Circle cx="132" cy="78" r="24" fill={colors.primary} />
      <Circle cx="188" cy="78" r="24" fill="#2A2A2E" stroke={colors.primary} strokeWidth="4" />
      <Path d="M112 130c10-24 38-24 48 0M168 130c10-24 38-24 48 0" stroke="#FFFFFF" strokeWidth="10" strokeLinecap="round" />
    </G>
  );
}

function Work() {
  return (
    <G>
      <Rect x="110" y="58" width="100" height="74" rx="12" fill="#2A2A2E" stroke={colors.primary} strokeWidth="4" />
      <Rect x="136" y="44" width="48" height="22" rx="7" fill={colors.primary} />
      <Line x1="126" y1="90" x2="194" y2="90" stroke="#FFFFFF" strokeWidth="8" strokeLinecap="round" />
      <SvgText x="160" y="121" fill="#FFFFFF" fontSize="18" textAnchor="middle">
        job
      </SvgText>
    </G>
  );
}

function Training() {
  return (
    <G>
      <Line x1="100" y1="94" x2="220" y2="94" stroke={colors.primary} strokeWidth="12" strokeLinecap="round" />
      <Rect x="82" y="68" width="18" height="52" rx="5" fill="#FFFFFF" />
      <Rect x="220" y="68" width="18" height="52" rx="5" fill="#FFFFFF" />
      <Circle cx="160" cy="54" r="18" fill={colors.primary} />
      <Path d="M134 140c8-28 44-28 52 0" stroke="#FFFFFF" strokeWidth="10" strokeLinecap="round" />
    </G>
  );
}

function Metrics() {
  return (
    <G>
      <Rect x="104" y="54" width="112" height="92" rx="18" fill="#2A2A2E" stroke={colors.primary} strokeWidth="4" />
      <Path d="M126 86c18-18 50-18 68 0" stroke="#FFFFFF" strokeWidth="8" strokeLinecap="round" />
      <Line x1="160" y1="88" x2="174" y2="72" stroke={colors.primary} strokeWidth="6" strokeLinecap="round" />
      <SvgText x="160" y="126" fill="#FFFFFF" fontSize="18" fontWeight="700" textAnchor="middle">
        kg/cm
      </SvgText>
    </G>
  );
}

function Sleep() {
  return (
    <G>
      <Path d="M132 52c-18 42 12 78 54 76-12 10-28 16-46 16-38 0-68-30-68-68 0-18 7-34 18-46 0 38 22 60 42 22z" fill={colors.primary} />
      <SvgText x="206" y="76" fill="#FFFFFF" fontSize="28" fontWeight="700">
        z
      </SvgText>
      <SvgText x="228" y="55" fill="#FFFFFF" fontSize="18" fontWeight="700">
        z
      </SvgText>
    </G>
  );
}

function History() {
  return (
    <G>
      <Circle cx="160" cy="94" r="48" fill="#2A2A2E" stroke={colors.primary} strokeWidth="5" />
      <Line x1="160" y1="94" x2="160" y2="66" stroke="#FFFFFF" strokeWidth="8" strokeLinecap="round" />
      <Line x1="160" y1="94" x2="184" y2="110" stroke="#FFFFFF" strokeWidth="8" strokeLinecap="round" />
      <Path d="M112 50l-12-8M208 50l12-8" stroke={colors.primary} strokeWidth="7" strokeLinecap="round" />
    </G>
  );
}

function Nutrition() {
  return (
    <G>
      <Path d="M132 62c26-28 78 2 48 46-14 20-32 34-48 42-16-8-34-22-48-42-30-44 22-74 48-46z" fill={colors.primary} />
      <Path d="M184 52c18-18 34-12 42-2-15 2-28 8-42 26z" fill="#FFFFFF" />
      <SvgText x="132" y="110" fill="#121214" fontSize="22" fontWeight="700" textAnchor="middle">
        yum
      </SvgText>
    </G>
  );
}

function Photos() {
  return (
    <G>
      <Rect x="100" y="58" width="120" height="82" rx="14" fill="#2A2A2E" stroke={colors.primary} strokeWidth="4" />
      <Circle cx="160" cy="98" r="24" fill={colors.primary} />
      <Circle cx="160" cy="98" r="10" fill="#121214" />
      <Rect x="128" y="44" width="64" height="20" rx="8" fill="#FFFFFF" />
    </G>
  );
}

function Summary() {
  return (
    <G>
      <Rect x="104" y="42" width="112" height="106" rx="14" fill="#2A2A2E" stroke={colors.primary} strokeWidth="4" />
      <Line x1="128" y1="74" x2="190" y2="74" stroke="#FFFFFF" strokeWidth="7" strokeLinecap="round" />
      <Line x1="128" y1="100" x2="178" y2="100" stroke="#FFFFFF" strokeWidth="7" strokeLinecap="round" />
      <Line x1="128" y1="126" x2="194" y2="126" stroke="#FFFFFF" strokeWidth="7" strokeLinecap="round" />
      <Path d="M212 50l12 12 26-30" stroke={colors.primary} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </G>
  );
}
