# Plan: Configurable Week Start Day

## Summary

Add a `weekStartDay` preference (0–6) that controls which day of the week budgets start on. Settable from Settings (mentioned in last onboarding slide) and changeable at any time from Settings. When changed, `firstUseDate` and all `budget_history` entries are shifted to align with the new day, so all calculations remain consistent going forward.

---

## Rules

- `firstUseDate` is never after a user's first expense by calendar date
- This feature must work for new users with no expenses, existing users with no expenses, and existing users with expenses

## Steps

### 1. Migration

Add `weekStartDay` column to the `preferences` table — same `ALTER TABLE` pattern used for `onboardingComplete`:

```sql
ALTER TABLE preferences ADD COLUMN weekStartDay INTEGER NOT NULL DEFAULT 1 CHECK (weekStartDay BETWEEN 0 AND 6)
```

Default `1` (Monday) at the column level matches current hardcoded behaviour, so existing users are unaffected silently. For brand-new users (no `firstUseDate` yet), derive the initial value from the OS locale using `expo-localization`'s `getCalendars()[0]?.firstWeekday` (CLDR 1–7, where 1 = Sunday) and convert to date-fns's 0–6 convention via `(firstWeekday - 1) % 7`. Fall back to `1` if unavailable.

### 2. Update `utils/dates.ts`

Replace the 4 hardcoded `weekStartsOn: 1` values with a `weekStartsOn` parameter:

- `getWeekRange(date, weekStartsOn)`
- `getWeekRanges(firstUseDate, weekStartsOn)`
- `getTotalBudgeted` delegates to `getWeekRanges` so it picks up the change automatically

### 3. Load preference in BudgetContext

Read `weekStartDay` from preferences on init alongside `weeklyBudget` and `firstUseDate`. Expose it on context. Thread it into all calls to `getWeekRange` and `getWeekRanges`.

### 4. Update last onboarding slide

Add a short informative line to the last onboarding slide mentioning that the budget start day can be configured. No picker needed — the existing action button already navigates to Settings.

### 5. Add Settings row

Add a "Budget start day" row to Settings. The row label includes an experimental indicator (e.g. "Budget start day (Experimental)" or a small "Experimental" badge next to the label). Clicking "Set Budget Start Day" navigates to a new screen, similar to "Recurring Expenses". The screen includes a day picker. Order the days in the picker according to the user's locale convention (e.g., Sunday-first in US, Monday-first in EU) — derived from the same `expo-localization` `firstWeekday` used for the new-user default.

Include a warning blurb in the "Set Budget Start Day" screen covering, in order:

1. Users should **back up or export their budget history** before proceeding, in case anything goes wrong. Include a button to do so. Behavior for creating a JSON backup in Settings can be copied here.
2. Changing the day will shift historical week boundaries and may affect existing calculations.
3. Users can add a one-off expense (with a negative amount for a credit or positive for a debit) to manually account for any difference in the transition week.

Gate the actual write behind a confirmation modal (a custom modal component, not the native `Alert` API) that re-surfaces points 1–2 immediately before applying the change. Include two buttons: OK (write the new start day), Cancel (do nothing and close the modal).

### 6. Implement the change handler

When the user saves a new `weekStartDay` in Settings:

1. **No-op early return.** If `newDay === currentWeekStartDay`, return immediately — avoids a pointless transaction and unnecessary re-renders.

2. **Compute the candidate.** Find the matching weekday closest to `currentFirstUseDate` (forward or backward, whichever is fewer days; on a tie prefer backward):

   ```ts
   const back = startOfWeek(parseISO(currentFirstUseDate), {
     weekStartsOn: newDay,
   });
   const fwd = addDays(back, 7);
   const dBack = differenceInCalendarDays(parseISO(currentFirstUseDate), back);
   const dFwd = differenceInCalendarDays(fwd, parseISO(currentFirstUseDate));
   const candidate = dBack <= dFwd ? back : fwd;
   ```

   If `currentFirstUseDate` is already on `newDay`, `back === currentFirstUseDate` and is chosen.

3. **Apply the expense guard.** Run `SELECT MIN(date) FROM expenses`. If any expense is strictly _before_ the candidate, shift back one week (preserves the weekday):

   ```ts
   const newFirstUseDate =
     earliestExpense !== null &&
     earliestExpense < format(candidate, "yyyy-MM-dd")
       ? subDays(candidate, 7)
       : candidate;
   ```

   A single 7-day shift is always sufficient. Proof: `candidate` is within ±3 days of `currentFirstUseDate`, and `currentFirstUseDate ≤ earliest expense` is an invariant maintained before this flip, so `candidate − 7 ≤ currentFirstUseDate − 4 < earliest expense`.

   Strict `<` (not `≤`) is deliberate: an expense exactly on the candidate is in the first week — no shift needed — and the strict form preserves round-trip closure (e.g. Mon → Sun → Mon with an expense on Mon returns to Mon).

4. **Compute the delta in days.**

   ```ts
   const deltaDays = differenceInCalendarDays(
     parseISO(newFirstUseDate),
     parseISO(currentFirstUseDate),
   );
   ```

   May be zero, positive, or negative.

5. **Apply the delta uniformly to `budget_history`.** Build the SQLite date modifier string in JS (e.g. `` `${deltaDays >= 0 ? "+" : ""}${deltaDays} days` ``) and run a single update:

   ```sql
   UPDATE budget_history SET startDate = date(startDate, ?)
   ```

   Every existing row was on the old weekday and shifts by the same delta, so all rows land on the new weekday and the 7-day spacing is preserved — no `startDate` unique-constraint collisions are possible.

6. **Persist the new preferences.** Write `newFirstUseDate` and `weekStartDay = newDay` to the `preferences` table.

7. **Wrap steps 5–6 in a single SQLite transaction** (`db.withTransactionAsync`) so a crash mid-write cannot leave the database in a half-shifted state.

8. **Dispatch updated state** so the Dashboard re-renders with the new week boundaries reflected in the current-week view, totals, and history. The expense-form and recurring-expense-form date pickers also bound their selectable range on `state.firstUseDate` (`minimumDate` plus the `date < firstUseDate` validation in the expense form), so they pick up the shifted value from the same dispatch — no code change is required in those components. The expense guard in step 6.3 keeps `firstUseDate ≤ earliest expense`, so a forward shift can never push the minimum past an existing expense and leave it uneditable. (The expense-list filter in `ExpenseFilters.tsx` is intentionally unbounded by `firstUseDate` and is unaffected.)

**Drift property:** Closest-match has the property that any round trip whose intermediate weekdays stay within ±3 days of the origin closes cleanly (e.g. Mon → Sun → Mon, Mon → Fri → Mon, Mon → Thu → Mon all return to Mon). Round trips that wander further (e.g. Mon → Sun → Sat → Fri → Thu → Mon) can shift the result by one week per such excursion. The expense guard ensures `firstUseDate` can never move past existing expense data, so even when drift occurs it stays within the valid range.

`startOfWeek` from `date-fns` (already imported) and SQLite's `date()` modifier both handle calendar edge cases (month and year boundaries). All dates are stored as `YYYY-MM-DD` and operated on in local time, so there's no timezone ambiguity.

### 7. Add translations

Add i18n keys for all user-facing copy.

### 8. Tests

- Update `utils/dates.ts` tests to exercise non-Monday start days.
- Test the `firstUseDate` derivation logic:
  - `currentFirstUseDate` already on `newDay` → returned as-is.
  - Closest match is backward (fewer days back than forward) → preceding matching weekday returned.
  - Closest match is forward → next matching weekday returned.
  - Tie (impossible for integer day counts, but verify backward is preferred on the boundary).
  - Expense guard: earliest expense strictly before candidate → `candidate − 7` returned.
  - Expense guard: earliest expense exactly on candidate → candidate returned unchanged (round-trip preservation).
  - Expense guard: earliest expense after candidate → candidate returned unchanged.
  - No expenses → candidate returned unchanged.
- Test the delta application to `budget_history`:
  - All rows shift by the same delta and land on the new weekday.
  - 7-day spacing is preserved across rows.
  - Round-trip invariance: flipping Mon → Sun → Mon restores the original `firstUseDate` and every `budget_history.startDate`.
- Test that the whole change handler runs inside a single SQLite transaction (e.g. by spying on `db.withTransactionAsync`).

---

## Files likely touched

| File                        | Change                                                                                                                                                     |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `utils/dates.ts`            | Add `weekStartsOn` param to `getWeekRange`, `getWeekRanges`                                                                                                |
| `utils/database.ts`         | Migration: add `weekStartDay` column                                                                                                                       |
| `utils/storage.ts`          | Read/write `weekStartDay`; query `MIN(date)` from `expenses` for the anchor; apply a uniform delta to `budget_history.startDate` via a single SQL `UPDATE` |
| `context/BudgetContext.tsx` | Load + expose `weekStartDay`; implement change handler                                                                                                     |
| `app/(tabs)/settings.tsx`   | New "Budget start day" row with picker and warning                                                                                                         |
| Onboarding slide component  | Add informative text line                                                                                                                                  |
| `i18n/locales.ts`           | New translation keys                                                                                                                                       |
| `__tests__/`                | Update date utils tests; add shift logic tests                                                                                                             |
