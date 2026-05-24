---
name: project_ios_app_store_id
description: Apple App ID is missing — needed to add iOS fallback URL to the Rate the App button in Settings
metadata:
  type: project
---

The "Rate the App" button in `app/(tabs)/settings.tsx` (`handleRateApp`) uses `expo-store-review`. When the native in-app review dialog is unavailable, it falls back to the Play Store URL. The iOS App Store fallback is intentionally skipped until the app is published on iOS.

**Why:** App was Android-only at the time of implementation. iOS bundle ID is `io.github.helloRupa.simplybudget` but the numeric Apple App ID (needed for the App Store URL `https://apps.apple.com/app/id<APPLE_APP_ID>`) doesn't exist yet.

**How to apply:** Once the app is published on the Apple App Store, get the numeric Apple App ID from App Store Connect and add a platform branch to `handleRateApp` in `app/(tabs)/settings.tsx`:
```ts
// TODO already present — replace it with:
if (Platform.OS === 'ios') {
  await Linking.openURL('https://apps.apple.com/app/id<APPLE_APP_ID>');
} else {
  await Linking.openURL('https://play.google.com/store/apps/details?id=io.github.helloRupa.simplybudget');
}
```
