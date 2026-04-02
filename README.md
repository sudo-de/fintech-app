# FinTrack — Personal Finance Companion

A polished, feature-rich personal finance companion app built with React Native + Expo. Track transactions, monitor goals, and understand your spending patterns through rich visual insights.

---

## Screenshots & Demo

Run the app locally with `npx expo start` and scan the QR code with the Expo Go app.

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | React Native + Expo SDK 54 | Cross-platform (iOS + Android), fast iteration |
| Language | TypeScript | Type safety across all layers |
| Navigation | React Navigation v7 (bottom tabs + native stack) | Industry standard, smooth native transitions |
| State | React Context + useReducer | Clean, dependency-free, predictable state |
| Persistence | AsyncStorage | Lightweight local storage, no backend needed |
| Charts | react-native-chart-kit + react-native-svg | Lightweight, Expo-compatible charting |
| Gradients | expo-linear-gradient | Native gradient performance |
| Icons | @expo/vector-icons (Ionicons) | Built-in to Expo, 1300+ icons |

---

## Project Structure

```
src/
├── types/              # Shared TypeScript interfaces
├── constants/
│   ├── colors.ts       # Design tokens (colors, spacing, radius, shadows)
│   └── categories.ts   # 15 transaction categories with icons and colors
├── context/
│   ├── AppContext.tsx   # Global state provider + action helpers
│   └── appReducer.ts   # Pure reducer for all state transitions
├── storage/
│   └── storage.ts      # AsyncStorage read/write with error handling
├── utils/
│   ├── formatters.ts   # Currency, date, and ID formatting
│   └── calculations.ts # Financial calculations (totals, trends, budgets)
├── components/
│   ├── common/         # Reusable UI: GradientCard, EmptyState, LoadingSpinner, etc.
│   ├── dashboard/      # BalanceCard, SpendingChart
│   ├── transactions/   # TransactionItem, FilterBar
│   ├── goals/          # GoalCard, BudgetTracker, NoSpendChallenge
│   └── insights/       # CategoryPieChart, WeeklyBar, MonthlyTrend
├── screens/            # HomeScreen, TransactionsScreen, AddTransactionScreen, GoalsScreen, InsightsScreen
└── navigation/
    ├── TabNavigator.tsx # Bottom tabs (Home, Transactions, Goals, Insights)
    └── RootNavigator.tsx # Root stack with modal AddTransaction
```

---

## Features

### 1. Home Dashboard
- Greeting header with current time-aware salutation
- **Hero balance card** with gradient background showing total balance, monthly income, and expenses
- 3 quick-stat chips: savings rate, top expense category, transaction count
- **7-day daily spending line chart** (bezier, auto-scales)
- Recent transactions list (last 5, tap to edit)

### 2. Transaction Tracking
- Add/edit/delete transactions with full form (amount, type, category, note, date)
- Large, prominent amount input for fast entry
- 15 categorized options with color-coded icons, filtered by income/expense type
- Quick date selection (Today / Yesterday / 2 days ago)
- Transaction list **grouped by date** with relative labels (Today, Yesterday, etc.)
- **Search** by note or category name
- **Filter** by All / Income / Expense
- Monthly income vs expense summary banner
- Swipe-to-open edit (tap any transaction)

### 3. Goals & Challenges
Three distinct engagement features:

**No-Spend Challenge** — Commit to zero discretionary spending for 3, 7, 14, or 30 days. Visual tile tracker shows each day with a checkmark if no expenses were recorded. Live streak counter.

**Savings Goals** — Set a named monthly savings target. Progress bar tracks net savings (income − expenses) against the goal. Celebrates achievement with a trophy icon and "+over" display.

**Category Budgets** — Set per-category monthly spending limits. Color-coded progress bars turn yellow at 80% and red when over. Shows exact remaining or over-budget amount.

### 4. Insights Screen
- **3 key metric cards**: savings rate with mini progress bar, active categories, total transaction count
- **Top expense category highlight** with full-width card
- **Category pie chart** — spending breakdown with legend and dollar amounts
- **Weekly comparison bar chart** — this week vs last week with % change badge and a smart tip when spending drops
- **6-month trend line chart** — overlaid income (green) and expense (red) lines
- **Smart tips** — 3 auto-generated insights based on savings rate, weekly change, and category concentration

### 5. UX Quality
- Dark fintech theme (`#0A0E21` background, `#6C63FF` primary purple)
- Consistent 20px horizontal gutters, 8px card gap grid
- Empty states with icon + title + subtitle on every list
- Loading spinner during AsyncStorage hydration
- Keyboard-avoiding view on all forms
- Alert confirmations for destructive actions (delete transaction, stop challenge)
- Touch-friendly 44px minimum tap targets on icons
- Modal sheet presentation for AddTransaction (slides up from bottom)

---

## Getting Started

### Prerequisites
- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app on your device, OR an iOS/Android simulator

### Installation

```bash
git clone <repo-url>
cd FinTechAPP
npm install
npx expo start
```

Scan the QR code with Expo Go (Android) or the Camera app (iOS).

### Run on specific platform

```bash
npx expo start --android
npx expo start --ios
npx expo start --web
```

---

## Data Model

```typescript
Transaction {
  id: string          // generated: timestamp + random
  type: 'income' | 'expense'
  amount: number
  category: CategoryId  // one of 15 categories
  note: string
  date: string        // ISO 8601
}

SavingsGoal {
  id: string
  name: string
  targetAmount: number
  month: string       // 'YYYY-MM'
  createdAt: string
}

Budget {
  id: string
  category: CategoryId
  limit: number
  month: string       // 'YYYY-MM'
}

NoSpendChallenge {
  id: string
  startDate: string
  durationDays: number
  isActive: boolean
}
```

All data is persisted to a single AsyncStorage key (`@fintrack_state_v1`) as JSON. The app hydrates on launch and auto-saves on every state change.

---

## Assumptions & Design Decisions

1. **No backend** — all data is local. The app works fully offline from day one.
2. **Single currency (USD)** — the formatter is easily swappable; multi-currency would require a rates API.
3. **Manual transaction entry** — there is no bank sync. Users log transactions themselves, keeping the experience lightweight and private.
4. **Balance = initialBalance + total income − total expenses**. The `initialBalance` is 0 by default (representing net cash tracked in the app, not a linked account balance).
5. **Savings goal progress = monthly net savings (income − expenses)**. This is simpler than tracking transfers to a savings account and more relevant to everyday budgeting.
6. **No-spend streak** counts consecutive days from today backwards with zero expense transactions.
7. **Budgets are per-month per-category** — you can have one budget per category per calendar month.
8. **Charts use mock-friendly zero-fill** — if a day or month has no data, it shows 0 gracefully rather than breaking the chart.

---

## Optional Enhancements (not implemented, noted for completeness)
- Dark/light theme toggle
- Push notification reminders
- Data export to CSV
- Biometric app lock
- Multi-currency support with live exchange rates
- Animated transitions between screens (Reanimated layouts)

---

## License

MIT
