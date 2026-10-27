export const palette = {
  rose: '#E7688D',
  roseDark: '#C74970',
  lilac: '#8A6BC8',
  cream: '#FFF8F6',
  peach: '#FADDD5',
  ink: '#352C36',
  muted: '#786D79',
  success: '#4F9975',
  warning: '#D68B3C',
  danger: '#C94C5F',
} as const;

export const lightColors = {
  background: palette.cream,
  surface: '#FFFFFF',
  elevated: '#FFF0F3',
  text: palette.ink,
  textMuted: palette.muted,
  primary: palette.rose,
  primaryPressed: palette.roseDark,
  secondary: palette.lilac,
  border: '#EEDDE1',
  success: palette.success,
  danger: palette.danger,
} as const;

export const darkColors = {
  background: '#17131B',
  surface: '#221C27',
  elevated: '#302431',
  text: '#FFF7F8',
  textMuted: '#C9BCCB',
  primary: '#F07B9E',
  primaryPressed: '#D65B83',
  secondary: '#AE92E8',
  border: '#49394B',
  success: '#72B995',
  danger: '#F07886',
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radii = { sm: 10, md: 16, lg: 24, pill: 999 } as const;
