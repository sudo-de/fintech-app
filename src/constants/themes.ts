export interface ThemeColors {
  background: string;
  surface: string;
  card: string;
  cardAlt: string;
  primary: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  income: string;
  incomeLight: string;
  expense: string;
  expenseLight: string;
  warning: string;
  warningLight: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;
  border: string;
  divider: string;
  overlay: string;
  inputBackground: string;
  chartGrid: string;
  chartLine: string;
  /** Muted gradient for disabled primary buttons (login/register, etc.) */
  buttonDisabled: [string, string];
  gradients: {
    primary: [string, string];
    income: [string, string];
    expense: [string, string];
    card: [string, string];
    dark: [string, string];
    gold: [string, string];
    teal: [string, string];
  };
  categories: {
    food: string;
    transport: string;
    shopping: string;
    entertainment: string;
    health: string;
    utilities: string;
    housing: string;
    education: string;
    travel: string;
    personal: string;
    salary: string;
    freelance: string;
    investment: string;
    gift: string;
    other: string;
  };
}

const SHARED_GRADIENTS: ThemeColors['gradients'] = {
  primary: ['#6C63FF', '#4B44CC'],
  income: ['#4CAF50', '#2E7D32'],
  expense: ['#FF5252', '#C62828'],
  card: ['#1C2040', '#141829'],
  dark: ['#141829', '#0A0E21'],
  gold: ['#FFB300', '#FF6F00'],
  teal: ['#03DAC6', '#018786'],
};

const SHARED_CATEGORIES: ThemeColors['categories'] = {
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
};

export const DARK_THEME: ThemeColors = {
  background: '#0A0E21',
  surface: '#141829',
  card: '#1C2040',
  cardAlt: '#1A1F3A',
  primary: '#6C63FF',
  primaryLight: '#8B84FF',
  primaryDark: '#4B44CC',
  secondary: '#03DAC6',
  income: '#4CAF50',
  incomeLight: '#81C784',
  expense: '#FF5252',
  expenseLight: '#FF8A80',
  warning: '#FFB300',
  warningLight: '#FFD54F',
  textPrimary: '#FFFFFF',
  textSecondary: '#9898B0',
  textTertiary: '#5C5C7A',
  textInverse: '#0A0E21',
  border: '#252A4A',
  divider: '#1E2240',
  overlay: 'rgba(10, 14, 33, 0.85)',
  inputBackground: '#1C2040',
  chartGrid: '#1E2240',
  chartLine: '#6C63FF',
  buttonDisabled: ['#363B5C', '#2A2F4A'],
  gradients: SHARED_GRADIENTS,
  categories: SHARED_CATEGORIES,
};

export const LIGHT_THEME: ThemeColors = {
  background: '#F0F3FA',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  cardAlt: '#F5F8FF',
  primary: '#6C63FF',
  primaryLight: '#8B84FF',
  primaryDark: '#4B44CC',
  secondary: '#03DAC6',
  income: '#2E7D32',
  incomeLight: '#4CAF50',
  expense: '#C62828',
  expenseLight: '#FF5252',
  warning: '#E65100',
  warningLight: '#FF9800',
  textPrimary: '#0D1136',
  textSecondary: '#4A4E6A',
  textTertiary: '#9EA3C0',
  textInverse: '#FFFFFF',
  border: '#E2E6F3',
  divider: '#EEF0F8',
  overlay: 'rgba(13,17,54,0.7)',
  inputBackground: '#F5F8FF',
  chartGrid: '#E2E6F3',
  chartLine: '#6C63FF',
  buttonDisabled: ['#E2E6F3', '#D4D8E8'],
  gradients: SHARED_GRADIENTS,
  categories: SHARED_CATEGORIES,
};
