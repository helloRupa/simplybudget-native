Audit my React web project at `../simplyBudget/src`.

Do NOT write any React Native code yet. Your only output is a markdown audit report saved to `./audit-report.md`.

For every component file, produce a table row with these columns:

| Component | Type | Web-only APIs / libs | RN Complexity | Recommended Approach |

Where:

- **Type**: `presentational` | `stateful` | `page/screen` | `layout`
- **Web-only APIs / libs**: list anything that won't work in RN (CSS modules, localStorage, DOM APIs, web-only npm packages, HTML elements like table/form/input)
- **RN Complexity**: `Low` (mostly JSX swap) | `Medium` (some logic rewrite) | `High` (major rewrite or no RN equivalent)
- **Recommended Approach**: one sentence — e.g. "Direct port, swap div→View and CSS→StyleSheet" or "Replace recharts with victory-native" or "Rewrite as FlatList-based screen"

After the table, add three sections:

## Charts & Data Visualisation

List every charting/graphing library used and its recommended React Native replacement.

## Navigation & Routing

Map every route/page to a proposed React Navigation screen name and navigator type (Stack, Tab, or Drawer).

## Global State & Data Fetching

Note any custom hooks, context providers, or data-fetching patterns that need special attention in RN (e.g. async storage migration, network calls that assume a browser environment).

---

Save the completed report as `./audit-report.md` and tell me when it's done.
