---
name: Storage strategy — SQLite only, no AsyncStorage
description: All app data including preference scalars must go in expo-sqlite; AsyncStorage is explicitly not used in this project
type: project
---

All data — budget records and preference scalars — is stored exclusively in expo-sqlite. AsyncStorage is not used anywhere in the app.

**Why:** `weeklyBudget` and `firstUseDate` are load-bearing values. `firstUseDate` anchors the all-time savings/overspend calculation; `weeklyBudget` is the primary budget tracking value. Losing either to cache eviction or a user manually clearing app storage would corrupt the user's financial history. SQLite is a proper database with durable storage.

**How to apply:** Preferences (weeklyBudget, firstUseDate, locale, currency) are stored in a `preferences` table (key TEXT PRIMARY KEY, value TEXT). Do not reach for AsyncStorage for any purpose in this app.
