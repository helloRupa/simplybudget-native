# SimplyBudget — React Native Migration Plan

> Source: `../simplyBudget/src` · Plan created: 2026-04-06

---

## Library Replacement Map

| Web Library / API | Used In | React Native Replacement |
|---|---|---|
| `recharts` | `SpendingChart.tsx` | `react-native-gifted-charts` |
| `localStorage` | `utils/storage.ts` → `BudgetContext` | `expo-sqlite` (structured data) + `AsyncStorage` (prefs) |
| `next/font` (Google Fonts) | `app/layout.tsx` | `expo-font` |
| `FileReader`, `URL.createObjectURL()` | `utils/backup.ts` | `expo-file-system` + `expo-sharing` |
| Programmatic file import | `utils/backup.ts` | `expo-document-picker` |
| `<select>` | `Header`, `ExpenseForm`, `ExpenseFilters`, `RecurringExpenseManager`, `Settings` | Custom modal picker or `@react-native-picker/picker` |
| `<input type="date">` | `ExpenseForm`, `ExpenseFilters` | `@react-native-community/datetimepicker` |
| `document.addEventListener()` (Escape) | `AboutModal.tsx` | RN `Modal` built-in dismiss |
| `<table>` / `<thead>` / `<td>` etc. | `ExpenseList.tsx` | `FlatList` with card-row renderer |
| Inline SVG icons | `Header`, `ExpenseFilters` | `@expo/vector-icons` |
| `next/router`, Next.js tab state | `app/page.tsx` | `@react-navigation/bottom-tabs` + `@react-navigation/stack` |
| CSS `width %` progress bar | `Dashboard.tsx` | Two `View` components with flex/absolute width |
| `Intl.NumberFormat` (older Android) | `utils/currency.ts` | `@formatjs/intl-numberformat` polyfill (if needed) |

Libraries that transfer unchanged: `date-fns`, `i18n/locales.ts`, `utils/recurring.ts`, `utils/dates.ts`, `utils/currency.ts` (Expo SDK 49+ / Hermes supports `Intl`).

---

## Navigator Structure

```
RootStack (Stack — @react-navigation/stack)
└── MainTabs (Bottom Tabs — @react-navigation/bottom-tabs)
    ├── DashboardScreen
    ├── ExpensesScreen
    │     └── → push → ExpenseFormScreen
    └── SettingsScreen
          └── → push → RecurringExpensesScreen

Overlays (no navigator):
  - AboutModal  (RN Modal — triggered by an "About" row at the bottom of SettingsScreen)
  - Toast       (react-native-toast-message or custom)
```

---

## Phases

---

### Phase 1 — Project Foundation & Navigation Shell
**Goal:** Runnable app with correct tab/stack structure and fonts loaded. No real screens yet — just placeholders.

**Complexity:** Low  
**Dependencies:** None — this is the prerequisite for every other phase.

#### Tasks
1. **Install navigation packages**
   ```
   npx expo install @react-navigation/native @react-navigation/bottom-tabs @react-navigation/stack
   npx expo install react-native-screens react-native-safe-area-context
   ```
2. **Configure `App.tsx`** — set up `NavigationContainer` → `RootStack` → `MainTabs` with three placeholder screens (Dashboard, Expenses, Settings).
3. **Load fonts** — install `expo-font`, configure `useFonts` hook in `App.tsx` (replaces `app/layout.tsx` / `next/font`).
4. **Drop `app/layout.tsx`** — not needed in RN.
5. **Port `AppName.tsx`** (Low) — trivial: `<h1>`/`<h2>` → `<Text>` with style variants.

**Result:** Three-tab shell launches on simulator; `AppName` renders correctly.

---

### Phase 2 — SQLite Schema & Storage Layer
**Goal:** Establish the data layer before any screen that reads or writes budget data. All other data-dependent phases depend on this.

**Complexity:** Medium  
**Dependencies:** Phase 1 must be complete (app must boot).

#### Tasks
1. **Install storage packages**
   ```
   npx expo install expo-sqlite @react-native-async-storage/async-storage
   ```
2. **Design SQLite schema** — tables to create on first launch:
   - `expenses` (id, amount, category, date, note, isRecurring, recurringId)
   - `recurring_expenses` (id, amount, category, description, frequency, nextDue, lastProcessed)
   - `budget_history` (id, month, weeklyBudget, totalSpent)
   - `categories` (id, name, colour, icon)
   - `meta` (key TEXT PRIMARY KEY, value TEXT) — for weeklyBudget scalar
3. **Rewrite `utils/storage.ts`** — replace `localStorage` wrappers with async SQLite helpers (`getExpenses`, `saveExpense`, `deleteExpense`, etc.) and AsyncStorage wrappers for preferences (locale, currency).
4. **Verify with a simple read/write smoke test** before wiring into context.

**Result:** Storage layer is independently testable; `storage.ts` API surface stays the same so `BudgetContext` changes are isolated to import/call-site updates.

---

### Phase 3 — Global State (BudgetContext)
**Goal:** Port `BudgetContext` so all screens share live budget state backed by SQLite.

**Complexity:** Medium  
**Dependencies:** Phase 2 (storage layer) must be complete.

#### Tasks
1. **Update `context/BudgetContext.tsx`** — swap all `storage.ts` calls (formerly `localStorage`) for the new async SQLite/AsyncStorage helpers from Phase 2. `useReducer` pattern is unchanged.
2. **Hydrate on mount** — `useEffect` reads from SQLite into state (replaces the synchronous `localStorage.getItem` pattern with `await`).
3. **Persist on change** — existing `useEffect` write-back pattern is unchanged; only the storage calls differ.
4. **Carry over unchanged:** `utils/recurring.ts`, `utils/currency.ts`, `utils/dates.ts`, `i18n/locales.ts`, all `t()` / `tc()` / `fc()` / `fd()` helpers.
5. **Wrap `App.tsx`** in `<BudgetProvider>`.

**Result:** Context is live; placeholder screens can call `useBudget()` and see real (empty) state.

---

### Phase 4 — Low-Complexity UI Components
**Goal:** Port all stateless / nearly-stateless presentational components that have no chart or form complexity.

**Complexity:** Low  
**Dependencies:** Phase 1 (navigation shell), Phase 3 (context available but not required for all of these).

#### Components (ordered)

| Component | Notes |
|---|---|
| `Toast.tsx` | `div`/`button` → `View`/`Pressable`; `setTimeout` unchanged; or adopt `react-native-toast-message` |
| `AboutModal.tsx` | `div` → `View`; `img` → `Image`; drop `document.addEventListener` — RN `Modal` handles dismiss natively |
| `Header.tsx` | `<select>` → modal picker; inline SVG icons → `@expo/vector-icons`; `<button>` → `Pressable` |

**Result:** App shell has a working header, toast notifications, and about modal.

---

### Phase 5 — Medium-Complexity Screens
**Goal:** Port the three interactive form/list screens. These require working context (Phase 3) and pickers/date inputs.

**Complexity:** Medium  
**Dependencies:** Phase 3 (BudgetContext), Phase 4 (Header, Toast).

#### Install dependencies first
```
npx expo install @react-native-community/datetimepicker @react-native-picker/picker
```

#### Components (ordered by internal dependency)

1. **`RecurringExpenseManager.tsx`** → `RecurringExpensesScreen`
   - Port form controls: `<input>` → `TextInput`, `<select>` → picker, `<button>` → `Pressable`.
   - Logic (date math via `date-fns`, recurring rules) transfers unchanged.
   - _Must be built before Settings, which links to it._

2. **`ExpenseFilters.tsx`**
   - `<input type="text">` → `TextInput`; `<input type="date">` → `DateTimePicker`; `<select>` → picker.
   - SVG search icon → `@expo/vector-icons`.
   - _Must be built before ExpenseList, which hosts it._

3. **`ExpenseList.tsx`** → `ExpensesScreen`
   - Drop HTML `<table>` entirely; replace with `FlatList` and a card-row item renderer.
   - Single RN layout replaces the web's dual desktop/mobile branches.
   - Embed `ExpenseFilters` at top of screen.

4. **`ExpenseForm.tsx`** → `ExpenseFormScreen` (pushed from ExpensesScreen)
   - Replace `<form>` / `<input>` with `TextInput`; date input → `DateTimePicker`; `<select>` → picker.
   - `HTMLInputElement` refs → RN `useRef<TextInput>`.

**Result:** Users can view, filter, add, edit, and delete expenses; recurring expense management works.

---

### Phase 6 — High-Complexity Screens (Charts & File I/O)
**Goal:** Port the two most complex components — the dashboard with chart and the settings screen with backup/restore.

**Complexity:** High  
**Dependencies:** Phase 3 (BudgetContext), Phase 5 (ExpenseForm, RecurringExpensesScreen must exist to link from Settings).

#### Install dependencies first
```
npx expo install react-native-gifted-charts
npx expo install expo-file-system expo-sharing expo-document-picker
```

#### Components (ordered)

1. **`SpendingChart.tsx`**
   - Remove all `recharts` imports.
   - Rewrite using `react-native-gifted-charts` `BarChart`.
   - Re-express SVG `linearGradient` fills via library gradient props.
   - _Must be built before Dashboard, which embeds it._

2. **`Dashboard.tsx`** → `DashboardScreen`
   - Rewrite as `ScrollView`-based screen.
   - Embed `SpendingChart` (from above).
   - Rebuild CSS `width %` progress bar as two `View` components (background track + filled bar) using flex or percentage width.
   - Budget summary cards: `div` → `View`, text → `Text`.

3. **`Settings.tsx`** → `SettingsScreen`
   - Port all form controls to RN equivalents.
   - Replace `FileReader` / `URL.createObjectURL()` export with `expo-file-system` write → `expo-sharing` share sheet.
   - Replace file import (programmatic `<input type="file">`) with `expo-document-picker` → `expo-file-system` read.
   - Link to `RecurringExpensesScreen` via stack push.
   - Add an "About" row at the bottom of the screen; tapping it sets local `isAboutVisible` state → renders `<AboutModal visible={isAboutVisible} onClose={() => setIsAboutVisible(false)} />`.

**Result:** All screens are fully functional; the app is feature-complete.

---

### Phase 7 — Polish & Cross-Platform QA
**Goal:** Ensure correct behaviour on both iOS and Android; handle edge cases.

**Complexity:** Low–Medium  
**Dependencies:** All previous phases complete.

#### Tasks
1. **`Intl.NumberFormat` polyfill** — test currency formatting on older Android (Hermes). Add `@formatjs/intl-numberformat` if needed.
2. **Safe area insets** — audit all screens for `SafeAreaView` / `useSafeAreaInsets` usage (notch, home indicator, dynamic island).
3. **Keyboard avoiding** — wrap forms in `KeyboardAvoidingView` with correct `behavior` per platform (`padding` on iOS, `height` on Android).
4. **DateTimePicker platform differences** — `@react-native-community/datetimepicker` renders as a spinner on Android and an inline/modal picker on iOS; verify UX on both.
5. **Picker styling** — `@react-native-picker/picker` looks different per platform; wrap in a styled `View` for visual consistency.
6. **Tab bar icons** — wire up `@expo/vector-icons` icons for each bottom tab.
7. **Accessibility** — add `accessibilityLabel` props to all interactive elements.
8. **Performance** — ensure `FlatList` in `ExpensesScreen` uses `keyExtractor` and `getItemLayout` if the list grows large.

---

## Dependency Graph (summary)

```
Phase 1 (Navigation Shell)
    └── Phase 2 (SQLite Schema)
            └── Phase 3 (BudgetContext)
                    ├── Phase 4 (Low-complexity UI)
                    │       └── Phase 5 (Medium screens)
                    │               └── Phase 6 (High-complexity screens)
                    │                       └── Phase 7 (Polish & QA)
                    └── Phase 6 also depends directly on Phase 5
```

No phase can begin until all phases it depends on (directly or transitively) are complete.

---

## What Transfers Unchanged

These files can be copied directly from `../simplyBudget/src` with zero modifications:

- `utils/recurring.ts`
- `utils/currency.ts` *(may need `Intl` polyfill — see Phase 7)*
- `utils/dates.ts`
- `i18n/locales.ts`
- All TypeScript interfaces / types (if defined separately)
