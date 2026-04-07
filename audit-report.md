# SimplyBudget — React Native Port Audit

> Source: `../simplyBudget/src` · Audited: 2026-04-06

---

## Component Audit

| Component | Type | Web-only APIs / libs | RN Complexity | Recommended Approach |
|---|---|---|---|---|
| `app/page.tsx` | page/screen | Next.js page conventions, no DOM APIs | Low | Direct port as root `App.tsx`; replace tab state with `@react-navigation/bottom-tabs` |
| `app/layout.tsx` | layout | Next.js `Metadata`, Google Fonts via `next/font` | Low | Drop entirely; handle fonts via `expo-font` in `App.tsx` |
| `components/Header.tsx` | layout | Inline SVG icons, `<select>`, `<button>`, `<span>` | Low | Direct port; swap HTML elements → View/Text/Pressable; replace `<select>` with `Picker` or a custom modal picker |
| `components/Dashboard.tsx` | stateful | `<div>`, Recharts (`SpendingChart`), inline SVG progress bar | High | Rewrite as ScrollView screen; replace Recharts with `react-native-gifted-charts`; rebuild progress bar with View/width percentage |
| `components/SpendingChart.tsx` | presentational | **Recharts** (`BarChart`, `Bar`, `XAxis`, `YAxis`, `CartesianGrid`, `Tooltip`, `ResponsiveContainer`), SVG `linearGradient` | High | Replace entirely with `react-native-gifted-charts` BarChart; re-express gradient fills via library props |
| `components/ExpenseForm.tsx` | stateful | `<form>`, `<input type="text/number/date">`, `<select>`, `<label>`, `HTMLInputElement` refs | Medium | Rewrite form with `TextInput`, `Pressable`, and a native date picker (`@react-native-community/datetimepicker`); replace `<select>` with modal/picker |
| `components/ExpenseList.tsx` | stateful | `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`, `<td>` (desktop view); CSS media-query card layout (mobile view) | Medium | Replace table with `FlatList` using a card-row item renderer; drop desktop/mobile branch — single RN layout |
| `components/ExpenseFilters.tsx` | stateful | `<input type="text/date">`, `<select>`, inline SVG search icon | Medium | Swap inputs → `TextInput`; date inputs → `DateTimePicker`; `<select>` → modal picker; SVG icon → `@expo/vector-icons` |
| `components/Settings.tsx` | stateful | `<form>`, `<input>`, `<select>`, `FileReader`, `document.createElement()`, `URL.createObjectURL()` (export/import backup) | High | Port form controls to RN equivalents; replace file export with `expo-sharing` + `expo-file-system`; replace file import with `expo-document-picker` |
| `components/RecurringExpenseManager.tsx` | stateful | `<form>`, `<input>`, `<select>`, `<button>` | Medium | Direct port of logic; swap all HTML form elements to RN equivalents (`TextInput`, picker, `Pressable`) |
| `components/Toast.tsx` | presentational | `<div>`, `<button>`, `setTimeout`, `useRef` | Low | Direct port; swap div/button → View/Pressable; `setTimeout` works as-is; consider `react-native-toast-message` |
| `components/AboutModal.tsx` | presentational | `<div>`, `document.addEventListener()` (Escape key), `<img>` | Low | Direct port; swap div → View, img → Image; replace keyboard listener with RN `Modal` component's built-in dismiss handling |
| `components/AppName.tsx` | presentational | `<h1>`/`<h2>` via `as` prop | Low | Direct port; render as `<Text>` with appropriate style variant |
| `context/BudgetContext.tsx` | — | `localStorage` (via `storage.ts`), all browser-safe otherwise | Medium | Port as-is; replace `storage.ts` calls with `expo-sqlite` (all data including preferences); `useReducer` pattern transfers unchanged |

---

## Charts & Data Visualisation

| Library (Web) | Used In | React Native Replacement |
|---|---|---|
| `recharts` (`BarChart`, `Bar`, `XAxis`, `YAxis`, `CartesianGrid`, `Tooltip`, `ResponsiveContainer`) | `SpendingChart.tsx` | **`react-native-gifted-charts`** — drop-in bar/line chart API, supports gradients and custom tooltips |

No other visualisation libraries are used. The budget progress bar in `Dashboard.tsx` is built with plain CSS width percentages — rebuild as a pair of `View` components with flex or absolute widths.

---

## Navigation & Routing

The web app is a single Next.js route (`/`) with tab state managed by `useState`. Map to a bottom-tab navigator:

| Web "Tab" / State | Proposed Screen Name | Navigator Type |
|---|---|---|
| `activeTab === "dashboard"` | `DashboardScreen` | Bottom Tab |
| `activeTab === "expenses"` | `ExpensesScreen` | Bottom Tab |
| `activeTab === "settings"` | `SettingsScreen` | Bottom Tab |
| Expense add/edit (modal in web) | `ExpenseFormScreen` | Stack (pushed from Expenses tab) |
| Recurring expenses (panel in web) | `RecurringExpensesScreen` | Stack (pushed from Settings tab) |
| About modal | `AboutModal` | RN `Modal` (no navigator needed) |

**Recommended navigator structure:**

```
RootStack (Stack)
└── MainTabs (Bottom Tabs)
    ├── DashboardScreen
    ├── ExpensesScreen  →  push → ExpenseFormScreen
    └── SettingsScreen  →  push → RecurringExpensesScreen
```

---

## Global State & Data Fetching

### BudgetContext (`context/BudgetContext.tsx`)

- Uses `useReducer` — transfers to RN unchanged.
- On mount, hydrates state from `storage.ts` (localStorage). **Migration:** swap `storage.ts` for an `expo-sqlite` layer. All data goes into SQLite — including budget records (expenses, recurringExpenses, budgetHistory, categories) and preference scalars (weeklyBudget, firstUseDate, locale, currency). AsyncStorage is not used; `weeklyBudget` and `firstUseDate` are load-bearing values that must not be lost to cache eviction or a user clearing app storage.
- On every state change, persists to storage via `useEffect`. This pattern is identical in RN; only the storage calls change.

### `utils/storage.ts`

Thin `getItem` / `setItem` wrappers around `localStorage`. Replace with equivalent async wrappers over `expo-sqlite` (structured data) or `AsyncStorage` (key-value prefs). All call sites are inside `BudgetContext`, so the migration is contained to one file.

### `utils/backup.ts` & `utils/csv.ts`

Both use browser-only APIs (`FileReader`, `URL.createObjectURL()`, programmatic link clicks):

- **Export:** use `expo-file-system` to write the JSON/CSV to a temp file, then `expo-sharing` to invoke the native share sheet.
- **Import:** use `expo-document-picker` to let the user select a `.json` file; read it with `expo-file-system`.

### `utils/recurring.ts`

Pure date-math logic using `date-fns`. No browser APIs. Transfers to RN without changes.

### `utils/currency.ts` & `utils/dates.ts`

Use `Intl.NumberFormat` and `date-fns`. `Intl` is available in the Hermes JS engine (Expo SDK 49+) but may need `@formatjs/intl-numberformat` polyfill for older Android. `date-fns` works in RN unchanged.

### `i18n/locales.ts`

Plain object key-value translations. No browser APIs. Transfers unchanged. The `t()` / `tc()` / `fc()` / `fd()` helpers on `BudgetContext` are all pure functions — no changes needed.

### No network calls

The app is fully offline/client-side. No fetch, axios, or API calls to migrate.
