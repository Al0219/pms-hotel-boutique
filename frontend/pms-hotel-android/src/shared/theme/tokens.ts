export const tokens = {
  color: {
    ink: '#252925',
    inkStrong: '#292B29',
    muted: '#6B716C',
    brand: '#586456',
    brandSoft: '#7C8B78',
    surface: '#F8F7F3',
    surfaceMuted: '#F1F0EC',
    surfaceAccent: '#EDF1EA',
    white: '#FFFFFF',
    black: '#000000',
  },
  typography: {
    family: 'Inter',
    size: {
      body: 12,
      title: 26,
    },
  },
  space: {
    xs: 8,
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
  },
  radius: {
    control: 10,
    card: 14,
  },
  layout: {
    screenInset: 24,
    controlHeight: 48,
    buttonHeight: 44,
  },
} as const;
