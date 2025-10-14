// Central theme tokens for colors, typography, spacing, radii, and effects
// Theme tokens shape
export type Theme = {
  name: string;
  palette: {
    navy: string;
    orange: string;
    beige: string;
    cyan: string;
    green: string;
    white: string;
    bg: string;
    fg: string;
    muted: string;
  };
  colors: {
    navy: number;
    orange: number;
    beige: number;
    cyan: number;
    green: number;
    white: number;
  };
  fonts: {
    header: string;
    body: string;
  };
  radii: { sm: number; md: number; lg: number };
  spacing: { xxs: number; xs: number; sm: number; md: number; lg: number; xl: number };
  stroke: { thin: number; thick: number };
  alpha: { weak: number; mid: number; strong: number };
};

// Presets
const cosmicNeon: Theme = {
  name: 'Cosmic Neon',
  palette: {
    navy: '#1D313C',
    orange: '#F6733A',
    beige: '#ECD6C3',
    cyan: '#4FA3AB',
    green: '#387654',
    white: '#FFFFFF',
    bg: '#1d313c',
    fg: '#ecd6c3',
    muted: '#b9a99a',
  },
  colors: {
    navy: 0x1d313c,
    orange: 0xf6733a,
    beige: 0xecd6c3,
    cyan: 0x4fa3ab,
    green: 0x387654,
    white: 0xffffff,
  },
  fonts: {
    header: '"Bebas Neue", "Antonio", "Arial Black", Impact, system-ui, sans-serif',
    body: '"League Spartan", "Rajdhani", Arial, system-ui, sans-serif',
  },
  radii: { sm: 8, md: 12, lg: 16 },
  spacing: { xxs: 4, xs: 8, sm: 12, md: 16, lg: 24, xl: 32 },
  stroke: { thin: 2, thick: 3 },
  alpha: { weak: 0.2, mid: 0.4, strong: 0.7 },
};

const retroCRT: Theme = {
  name: 'Retro CRT',
  palette: {
    navy: '#0A0F14',
    orange: '#F59E0B',
    beige: '#E5E7EB',
    cyan: '#22D3EE',
    green: '#10B981',
    white: '#FFFFFF',
    bg: '#0b1220',
    fg: '#e5e7eb',
    muted: '#94a3b8',
  },
  colors: {
    navy: 0x0a0f14,
    orange: 0xf59e0b,
    beige: 0xe5e7eb,
    cyan: 0x22d3ee,
    green: 0x10b981,
    white: 0xffffff,
  },
  fonts: {
    header: '"Bebas Neue", Impact, system-ui, sans-serif',
    body: '"League Spartan", system-ui, sans-serif',
  },
  radii: { sm: 6, md: 10, lg: 14 },
  spacing: { xxs: 4, xs: 8, sm: 12, md: 16, lg: 24, xl: 32 },
  stroke: { thin: 2, thick: 3 },
  alpha: { weak: 0.18, mid: 0.35, strong: 0.65 },
};

const catNebula: Theme = {
  name: 'Cat Nebula',
  palette: {
    navy: '#1E1B4B',
    orange: '#F472B6',
    beige: '#F5E0E8',
    cyan: '#A78BFA',
    green: '#34D399',
    white: '#FFFFFF',
    bg: '#1b153a',
    fg: '#f5e0e8',
    muted: '#c4b5fd',
  },
  colors: {
    navy: 0x1e1b4b,
    orange: 0xf472b6,
    beige: 0xf5e0e8,
    cyan: 0xa78bfa,
    green: 0x34d399,
    white: 0xffffff,
  },
  fonts: {
    header: '"Bebas Neue", "Antonio", system-ui, sans-serif',
    body: '"League Spartan", "Rajdhani", system-ui, sans-serif',
  },
  radii: { sm: 10, md: 14, lg: 18 },
  spacing: { xxs: 4, xs: 8, sm: 12, md: 16, lg: 24, xl: 32 },
  stroke: { thin: 2, thick: 3 },
  alpha: { weak: 0.2, mid: 0.4, strong: 0.7 },
};

export const themes = {
  cosmic: cosmicNeon,
  retro: retroCRT,
  cat: catNebula,
} as const;

// Back-compat exported object (mutated in-place when theme changes)
export const theme: Theme = { ...cosmicNeon };

const THEME_STORAGE_KEY = 'galaxyExplorer_themeName';

function toNumber(hex: string): number {
  return Number.parseInt(hex.replace('#', ''), 16);
}

function assignTheme(target: Theme, source: Theme) {
  // copy shallow fields
  // assign fields without using `any`
  target.name = source.name;
  Object.assign(target.palette, source.palette);
  Object.assign(target.colors, source.colors);
  Object.assign(target.fonts, source.fonts);
  Object.assign(target.radii, source.radii);
  Object.assign(target.spacing, source.spacing);
  Object.assign(target.stroke, source.stroke);
  Object.assign(target.alpha, source.alpha);
}

export function applyThemeToDocument(t: Theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.style.setProperty('--gx-bg', t.palette.bg);
  root.style.setProperty('--gx-fg', t.palette.fg);
  root.style.setProperty('--gx-muted', t.palette.muted);
  root.style.setProperty('--gx-orange', t.palette.orange);
  root.style.setProperty('--gx-cyan', t.palette.cyan);
  root.style.setProperty('--gx-green', t.palette.green);
  root.style.setProperty('--gx-white', t.palette.white);
}

type ThemeListener = (payload: { name: keyof typeof themes; theme: Theme }) => void;

class ThemeManagerImpl {
  private current: keyof typeof themes = 'cosmic';
  private listeners: Set<ThemeListener> = new Set();

  initFromStorage() {
    try {
      const raw = localStorage.getItem(THEME_STORAGE_KEY);
      const saved = (raw as ThemeName | null) ?? null;
      if (saved && themes[saved]) this.current = saved;
    } catch (e) {
      // ignore storage errors in restricted environments
      console.warn('[ThemeManager] initFromStorage warning:', e);
    }
    this.apply();
  }

  getName() {
    return this.current;
  }

  get(): Theme {
    return themes[this.current];
  }

  set(name: keyof typeof themes) {
    if (!themes[name]) return;
    this.current = name;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, name);
    } catch (e) {
      console.warn('[ThemeManager] set theme storage warning:', e);
    }
    this.apply();
  }

  cycle() {
    const order: ThemeName[] = ['cosmic', 'retro', 'cat'];
    const idx = order.indexOf(this.current);
    const next: ThemeName = order[(idx + 1) % order.length] as ThemeName;
    this.set(next);
  }

  onChange(cb: ThemeListener) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private apply() {
    const t = themes[this.current];
    // keep numeric colors in sync with hex palette for convenience
    t.colors.navy = toNumber(t.palette.navy);
    t.colors.orange = toNumber(t.palette.orange);
    t.colors.beige = toNumber(t.palette.beige);
    t.colors.cyan = toNumber(t.palette.cyan);
    t.colors.green = toNumber(t.palette.green);
    t.colors.white = toNumber(t.palette.white);

    // mutate exported `theme` inplace for back-compat
    assignTheme(theme, t);

    // apply to CSS variables
    try {
      applyThemeToDocument(t);
    } catch (e) {
      console.warn('[ThemeManager] applyThemeToDocument warning:', e);
    }

    // emit event to listeners
    const payload = { name: this.current, theme: t } as const;
    this.listeners.forEach((l) => {
      try {
        l(payload);
      } catch (e) {
        console.warn('[ThemeManager] listener error:', e);
      }
    });
    try {
      // Also broadcast a DOM event for code that doesn't import the manager
      document.dispatchEvent(new CustomEvent('ui:theme:changed', { detail: payload }));
    } catch (e) {
      // ignore if DOM not available
    }
  }
}

export const ThemeManager = new ThemeManagerImpl();
export type ThemeName = keyof typeof themes;
export function getAvailableThemes(): ThemeName[] {
  return ['cosmic', 'retro', 'cat'];
}
