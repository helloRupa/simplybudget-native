# Plan: Configurable Week Start Day

## Summary

Add a `weekStartDay` preference (0–6) that controls which day of the week budgets start on. Settable from the last onboarding slide (via Settings) and changeable at any time from Settings. When changed, `firstUseDate` and all `budget_history` entries are shifted to align with the new day, so all calculations remain consistent going forward.

---

## Steps

### 1. Migration

Add `weekStartDay` column to the `preferences` table — same `ALTER TABLE` pattern used for `onboardingComplete`:

```sql
ALTER TABLE preferences ADD COLUMN weekStartDay INTEGER NOT NULL DEFAULT 1 CHECK (weekStartDay BETWEEN 0 AND 6)
```

Default `1` (Monday) at the column level matches current hardcoded behaviour, so existing users are unaffected silently. For brand-new users (no `firstUseDate` yet), derive the initial value from the OS locale using `expo-localization`'s `getCalendars()[0]?.firstWeekday` (CLDR 1–7, where 1 = Sunday) and convert to date-fns's 0–6 convention via `(firstWeekday - 1) % 7`. Fall back to `1` if unavailable.

### 2. Update `utils/dates.ts`

Replace the 4 hardcoded `weekStartsOn: 1` values with a `weekStartsOn` parameter:

- `getWeekRange(date, weekStartsOn)` — lines 14–15
- `getWeekRanges(firstUseDate, weekStartsOn)` — lines 92, 100
- `getTotalBudgeted` delegates to `getWeekRanges` so it picks up the change automatically

### 3. Load preference in BudgetContext

Read `weekStartDay` from preferences on init alongside `weeklyBudget` and `firstUseDate`. Expose it on context. Thread it into all calls to `getWeekRange` and `getWeekRanges`.

### 4. Update last onboarding slide

Add a short informative line to the last onboarding slide mentioning that the budget start day can be configured. No picker needed — the existing action button already navigates to Settings.

### 5. Add Settings row

Add a "Budget start day" row to Settings with a day picker. Order the days in the picker according to the user's locale convention (e.g., Sunday-first in US, Monday-first in EU) — derived from the same `expo-localization` `firstWeekday` used for the new-user default. Include a warning blurb that changing this will shift historical week boundaries and may affect existing calculations. Mention that users can add a one-off expense (with a negative amount for a credit or positive for a debit) to manually account for any difference in the transition week.

### 6. Implement the change handler

When the user saves a new `weekStartDay` in Settings:

0. If `newDay === currentWeekStartDay`, no-op and return early — avoids a pointless transaction and any unnecessary re-renders.
1. Compute new `firstUseDate` as the immediately preceding date matching the chosen weekday:
   ```ts
   startOfWeek(parseISO(currentFirstUseDate), { weekStartsOn: newDay });
   ```
2. Rewrite every `budget_history` `startDate` by applying the same function to each entry:
   ```ts
   startOfWeek(parseISO(entry.startDate), { weekStartsOn: newDay });
   ```
   No collision risk — the table enforces one entry per week start via `ON CONFLICT DO UPDATE`, so there is always at most one entry per week.
3. Write updated `firstUseDate` and `weekStartDay` to preferences in the same operation.
4. Dispatch updated state so all calculations re-run immediately, and ensure the Dashboard re-renders with the new week boundaries reflected in the current-week view, totals, and history.

All three writes in steps 1–3 must run inside a single SQLite transaction so a crash mid-migration cannot leave the database in a half-shifted state.

`startOfWeek` from `date-fns` (already imported) handles all calendar edge cases — month boundaries, year boundaries — so no risk of invalid dates. All dates in this app are stored as `YYYY-MM-DD`, so `parseISO` + `startOfWeek` operate in local time with no timezone ambiguity.

### 7. Add translations

Add i18n keys for the Settings row label, the day names (or use `Intl.DateTimeFormat` to derive them per locale), and the warning blurb.

### 8. Tests

- Update `utils/dates.ts` tests to exercise non-Monday start days
- Add tests for the `firstUseDate` shift logic
- Add a test asserting the `budget_history` rewrite produces correct `startDate` values

---

## Files likely touched

| File                        | Change                                                                         |
| --------------------------- | ------------------------------------------------------------------------------ |
| `utils/dates.ts`            | Add `weekStartsOn` param to `getWeekRange`, `getWeekRanges`                    |
| `utils/database.ts`         | Migration: add `weekStartDay` column                                           |
| `utils/storage.ts`          | Read/write `weekStartDay`; add function to rewrite `budget_history` startDates |
| `context/BudgetContext.tsx` | Load + expose `weekStartDay`; implement change handler                         |
| `app/(tabs)/settings.tsx`   | New "Budget start day" row with picker and warning                             |
| Onboarding slide component  | Add informative text line                                                      |
| `i18n/locales.ts`           | New translation keys                                                           |
| `__tests__/`                | Update date utils tests; add shift logic tests                                 |
