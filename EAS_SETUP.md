# EAS Build Setup

## Secret Files

`google-services.json` (Android) and `GoogleService-Info.plist` (iOS) are excluded from git because they contain API keys. They are required for Firebase/Crashlytics and must be uploaded to EAS as project secrets before building.

### First-time setup

Run these commands from the project root (requires the local files to be present):

```bash
eas secret:create --scope project --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json
eas secret:create --scope project --name GOOGLE_SERVICES_INFO_PLIST --type file --value ./GoogleService-Info.plist
```

### How it works

EAS stores the files and exposes them during builds as env vars (`$GOOGLE_SERVICES_JSON`, `$GOOGLE_SERVICES_INFO_PLIST`) containing the path to each file in the build environment. The `prebuildCommand` in `eas.json` copies them to the project root before `expo prebuild` runs, which is when they're read from `app.json` and written into the native Android/iOS project.

### Updating the secret files

If the Firebase config files change (e.g. after rotating keys):

```bash
eas secret:delete --name GOOGLE_SERVICES_JSON
eas secret:create --scope project --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json

eas secret:delete --name GOOGLE_SERVICES_INFO_PLIST
eas secret:create --scope project --name GOOGLE_SERVICES_INFO_PLIST --type file --value ./GoogleService-Info.plist
```

### Verify secrets are uploaded

```bash
eas secret:list
```

## Build Profiles

| Profile       | Distribution | Notes                        |
| ------------- | ------------ | ---------------------------- |
| `development` | internal     | Includes dev client          |
| `preview`     | internal     | Production-like, no store    |
| `production`  | store        | Auto-increments build number |

## Common Commands

```bash
eas build --platform android --profile production
eas build --platform ios --profile production
eas build --platform all --profile preview
```
