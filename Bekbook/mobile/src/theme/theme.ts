export const theme = {
  colors: {
    primary: '#D97706',      // Warm Amber
    primaryDark: '#B45309',  // Dark Amber
    primaryLight: '#FEF3C7', // Amber 100
    secondary: '#C2410C',    // Terracotta / Burnt Orange
    background: '#FAF6F0',   // Warm Linen
    surface: '#FFFFFF',      // White Surface Card
    text: '#1E293B',         // Slate 800
    textMuted: '#64748B',    // Slate 500
    border: '#E2E8F0',       // Slate 200
    borderWarm: '#F5E6D3',   // Warm Amber Border
    success: '#10B981',      // Emerald 500
    danger: '#EF4444',       // Red 500
    info: '#3B82F6',         // Blue 500
    overlay: 'rgba(0, 0, 0, 0.45)',
  },
  roundness: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  typography: {
    fontFamily: 'System',
    sizes: {
      xs: 12,
      sm: 14,
      md: 16,
      lg: 18,
      xl: 20,
      xxl: 24,
      huge: 32,
    },
    weights: {
      regular: '400' as const,
      medium: '500' as const,
      semibold: '600' as const,
      bold: '700' as const,
    }
  }
};

export type ThemeType = typeof theme;
