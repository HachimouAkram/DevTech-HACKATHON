import React from 'react';
import { View } from 'react-native';
import Svg, {
  Path, Rect, Circle, Line, Polyline, G, Ellipse, Defs,
  LinearGradient as SvgLinearGradient, Stop, ClipPath, Polygon,
} from 'react-native-svg';

// ─── Gradient Icon Wrapper ──────────────────────────────────────────────────
// Renders a rounded square with gradient background + SVG illustration inside
export const GradientIconCard = ({
  size = 64,
  gradientColors,
  children,
}: {
  size?: number;
  gradientColors: [string, string];
  children: React.ReactNode;
}) => {
  const radius = size * 0.28;
  const gradientId = `bg_${gradientColors[0].replace('#', '')}`;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: gradientColors[0], // Fixes Android white square elevation bug
        shadowColor: gradientColors[0],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 4, // Clean shadow without rendering glitches
      }}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <SvgLinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={gradientColors[0]} />
            <Stop offset="1" stopColor={gradientColors[1]} />
          </SvgLinearGradient>
        </Defs>
        <Rect x="0" y="0" width={size} height={size} rx={radius} fill={`url(#${gradientId})`} />
      </Svg>
      <View style={{ position: 'absolute' }}>{children}</View>
    </View>
  );
};

// ─── État Civil Icon ─────────────────────────────────────────────────────────
// Family book / livret de famille with a heart — represents civil registry
export const EtatCivilIcon = ({ size = 40 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    {/* Open book / livret */}
    <Rect x="6" y="10" width="16" height="28" rx="3" fill="rgba(255,255,255,0.25)" stroke="white" strokeWidth="1.5" />
    <Rect x="26" y="10" width="16" height="28" rx="3" fill="rgba(255,255,255,0.15)" stroke="white" strokeWidth="1.5" />
    {/* Spine */}
    <Line x1="22" y1="10" x2="22" y2="38" stroke="white" strokeWidth="2" strokeLinecap="round" />
    {/* Left page lines */}
    <Line x1="10" y1="18" x2="18" y2="18" stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />
    <Line x1="10" y1="22" x2="18" y2="22" stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
    <Line x1="10" y1="26" x2="15" y2="26" stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
    {/* Right page: heart = family */}
    <Path d="M36 21c0-2.2-1.8-4-4-4s-4 1.8-4 4c0 4 4 7 4 7s4-3 4-7z" fill="white" opacity="0.9" />
    {/* Family figures */}
    <Circle cx="33" cy="30" r="1.5" fill="white" opacity="0.7" />
    <Circle cx="37" cy="30" r="1.5" fill="white" opacity="0.7" />
    <Circle cx="35" cy="33" r="1" fill="white" opacity="0.7" />
  </Svg>
);

// ─── Population / Identité Icon ──────────────────────────────────────────────
// National ID card with person silhouette
export const PopulationIcon = ({ size = 40 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    {/* ID Card shape */}
    <Rect x="4" y="12" width="40" height="26" rx="4" fill="rgba(255,255,255,0.2)" stroke="white" strokeWidth="1.5" />
    {/* Card stripe top */}
    <Rect x="4" y="12" width="40" height="7" rx="4" fill="rgba(255,255,255,0.3)" />
    {/* Photo placeholder */}
    <Rect x="9" y="22" width="12" height="12" rx="2" fill="rgba(255,255,255,0.25)" stroke="white" strokeWidth="1" />
    {/* Person in photo */}
    <Circle cx="15" cy="26" r="2.5" fill="white" opacity="0.85" />
    <Path d="M10 34c0-2.8 2.2-4 5-4s5 1.2 5 4" fill="white" opacity="0.85" />
    {/* Text lines on card */}
    <Line x1="25" y1="23" x2="39" y2="23" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.9" />
    <Line x1="25" y1="27" x2="36" y2="27" stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
    <Line x1="25" y1="31" x2="34" y2="31" stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
    {/* Chip */}
    <Rect x="26" y="14.5" width="6" height="4" rx="1" fill="white" opacity="0.5" />
  </Svg>
);

// ─── Urbanisme / Foncier Icon ────────────────────────────────────────────────
// City building with a ruler/compass = urban planning
export const UrbanismeIcon = ({ size = 40 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    {/* Ground line */}
    <Line x1="4" y1="40" x2="44" y2="40" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
    {/* Building center */}
    <Rect x="16" y="16" width="16" height="24" rx="2" fill="rgba(255,255,255,0.25)" stroke="white" strokeWidth="1.5" />
    {/* Windows center building */}
    <Rect x="19" y="20" width="4" height="4" rx="1" fill="white" opacity="0.7" />
    <Rect x="25" y="20" width="4" height="4" rx="1" fill="white" opacity="0.7" />
    <Rect x="19" y="27" width="4" height="4" rx="1" fill="white" opacity="0.5" />
    <Rect x="25" y="27" width="4" height="4" rx="1" fill="white" opacity="0.5" />
    {/* Left small building */}
    <Rect x="6" y="24" width="10" height="16" rx="1.5" fill="rgba(255,255,255,0.18)" stroke="white" strokeWidth="1.2" />
    <Rect x="9" y="27" width="3" height="3" rx="0.5" fill="white" opacity="0.6" />
    <Rect x="9" y="32" width="3" height="3" rx="0.5" fill="white" opacity="0.4" />
    {/* Right tall building */}
    <Rect x="32" y="20" width="10" height="20" rx="1.5" fill="rgba(255,255,255,0.18)" stroke="white" strokeWidth="1.2" />
    <Rect x="34" y="23" width="3" height="3" rx="0.5" fill="white" opacity="0.6" />
    <Rect x="38" y="23" width="2" height="3" rx="0.5" fill="white" opacity="0.6" />
    <Rect x="34" y="29" width="3" height="3" rx="0.5" fill="white" opacity="0.4" />
    {/* Roof top triangle center */}
    <Polygon points="24,10 32,16 16,16" fill="rgba(255,255,255,0.4)" stroke="white" strokeWidth="1.2" />
    {/* Door */}
    <Rect x="21" y="34" width="6" height="6" rx="1" fill="white" opacity="0.5" />
  </Svg>
);

// ─── Tribunal / Justice Icon ─────────────────────────────────────────────────
// Courthouse with columns and scale of justice
export const TribunalIcon = ({ size = 40 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    {/* Base platform */}
    <Rect x="4" y="37" width="40" height="4" rx="2" fill="white" opacity="0.4" />
    {/* Main building */}
    <Rect x="8" y="18" width="32" height="19" rx="1" fill="rgba(255,255,255,0.2)" stroke="white" strokeWidth="1.2" />
    {/* Pediment / Triangle top */}
    <Polygon points="24,8 42,18 6,18" fill="rgba(255,255,255,0.35)" stroke="white" strokeWidth="1.4" />
    {/* Columns */}
    <Line x1="13" y1="18" x2="13" y2="37" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
    <Line x1="19" y1="18" x2="19" y2="37" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
    <Line x1="29" y1="18" x2="29" y2="37" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
    <Line x1="35" y1="18" x2="35" y2="37" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
    {/* Scale of justice - beam */}
    <Line x1="24" y1="20" x2="24" y2="34" stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity="0.9" />
    <Line x1="17" y1="22" x2="31" y2="22" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.9" />
    {/* Scale pans */}
    <Path d="M14,24 Q17,28 20,24" stroke="white" strokeWidth="1.2" fill="none" opacity="0.9" strokeLinecap="round" />
    <Path d="M28,26 Q31,30 34,26" stroke="white" strokeWidth="1.2" fill="none" opacity="0.9" strokeLinecap="round" />
    {/* Chains */}
    <Line x1="17" y1="22" x2="17" y2="24" stroke="white" strokeWidth="1" opacity="0.7" />
    <Line x1="31" y1="22" x2="31" y2="26" stroke="white" strokeWidth="1" opacity="0.7" />
  </Svg>
);

// ─── Finances / Fiscalité Icon ───────────────────────────────────────────────
// Coin / banknote with a chart — tax & finance
export const FinancesIcon = ({ size = 40 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    {/* Bill / banknote */}
    <Rect x="4" y="14" width="34" height="20" rx="3" fill="rgba(255,255,255,0.22)" stroke="white" strokeWidth="1.5" />
    {/* Bill inner oval */}
    <Ellipse cx="21" cy="24" rx="7" ry="7" fill="rgba(255,255,255,0.15)" stroke="white" strokeWidth="1.2" />
    {/* Currency symbol */}
    <Path d="M19 21h4M18 24h5M19 27h4" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.9" />
    {/* Corner squares */}
    <Rect x="7" y="17" width="4" height="4" rx="1" fill="white" opacity="0.3" />
    <Rect x="7" y="27" width="4" height="4" rx="1" fill="white" opacity="0.3" />
    {/* Chart bars at right */}
    <Rect x="38" y="28" width="4" height="12" rx="1" fill="white" opacity="0.85" />
    <Rect x="33" y="22" width="4" height="18" rx="1" fill="white" opacity="0.65" />
    <Rect x="28" y="32" width="4" height="8" rx="1" fill="white" opacity="0.55" />
    {/* Chart line */}
    <Path d="M28 32 L33 22 L38 28" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.9" />
    {/* Coin */}
    <Circle cx="40" cy="14" r="6" fill="rgba(255,255,255,0.3)" stroke="white" strokeWidth="1.5" />
    <Circle cx="40" cy="14" r="3.5" fill="white" opacity="0.35" />
    <Path d="M39 12v4M38.5 13h2" stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity="0.9" />
  </Svg>
);

// ─── Affaires Sociales Icon ──────────────────────────────────────────────────
// Family / solidarity hands
export const AffairesSocialesIcon = ({ size = 40 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    {/* Two hands holding */}
    <Path d="M8 34c0-4 2-7 5-9l4-3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
    <Path d="M40 34c0-4-2-7-5-9l-4-3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
    {/* Central heart */}
    <Path d="M24 36s-10-7-10-15a6 6 0 0 1 10-4.5A6 6 0 0 1 34 21c0 8-10 15-10 15z" fill="white" opacity="0.9" />
    {/* Three people silhouettes */}
    <Circle cx="16" cy="14" r="4" fill="white" opacity="0.75" />
    <Path d="M11 24c0-2.8 2.2-5 5-5s5 2.2 5 5" fill="white" opacity="0.6" />
    <Circle cx="32" cy="14" r="4" fill="white" opacity="0.75" />
    <Path d="M27 24c0-2.8 2.2-5 5-5s5 2.2 5 5" fill="white" opacity="0.6" />
    <Circle cx="24" cy="10" r="3" fill="white" opacity="0.85" />
  </Svg>
);

// ─── Autres Services / General Icon ─────────────────────────────────────────
// Grid of 4 dots = more services
export const AutresServicesIcon = ({ size = 40 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    {/* 4 squares in 2x2 grid */}
    <Rect x="8" y="8" width="13" height="13" rx="3" fill="white" opacity="0.85" />
    <Rect x="27" y="8" width="13" height="13" rx="3" fill="white" opacity="0.7" />
    <Rect x="8" y="27" width="13" height="13" rx="3" fill="white" opacity="0.7" />
    <Rect x="27" y="27" width="13" height="13" rx="3" fill="white" opacity="0.55" />
    {/* Plus in center */}
    <Line x1="24" y1="19" x2="24" y2="29" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.9" />
    <Line x1="19" y1="24" x2="29" y2="24" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.9" />
  </Svg>
);

// ─── Habitat / Logement Icon ─────────────────────────────────────────────────
export const HabitatIcon = ({ size = 40 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <Path d="M6 24L24 8l18 16" fill="rgba(255,255,255,0.2)" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <Rect x="10" y="24" width="28" height="18" rx="2" fill="rgba(255,255,255,0.2)" stroke="white" strokeWidth="1.5" />
    <Rect x="20" y="30" width="8" height="12" rx="1.5" fill="white" opacity="0.6" />
    <Rect x="12" y="26" width="6" height="6" rx="1" fill="white" opacity="0.5" />
    <Rect x="30" y="26" width="6" height="6" rx="1" fill="white" opacity="0.5" />
    <Line x1="24" y1="8" x2="24" y2="4" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
    <Line x1="20" y1="4" x2="28" y2="4" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
  </Svg>
);

// ─── Santé Icon ──────────────────────────────────────────────────────────────
export const SanteIcon = ({ size = 40 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <Rect x="6" y="14" width="36" height="26" rx="4" fill="rgba(255,255,255,0.2)" stroke="white" strokeWidth="1.5" />
    {/* Red Cross */}
    <Rect x="20" y="20" width="8" height="14" rx="2" fill="white" opacity="0.85" />
    <Rect x="17" y="23" width="14" height="8" rx="2" fill="white" opacity="0.85" />
    {/* Top caduceus */}
    <Line x1="24" y1="6" x2="24" y2="14" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
    <Path d="M20 8c0-2.2 8-2.2 8 0" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.6" />
  </Svg>
);

// ─── Education Icon ──────────────────────────────────────────────────────────
export const EducationIcon = ({ size = 40 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    {/* Graduation cap */}
    <Polygon points="24,8 44,18 24,28 4,18" fill="white" opacity="0.85" />
    <Path d="M10 21v10c3.5 3.5 10 5 14 5s10.5-1.5 14-5V21" fill="rgba(255,255,255,0.3)" stroke="white" strokeWidth="1.5" />
    {/* Tassel */}
    <Line x1="44" y1="18" x2="44" y2="30" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
    <Circle cx="44" cy="32" r="3" fill="white" opacity="0.6" />
    {/* Book lines */}
    <Line x1="18" y1="34" x2="30" y2="34" stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
    <Line x1="20" y1="37" x2="28" y2="37" stroke="white" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
  </Svg>
);

// ─── Agriculture Icon ────────────────────────────────────────────────────────
export const AgricultureIcon = ({ size = 40 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    {/* Sun */}
    <Circle cx="36" cy="12" r="6" fill="white" opacity="0.7" />
    <Line x1="36" y1="4" x2="36" y2="2" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
    <Line x1="42" y1="6" x2="44" y2="4" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
    <Line x1="44" y1="12" x2="46" y2="12" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
    {/* Plant/leaf */}
    <Path d="M10 38c0-12 6-18 14-20" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.8" />
    <Path d="M12 22c-4 0-8 4-4 10 0 0 4-6 8-6" fill="white" opacity="0.7" />
    <Path d="M22 18c4-2 10 0 10 6-4 0-8 2-10 6" fill="white" opacity="0.7" />
    {/* Ground */}
    <Line x1="4" y1="40" x2="44" y2="40" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
    <Line x1="24" y1="38" x2="24" y2="40" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
  </Svg>
);

// ─── Master mapping function ──────────────────────────────────────────────────
const BUREAU_CONFIGS: Record<string, {
  gradientColors: [string, string];
  icon: (size: number) => React.ReactNode;
}> = {
  'etat_civil': {
    gradientColors: ['#2563eb', '#1d4ed8'],
    icon: (s) => <EtatCivilIcon size={s} />,
  },
  'population': {
    gradientColors: ['#3b82f6', '#1d4ed8'],
    icon: (s) => <PopulationIcon size={s} />,
  },
  'urbanisme': {
    gradientColors: ['#f59e0b', '#d97706'],
    icon: (s) => <UrbanismeIcon size={s} />,
  },
  'tribunal': {
    gradientColors: ['#6366f1', '#4f46e5'],
    icon: (s) => <TribunalIcon size={s} />,
  },
  'finances': {
    gradientColors: ['#0ea5e9', '#0284c7'],
    icon: (s) => <FinancesIcon size={s} />,
  },
  'fiscal': {
    gradientColors: ['#0ea5e9', '#0284c7'],
    icon: (s) => <FinancesIcon size={s} />,
  },
  'affaire': {
    gradientColors: ['#ec4899', '#db2777'],
    icon: (s) => <AffairesSocialesIcon size={s} />,
  },
  'social': {
    gradientColors: ['#ec4899', '#db2777'],
    icon: (s) => <AffairesSocialesIcon size={s} />,
  },
  'habitat': {
    gradientColors: ['#f97316', '#ea580c'],
    icon: (s) => <HabitatIcon size={s} />,
  },
  'logement': {
    gradientColors: ['#f97316', '#ea580c'],
    icon: (s) => <HabitatIcon size={s} />,
  },
  'sante': {
    gradientColors: ['#ef4444', '#dc2626'],
    icon: (s) => <SanteIcon size={s} />,
  },
  'education': {
    gradientColors: ['#8b5cf6', '#7c3aed'],
    icon: (s) => <EducationIcon size={s} />,
  },
  'agriculture': {
    gradientColors: ['#84cc16', '#65a30d'],
    icon: (s) => <AgricultureIcon size={s} />,
  },
  'autres': {
    gradientColors: ['#8b5cf6', '#6d28d9'],
    icon: (s) => <AutresServicesIcon size={s} />,
  },
};

const DEFAULT_CONFIG = {
  gradientColors: ['#64748b', '#475569'] as [string, string],
  icon: (s: number) => <AutresServicesIcon size={s} />,
};

function getBureauKey(nom: string): string {
  const n = nom.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // strip accents
  if (n.includes('etat civil') || n.includes('état civil') || n.includes('civil')) return 'etat_civil';
  if (n.includes('population') || n.includes('identite') || n.includes('carte')) return 'population';
  if (n.includes('urbanisme') || n.includes('foncier') || n.includes('terrain')) return 'urbanisme';
  if (n.includes('tribunal') || n.includes('justice') || n.includes('palais')) return 'tribunal';
  if (n.includes('fiscal') || n.includes('fiscalit')) return 'fiscal';
  if (n.includes('finance') || n.includes('tresor') || n.includes('impot')) return 'finances';
  if (n.includes('social') || n.includes('affaire')) return 'affaire';
  if (n.includes('habitat') || n.includes('logement')) return 'habitat';
  if (n.includes('sante') || n.includes('medical') || n.includes('hopital')) return 'sante';
  if (n.includes('education') || n.includes('ecole') || n.includes('formation')) return 'education';
  if (n.includes('agriculture') || n.includes('elevage') || n.includes('peche')) return 'agriculture';
  if (n.includes('autres') || n.includes('autre')) return 'autres';
  return '__default__';
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Returns the gradient colors for a bureau based on its name */
export function getBureauGradientColors(nom: string): [string, string] {
  const key = getBureauKey(nom);
  return (BUREAU_CONFIGS[key] || DEFAULT_CONFIG).gradientColors;
}

/**
 * Returns a gradient icon card (rounded square with gradient + illustration)
 * to be used on the home screen bureau grid.
 */
export function getBureauIllustrativeIcon(
  nom: string,
  size: number = 64,
  _color: string = '#2563eb',      // kept for backward compat, ignored
  _strokeColor: string = '#0f172a', // kept for backward compat, ignored
) {
  const key = getBureauKey(nom);
  const config = BUREAU_CONFIGS[key] || DEFAULT_CONFIG;
  const iconSize = Math.round(size * 0.65);

  return (
    <GradientIconCard size={size} gradientColors={config.gradientColors}>
      {config.icon(iconSize)}
    </GradientIconCard>
  );
}

// ─── Service/Activité Icons (Actes civils) ───────────────────────────────────
// Original clean two-color stroke icons

export const UserStampIcon = ({ size = 40, color = '#2563eb', strokeColor = '#0f172a' }: { size?: number; color?: string; strokeColor?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {/* User Outline */}
    <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx="12" cy="7" r="4" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    {/* Stamp Overlay in Primary Color */}
    <Path d="M19 14l-1.5 2h-3L13 14c0-1.5 1.5-3 3-3s3 1.5 3 3z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="#fff" />
    <Rect x="12" y="16" width="8" height="3" rx="1" stroke={color} strokeWidth="1.5" fill="#fff" />
    <Line x1="13" y1="19" x2="19" y2="19" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
  </Svg>
);

export const DocPenIcon = ({ size = 40, color = '#2563eb', strokeColor = '#0f172a' }: { size?: number; color?: string; strokeColor?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {/* Document Outline */}
    <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <Polyline points="14 2 14 8 20 8" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <Line x1="8" y1="13" x2="12" y2="13" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
    <Line x1="8" y1="17" x2="10" y2="17" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
    {/* Pen Overlay in Primary Color */}
    <Path d="M18.5 4.5a2.121 2.121 0 0 1 3 3L12 17l-4 1 1-4 9.5-9.5z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="#fff" />
  </Svg>
);

export const DocStampIcon = ({ size = 40, color = '#2563eb', strokeColor = '#0f172a' }: { size?: number; color?: string; strokeColor?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {/* Document Outline */}
    <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <Polyline points="14 2 14 8 20 8" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <Line x1="8" y1="13" x2="12" y2="13" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
    <Line x1="8" y1="17" x2="16" y2="17" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
    {/* Stamp Overlay in Primary Color */}
    <Path d="M21 15l-1.5 2h-3L15 15c0-1.5 1.5-3 3-3s3 1.5 3 3z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="#fff" />
    <Rect x="14" y="17" width="8" height="3" rx="1" stroke={color} strokeWidth="1.5" fill="#fff" />
    <Line x1="15" y1="20" x2="21" y2="20" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
  </Svg>
);

export const DocCheckIcon = ({ size = 40, color = '#2563eb', strokeColor = '#0f172a' }: { size?: number; color?: string; strokeColor?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {/* Document Outline */}
    <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <Polyline points="14 2 14 8 20 8" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <Line x1="8" y1="13" x2="16" y2="13" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
    <Line x1="8" y1="17" x2="12" y2="17" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
    {/* Check Overlay in Primary Color */}
    <Circle cx="18" cy="19" r="6" fill="#fff" opacity="0.8" />
    <Path d="M15 19l2 2 4-4" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

/**
 * Returns the original clean two-color stroke icon for a civil act type.
 * color = the bureau brand color (accent)
 * isSelected = whether the card is selected (uses white stroke for contrast)
 */
export function getServiceIllustrativeIcon(
  nom: string,
  color: string = '#2563eb',
  isSelected: boolean = false,
): React.ReactNode {
  const n = nom.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const accentColor = isSelected ? '#ffffff' : color;
  const strokeColor = isSelected ? 'rgba(255,255,255,0.85)' : '#0f172a';
  const size = 52;

  if (n.includes('naiss') || n.includes('naissance') || n.includes('baby') || n.includes('bebe')) {
    return <UserStampIcon size={size} color={accentColor} strokeColor={strokeColor} />;
  }
  if (n.includes('mariag') || n.includes('mariage') || n.includes('union') || n.includes('epoux') || n.includes('noce')) {
    return <DocPenIcon size={size} color={accentColor} strokeColor={strokeColor} />;
  }
  if (n.includes('deces') || n.includes('décès') || n.includes('mort') || n.includes('obseq')) {
    return <DocStampIcon size={size} color={accentColor} strokeColor={strokeColor} />;
  }
  return <DocCheckIcon size={size} color={accentColor} strokeColor={strokeColor} />;
}

// Keep legacy export for backward compat
export const getBureau3DIconUrl = (_nom: string): string => '';

