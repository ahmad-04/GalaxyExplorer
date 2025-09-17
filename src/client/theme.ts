// Central theme tokens for colors, typography, spacing, radii, and effects
export const theme = {
  palette: {
    navy: '#1D313C', // deep background
    orange: '#F6733A', // accent
    beige: '#ECD6C3', // neutral text/panels
    cyan: '#4FA3AB', // energy/laser
    green: '#387654', // secondary accent
    white: '#FFFFFF',
  },
  colors: {
    // Phaser numeric colors
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
} as const;

export type Theme = typeof theme;
