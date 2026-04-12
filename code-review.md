# Code Review — SimplyBudgetNative

**Overall:** The architecture is solid — clean reducer/context pattern, SQLite abstraction in `storage.ts`, consistent color tokens, good i18n coverage. The issues below range from a silent correctness bug to minor style nits.

---

## Bugs

### ~~1. `getBudgetForWeek` has a sort-order mismatch (affects chart accuracy)~~ ✅ Fixed

~~`getBudgetHistory` returns rows `ORDER BY startDate DESC`, but `getBudgetForWeek` (`utils/dates.ts:62–77`) is designed for ASC ordering: it walks forward, updating `activeBudget` while entries are ≤ the target week, then `break`s on the first entry that's past it. With DESC input it breaks immediately when the first (most recent) entry is after the target, falling back to `budgetHistory[0].amount` — the newest budget rather than the one active at that week. The `getTotalBudgeted` totals and the weekly spending chart will show wrong budget bars for any user who has ever changed their weekly budget.~~

**Fix applied in `utils/dates.ts`:** With DESC ordering, the first entry where `startDate <= weekStartStr` is the most recent active budget — return it immediately instead of walking and overwriting.

### ~~2. `importData` doesn't clear existing data before import (`BudgetContext.tsx:434–449`)~~ ✅ Fixed

~~`saveExpense` / `saveCategory` etc. are all upserts. Importing a backup doesn't delete expenses or recurring entries that exist locally but aren't in the backup — they survive alongside the imported data. Users who import a backup expecting a clean restore will end up with a mixed dataset.~~

**Fix applied in `context/BudgetContext.tsx`:** `importData` now runs the entire clear + write sequence inside `db.withTransactionSync`, so all four data tables are wiped and repopulated atomically. If any write fails mid-import, SQLite rolls back and the original data is preserved.

---

## Violations of CLAUDE.md Rules

### ~~3. Hardcoded color literal (`app/(tabs)/index.tsx:94`)~~ ✅ Fixed

~~CLAUDE.md says never hardcode rgba values. This should be a named token — something like `dangerBorder`, analogous to the existing `tealBorder`, `greenBorder`, `amberBorder`.~~

**Fix applied:** Added `dangerBorder: "rgba(248,113,113,0.3)"` token to `constants/colors.ts` and replaced the hardcoded literal in `app/(tabs)/index.tsx:94`.

### ~~4. Unused dependency (`package.json:17`)~~ ✅ Fixed

~~`@react-native-async-storage/async-storage` is listed as a dependency, but CLAUDE.md explicitly says AsyncStorage is not used and all data lives in expo-sqlite. This should be removed.~~

**Fix applied:** Removed `@react-native-async-storage/async-storage` from `package.json`.

---

## Design / Correctness

### ~~5. `getDatabase()` called in component body (`BudgetContext.tsx:189`)~~ ✅ Fixed

```ts
const db = getDatabase();
```

This runs on every render. The singleton prevents actual DB reconnection, but `db` is a new reference check on every render, causing all `useCallback([db])` dependencies to appear "stable" only by luck of JavaScript object identity (same singleton reference). A cleaner pattern: `const db = useMemo(() => getDatabase(), [])` or `const dbRef = useRef(getDatabase()); const db = dbRef.current`.

### ~~6. `isInRange` silently returns `true` on parse error (`utils/dates.ts:48–55`)~~ ✅ Fixed

~~A malformed date string in an expense would pass every date filter and always appear in results. Since expenses are parsed from SQLite rows you control, this is low-risk, but the silent `return true` on catch is fragile — `return false` would be safer to surface data issues.~~

**Fix applied in `utils/dates.ts`:** Changed `return true` to `return false` in the `catch` block so a malformed date string is excluded from filtered results rather than silently matching every filter.

### 7. CSV export passes raw ISO date strings (`app/(tabs)/settings.tsx:94`) Won't Do

```ts
await exportToCSV(state.expenses, t as (key: string) => string, tc, (d) => d);
```

The `formatDate` argument is the identity function, so dates in the CSV export are bare `YYYY-MM-DD` strings. Should pass `(d) => fd(d)` to get localized dates consistent with the rest of the UI.

---

## Code Quality

### ~~8. `recurring-expenses.tsx` is 620 lines with all form state inlined~~ ✅ Fixed

~~The component handles both the list view and the add/edit form with ~10 pieces of form state in the parent. Extracting a `RecurringExpenseForm` component would make both pieces easier to test and reason about.~~

**Fix applied:** Extracted `components/RecurringExpenseForm.tsx` (~260 lines) containing all form state, validation, and JSX. The screen (`app/recurring-expenses.tsx`) is now ~240 lines and owns only list/navigation concerns. `DAY_KEYS` and `MONTH_KEYS` are exported from the form file for reuse in `frequencyLabel`. The parent passes `key={editingExpense?.id ?? "new"}` so React remounts the form with fresh state when the editing target changes — no `useEffect` sync needed.

### ~~9. `SpendingChart`: unnecessary re-creation of `chartData` on tooltip state changes (`components/SpendingChart.tsx:79–114`)~~ ✅ Fixed

~~The `tooltip?.idx` is in the `useMemo` dep array so the `onPress` closures capture the current tooltip. This means every time a bar is tapped, the entire `chartData` array is recreated to update the active/inactive press state. Consider a `useCallback` per-bar approach or separating the selected-bar state from the chart data memo.~~

**Fix applied in `components/SpendingChart.tsx`:** Added `tooltipRef` (kept in sync via `tooltipRef.current = tooltip` on every render). The `onPress` closures now read `tooltipRef.current?.idx` instead of `tooltip?.idx`, so `tooltip?.idx` was removed from the `useMemo` dep array. `chartData` now only rebuilds when `data` changes.

### ~~10. Magic constant in `SpendingChart` (`components/SpendingChart.tsx:124`)~~ ✅ Fixed

~~```ts
const chartWidth = screenWidth - 72;

```~~

~~No comment explaining what 72 represents (section padding × 2 + container padding × 2 = 64? Not quite). A named constant with a comment would prevent silent drift if padding values change.~~

**Fix applied in `components/SpendingChart.tsx`:** Replaced the bare `72` with a named `CHART_HORIZONTAL_INSET` constant and a comment explaining the breakdown (content padding 16×2 + section padding 16×2 + 8px visual adjustment).

### ~~11. Missing `accessibilityRole="button"` on recurring list actions (`app/recurring-expenses.tsx:414–419`)~~ ✅ Fixed

~~The edit/delete `Pressable` elements in the list items don't have `accessibilityRole="button"`, unlike the form buttons and FAB in the expenses screen.~~

**Fix applied** during the #8 refactor: `accessibilityRole="button"` added to the Edit and Delete `Pressable`s in the list card.

---

## Summary

| Priority | Issue | File(s) |
|---|---|---|
| ~~High~~ | ~~`getBudgetForWeek` sort mismatch~~ ✅ | ~~`utils/dates.ts`, `utils/storage.ts`~~ |
| ~~High~~ | ~~`importData` doesn't clear before import~~ ✅ | ~~`context/BudgetContext.tsx`~~ |
| ~~Medium~~ | ~~Hardcoded `rgba` color literal~~ ✅ | ~~`app/(tabs)/index.tsx:94`~~ |
| ~~Medium~~ | ~~Unused AsyncStorage dependency~~ ✅ | ~~`package.json`~~ |
| ~~Medium~~ | ~~`getDatabase()` called in component body~~ ✅ | ~~`context/BudgetContext.tsx:189`~~ |
| Medium | CSV export uses identity date formatter | `app/(tabs)/settings.tsx:94` |
| ~~Low~~ | ~~`isInRange` returns `true` on parse error~~ ✅ | ~~`utils/dates.ts`~~ |
| ~~Low~~ | ~~`RecurringExpensesScreen` too large (620 lines)~~ ✅ | ~~`app/recurring-expenses.tsx`~~ |
| ~~Low~~ | ~~Tooltip state invalidates chart data memo~~ ✅ | ~~`components/SpendingChart.tsx`~~ |
| ~~Low~~ | ~~Magic `- 72` constant~~ ✅ | ~~`components/SpendingChart.tsx`~~ |
| ~~Low~~ | ~~Missing `accessibilityRole` on list actions~~ ✅ | ~~`app/recurring-expenses.tsx`~~ |

The most impactful fix is item 1 — users who've ever updated their weekly budget will see incorrect historical chart data until the sort order is aligned.
```
