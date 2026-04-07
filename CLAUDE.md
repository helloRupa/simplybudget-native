# Project: SimplyBudget — React Native (Mobile Port)

## Overview

This is a React Native (Expo) port of an existing React web dashboard/data app.
The web source lives at: `../simplyBudget/src`.
Target platforms: Android and iOS.

## Tech Stack

- **Framework:** Expo (managed workflow)
- **State:** useState / useEffect (same as web — no migration needed)
- **Storage:** expo-sqlite for all budget data and AsyncStorage for lightweight app preferences (replaces localStorage)
- **Styling:** React Native StyleSheet (replaces Tailwind CSS)

## Key Commands

```bash
npx expo start          # Start dev server
npx expo start --android  # Open on Android emulator
npx expo start --ios      # Open on iOS simulator
npx expo install        # Install Expo-compatible packages (use instead of npm install)
```

## Web → React Native Mapping (Quick Reference)

| Web                  | React Native                             |
| -------------------- | ---------------------------------------- |
| `<div>`              | `<View>`                                 |
| `<p>`, `<span>`      | `<Text>`                                 |
| `<img>`              | `<Image>`                                |
| `<input>`            | `<TextInput>`                            |
| `<button>`           | `<TouchableOpacity>` or `<Pressable>`    |
| `<ScrollView>` (web) | `<ScrollView>` ✅ same                   |
| CSS classes          | `StyleSheet.create({})`                  |
| `localStorage`       | `SQLite` (expo-sqlite) or `AsyncStorage` |
| `window.innerWidth`  | `Dimensions.get('window').width`         |
| `onClick`            | `onPress`                                |
| `onChange`           | `onChangeText`                           |

## Coding Rules

- Always use `<View>` not `<div>`, `<Text>` not `<p>` or `<span>`
- All text must be wrapped in `<Text>` — never render raw strings in JSX
- All user-facing text must be translated
- Use `StyleSheet.create()` for all styles — no inline style objects unless trivial
- Use `onPress` not `onClick`
- Use `npx expo install <package>` not `npm install` for new dependencies
- Never use web-only APIs: no `document`, `window` (except Dimensions), `localStorage`
- AsyncStorage is async — always use await, handle errors
- For charts/graphs, use `react-native-gifted-charts` or `victory-native`
- For data tables, use `react-native-table-component` or a FlatList-based approach

## Navigation Pattern

- Stack screens: `@react-navigation/stack`
- Bottom tabs (for dashboard sections): `@react-navigation/bottom-tabs`
- Drawer (for side nav): `@react-navigation/drawer`

## Dashboard-Specific Notes

- Charts: audit all charting libs from web — most won't work in RN, need RN-specific replacements
- Tables: HTML tables don't exist — use FlatList or a dedicated RN table library
- Responsive layout: use Flexbox (already how RN works) + Dimensions API for breakpoints
- Scrollable dashboard sections: wrap in ScrollView or use FlatList for long data lists

## Theming

All colors are defined in `constants/colors.ts` and imported into each `StyleSheet.create()`. Never hardcode color hex values directly in style objects — always reference a named token from `colors`.

```ts
import { colors } from "@/constants/colors";

const styles = StyleSheet.create({
  container: { backgroundColor: colors.background },
});
```

Current tokens: `background`, `surface`, `border`, `teal`, `white`, `textMuted`.

## Lessons Learned

<!-- Claude: add new rules here whenever you make a mistake and get corrected -->
