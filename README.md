# FinTech App — Personal Finance Companion

A polished, full-stack personal finance app built with **React Native + Expo** (frontend) and **Go + PostgreSQL** (backend). Track transactions, monitor savings goals, set budgets, and understand your spending through rich visual insights — with real-time sync, multi-currency support, and a Lottie animated launch screen.

---

## Screenshots & Demo

Run locally with `npx expo start` and scan the QR code with Expo Go.  
Backend is live at: **https://backendfintech-production.up.railway.app**

---

## Preview iOS + Android from GitHub (EAS — not production)

Pushes to **`main`** queue **[EAS Build](https://docs.expo.dev/build/introduction/)** with the **`preview`** profile only (`eas build --profile preview --platform all` — **not** the `production` profile). The workflow runs **only** when Expo app paths change (`src/**`, `assets/**`, `app.json`, etc.); **`backend/**` is not a trigger** — backend Docker → Railway should stay in your **other** repo; this CI never builds or deploys the API.

| Platform | Preview output |
|----------|----------------|
| **Android** | Internal **APK** (sideload / QR) |
| **iOS** | Internal **.ipa** (install link; requires [Apple credentials](https://docs.expo.dev/app-signing/app-credentials/) on Expo) |

1. **One-time — link the Expo project** (adds `extra.eas.projectId` to `app.json`):
   ```bash
   npm install -g eas-cli
   eas login
   eas init
   ```
2. **iOS**: configure **Apple Developer** team and signing on [expo.dev](https://expo.dev) (or run `eas credentials` once). Without this, the iOS preview build will fail.
3. **GitHub `EXPO_TOKEN`**: create an access token at [expo.dev](https://expo.dev) → account settings → **Access tokens**. In this repo, add it under **Settings → Environments → `production` → Environment secrets** (the workflow uses `environment: production` so the token is read from that environment — this is unrelated to EAS “production” builds; CI still uses the **`preview`** profile only).
4. **Optional — non-production API**: set `EXPO_PUBLIC_API_URL` for the **preview** [EAS environment](https://docs.expo.dev/build-reference/variables/). Local `.env` is not used on EAS.
5. Push to `main`. Build URLs appear in the workflow log on [expo.dev](https://expo.dev) for **both** platforms.

Manual run: **Actions → EAS Preview (iOS + Android) → Run workflow**.

CI never runs the **`production`** profile; that profile exists only for manual / future store releases.

---

## Tech Stack

### Frontend

| Layer | Choice |
|---|---|
| Framework | React Native + Expo SDK 54 |
| Language | TypeScript |
| Navigation | React Navigation v7 (bottom tabs + native stack) |
| State | React Context + useReducer |
| Persistence | AsyncStorage (local cache + offline) |
| Animations | Lottie (`lottie-react-native`), `Animated` API |
| Charts | `react-native-chart-kit` + `react-native-svg` |
| Gradients | `expo-linear-gradient` |
| Icons | `@expo/vector-icons` (Ionicons) |
| Auth | JWT (stored in AsyncStorage), biometric + MPIN lock |
| Push Notifications | `expo-notifications` |
| Currency rates | Open exchange rates API (live + historical) |
| Splash | `expo-splash-screen` + Lottie (`assets/Finance.json`) |

### Backend

| Layer | Choice |
|---|---|
| Language | Go 1.22 |
| Router | `go-chi/chi` v5 |
| Database | PostgreSQL 16 (via `pgx/v5`) |
| Auth | JWT (`golang-jwt/jwt` v5), bcrypt passwords |
| Migrations | `golang-migrate/migrate` v4 (embedded SQL) |
| Deployment | Railway (production) |
| Local dev | Docker Compose (Postgres + API) or `make run` |

---

## Project Structure

```
.
├── app.json                     # Expo config (name, splash, icons, bundle ids)
├── eas.json                     # EAS Build: preview (APK) + production (AAB)
├── .github/workflows/
│   └── eas-preview.yml          # CI: EAS preview iOS + Android
├── App.tsx                      # Root component, providers, LottieSplashGate
├── index.ts                     # Entry — preventAutoHideAsync + registerRootComponent
├── assets/
│   ├── Finance.json             # Lottie animated splash
│   └── icon.png                 # App icon (launcher + store)
└── src/
    ├── components/
    │   ├── common/              # FadeSlide, LoadingSpinner, EmptyState, PinPad, SyncErrorBanner, etc.
    │   ├── dashboard/           # SavingsProgress, SpendingChart, CategorySummary
    │   ├── goals/               # GoalCard, BudgetTracker, NoSpendChallenge, SavingsPulseCard, SavingsStreakCard
    │   ├── insights/            # CategoryPieChart, WeeklyBar, MonthlyTrend, CategoryRankBars, TransactionMixCard
    │   ├── splash/              # LottieSplashGate
    │   └── transactions/        # TransactionItem, TransactionFilterModal
    ├── constants/               # colors.ts, themes.ts (dark + light), categories.ts
    ├── context/
    │   ├── AppContext.tsx        # Transactions, goals, budgets, challenge state
    │   ├── AuthContext.tsx       # JWT, MPIN, biometric, profile
    │   ├── CurrencyContext.tsx   # Display currency, live rates, formatting
    │   └── ThemeContext.tsx      # Dark / light mode (follows system, saveable)
    ├── hooks/                   # useConvertedTransactions, useSyncTransactions, useCountUp, useNotifications
    ├── navigation/
    │   ├── RootNavigator.tsx    # Stack: Login, Register, Lock, MainTabs, Account, AddTransaction, etc.
    │   └── TabNavigator.tsx     # Bottom tabs: Home, Transactions, Insights, Goals
    ├── screens/
    │   ├── auth/                # LoginScreen, RegisterScreen, LockScreen, MPINSetupScreen
    │   ├── HomeScreen.tsx
    │   ├── TransactionsScreen.tsx
    │   ├── AddTransactionScreen.tsx
    │   ├── TransactionDetailScreen.tsx
    │   ├── GoalsScreen.tsx
    │   ├── InsightsScreen.tsx
    │   └── AccountScreen.tsx
    ├── services/
    │   ├── api.ts               # Typed fetch wrapper, all endpoint helpers, userFacingApiMessage
    │   └── notifications.ts     # Schedule daily reminder, weekly report, budget alert
    ├── storage/storage.ts       # AsyncStorage read/write
    ├── types/index.ts           # Transaction, SavingsGoal, Budget, NoSpendChallenge, AppState
    └── utils/
        ├── calculations.ts      # Totals, trends, category breakdowns
        ├── exchangeRates.ts     # Live rate fetch + fallback
        ├── historicalRates.ts   # Historical rate fetch (locked at save time)
        ├── formatters.ts        # Currency, date, initials
        ├── transactionMap.ts    # Backend ↔ local Transaction mapping
        ├── transactionFilters.ts
        ├── goalBudgetMap.ts
        └── appAlert.ts          # Themed Alert wrapper
```

The **Go API** (Postgres, Docker, migrations) lives in a **separate git repository** and is deployed to Railway — it is not part of this tree.

---

## Features

### 1. Animated Launch

- **Native splash**: brand background (`#0A0E21`) while JS loads.
- **Lottie intro**: `Finance.json` plays once full-screen via `LottieSplashGate`, then fades out to the app.

### 2. Authentication

- Register / login backed by the Go API (JWT issued, stored locally).
- **MPIN** (4-6 digit PIN) and **biometric** (Face ID / fingerprint) lock — activated when the app goes to background.
- JWT stored in AsyncStorage; auto sign-out when a token is rejected by the server.

### 3. Home Dashboard

- Greeting with time-aware salutation and avatar.
- Hero balance card (total balance, monthly income, expenses).
- Quick-stat chips: savings rate, top expense category, transaction count.
- 7-day spending line chart.
- Recent 5 transactions.
- Smart alert banner (high spend / great savings rate).

### 4. Transaction Tracking

- Add / edit / delete transactions: amount, type, category, note, date.
- **Multi-currency**: each transaction has its own currency; historical exchange rate locked at save time.
- 15 categories with icons, filtered by income/expense.
- Quick date picker (calendar modal + prev/next day arrows + Today/Yesterday chips).
- List grouped by date with relative labels.
- Search by note or category; filter by type; animated filter modal.
- Swipe-to-delete with confirm.
- Transaction detail screen with locked rate info.

### 5. Goals & Challenges

- **No-Spend Challenge**: commit to zero discretionary spending for 3/7/14/30 days. Day-by-day tile tracker with streak counter.
- **Savings Goals**: named monthly target, progress tracked as net savings (income − expenses).
- **Category Budgets**: per-category monthly limits with colour-coded bars (yellow at 80%, red over).
- **Savings streak** and **pulse cards** on the Goals screen.

### 6. Insights

- Month selector (navigate any past month).
- Key metric cards: savings rate, active categories, transaction count.
- Top expense category highlight.
- Category pie chart with legend and amounts.
- Weekly comparison bar chart with % change badge and spending tip.
- 6-month income vs expense trend lines.
- Category rank bars.
- Transaction mix card (income vs expense ratio).
- Auto-generated smart tips.

### 7. Account & Settings

- Edit name / email (synced to backend).
- Avatar (camera / gallery / remove).
- **Dark / light mode toggle** (follows system on first launch, saved in AsyncStorage).
- **Display currency** (INR, USD, EUR, GBP, NPR, AED, JPY, AUD) with live rate fetch.
- Notification toggles: daily reminder, budget alerts, weekly report.
- MPIN setup / change / disable.
- Biometric toggle.
- Initial balance (offset for pre-existing account balance).
- Data & storage usage estimate.
- Sign out.

### 8. Backend API

Base URL: `https://backendfintech-production.up.railway.app`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Create account |
| POST | `/auth/login` | Get JWT |
| GET | `/api/dashboard` | Monthly summary + recent transactions |
| GET/POST | `/api/transactions` | List / create transactions |
| PUT/DELETE | `/api/transactions/:id` | Update / delete |
| GET/POST/DELETE | `/api/goals` | Savings goals |
| GET/POST/DELETE | `/api/budgets` | Category budgets |
| GET/POST/DELETE | `/api/challenge` | No-spend challenge |
| GET/PUT | `/api/user` | Profile + balance |

---

## Getting Started

### Frontend

```bash
git clone <repo-url>
cd FinTechAPP
npm install
```

Copy and edit the env file:

```bash
cp .env.example .env
# Production (default):
# EXPO_PUBLIC_API_URL=https://backendfintech-production.up.railway.app
# Local backend:
# EXPO_PUBLIC_API_URL=http://localhost:8080
```

```bash
npx expo start           # Expo Go (scan QR)
npx expo start --ios     # iOS simulator
npx expo start --android # Android emulator
```

### Backend (separate repo)

The **Go + PostgreSQL** API is not in this repository — use your backend repo for local dev (`docker compose`, `make run`, migrations) and Railway deploys. Point `EXPO_PUBLIC_API_URL` in `.env` at that API (production or localhost).

---

## Data Model

```typescript
Transaction {
  id: string                     // UUID (backend) or timestamp+random (local-only)
  type: 'income' | 'expense'
  amount: number
  currency: string               // ISO 4217 (e.g. 'INR', 'USD')
  category: CategoryId           // one of 15 categories
  note: string
  date: string                   // ISO 8601
  // exchange-rate snapshot (locked at save time, never recalculated)
  convertedAmount?: number
  baseCurrency?: string
  rateUsed?: number
}

SavingsGoal { id, name, targetAmount, month, currency, createdAt }
Budget       { id, category, limit, month, currency }
NoSpendChallenge { id, startDate, durationDays, isActive }
```

Local state is persisted to AsyncStorage key `@fintrack_state_v1` and synced with the backend on every app focus.

---

## Design Tokens

| Token | Value |
|-------|-------|
| Background (dark) | `#0A0E21` |
| Surface (dark) | `#141829` |
| Primary purple | `#6C63FF` |
| Income green | `#4CAF50` |
| Expense red | `#FF5252` |
| Background (light) | `#F0F3FA` |

---

## License

MIT
