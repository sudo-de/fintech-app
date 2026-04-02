export const COLORS = {
  // Backgrounds
  background: '#0A0E21',
  surface: '#141829',
  card: '#1C2040',
  cardAlt: '#1A1F3A',

  // Brand
  primary: '#6C63FF',
  primaryLight: '#8B84FF',
  primaryDark: '#4B44CC',
  secondary: '#03DAC6',

  // Semantic
  income: '#4CAF50',
  incomeLight: '#81C784',
  expense: '#FF5252',
  expenseLight: '#FF8A80',
  warning: '#FFB300',
  warningLight: '#FFD54F',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#9898B0',
  textTertiary: '#5C5C7A',
  textInverse: '#0A0E21',

  // UI
  border: '#252A4A',
  divider: '#1E2240',
  overlay: 'rgba(10, 14, 33, 0.85)',
  inputBackground: '#1C2040',

  // Chart
  chartGrid: '#1E2240',
  chartLine: '#6C63FF',

  // Gradients (pairs)
  gradients: {
    primary: ['#6C63FF', '#4B44CC'] as [string, string],
    income: ['#4CAF50', '#2E7D32'] as [string, string],
    expense: ['#FF5252', '#C62828'] as [string, string],
    card: ['#1C2040', '#141829'] as [string, string],
    dark: ['#141829', '#0A0E21'] as [string, string],
    gold: ['#FFB300', '#FF6F00'] as [string, string],
    teal: ['#03DAC6', '#018786'] as [string, string],
  },

  // Category colors
  categories: {
    food: '#FF6B6B',
    transport: '#4ECDC4',
    shopping: '#45B7D1',
    entertainment: '#FFA07A',
    health: '#98D8C8',
    utilities: '#FFD93D',
    housing: '#C3A6FF',
    education: '#6BCF7F',
    travel: '#FF9FF3',
    personal: '#54A0FF',
    salary: '#5FF3B3',
    freelance: '#48DBFB',
    investment: '#FFEAA7',
    gift: '#FD79A8',
    other: '#9898B0',
  },
} as const;

export const FONTS = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
  sizes: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    hero: 42,
  },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  full: 999,
};

export const SHADOW = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  large: {
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
};
