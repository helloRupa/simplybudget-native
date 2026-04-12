# Build Options

## Preview Builds (iOS & Android)

EAS (Expo Application Services) is the standard way to build preview APKs/IPAs for Expo apps.

### 1. Install EAS CLI & log in

```bash
npm install -g eas-cli
eas login
```

If you don't have an Expo account, create one at expo.dev first.

### 2. Initialize EAS in the project

```bash
eas init
```

This adds a `projectId` to `app.json` and links to your Expo account.

### 3. Configure the build

```bash
eas build:configure
```

This creates `eas.json`. A typical `preview` profile:

```json
{
  "build": {
    "preview": {
      "android": { "buildType": "apk" },
      "ios": { "simulator": true }
    }
  }
}
```

- **Android** `apk` — installs directly on a device/emulator, no Play Store needed
- **iOS** `simulator: true` — runs on iOS Simulator; real device requires an Apple Developer account

### 4. Run the preview build

```bash
# Both platforms
eas build --profile preview --platform all

# Or one at a time
eas build --profile preview --platform android
eas build --profile preview --platform ios
```

Builds run in the cloud. When done, you get a download link for the `.apk` or `.ipa`.

---

## Free iOS Build Options

### Expo Go (no build required)

Best option for real-device testing during development:

```bash
npx expo start
```

Scan the QR code with the **Expo Go** app (free on App Store). No build needed. Works unless you're using custom native modules outside of Expo's managed set.

### iOS Simulator build (EAS free tier)

EAS free tier includes cloud build minutes. No Apple Developer account needed:

```json
{
  "build": {
    "preview": {
      "ios": { "simulator": true }
    }
  }
}
```

```bash
eas build --profile preview --platform ios
```

Downloads as a `.tar.gz` — extract and drag into the iOS Simulator. Requires a Mac with Xcode + Simulator installed.

### Local build (Mac + Xcode, no EAS account required)

Build directly with Xcode — no EAS account, no Apple Developer account, no cloud involved:

```bash
npx expo run:ios
```

Requires Xcode installed. Launches the app in the iOS Simulator automatically.

> Note: `eas build --local` is a different command that still requires the EAS CLI and being logged in. Use `npx expo run:ios` to avoid EAS entirely.

### Real device for free (7-day workaround)

A free Apple Developer account lets you sideload via Xcode, but the certificate expires every 7 days and must be re-signed. Tools like **AltStore** automate re-signing, but it's cumbersome. The $99/yr paid account is the practical path for real-device distribution.

---

## Notes

- Free EAS accounts get a limited number of build minutes per month
- For iOS on a real device, you need an Apple Developer account ($99/yr) — EAS handles provisioning profiles automatically
- Android APKs can be sideloaded; iOS `.ipa` files for real devices require TestFlight or direct install via a provisioning profile
