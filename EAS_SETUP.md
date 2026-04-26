# EAS Build Setup

## Secret Files

`google-services.json` (Android) and `GoogleService-Info.plist` (iOS) are excluded from git because they contain API keys. They are required for Firebase/Crashlytics and must be uploaded to EAS as project secrets before building.

### First-time setup

Run once per environment you intend to build for (`preview`, `production`, `development`):

```bash
eas env:create --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json --visibility secret --environment preview
eas env:create --name GOOGLE_SERVICES_INFO_PLIST --type file --value ./GoogleService-Info.plist --visibility secret --environment preview

eas env:create --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json --visibility secret --environment production
eas env:create --name GOOGLE_SERVICES_INFO_PLIST --type file --value ./GoogleService-Info.plist --visibility secret --environment production
```

### How it works

EAS stores the files and exposes them during builds as env vars (`$GOOGLE_SERVICES_JSON`, `$GOOGLE_SERVICES_INFO_PLIST`) containing the **path** to each file in the build environment. `app.config.js` reads those env vars and passes the paths directly to the `googleServicesFile` fields, falling back to the local file paths for local development. No shell scripts or file copying needed.

### Updating the secret files

If the Firebase config files change (e.g. after rotating keys):

```bash
eas env:delete --name GOOGLE_SERVICES_JSON --environment preview
eas env:create --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json --visibility secret --environment preview

eas env:delete --name GOOGLE_SERVICES_INFO_PLIST --environment preview
eas env:create --name GOOGLE_SERVICES_INFO_PLIST --type file --value ./GoogleService-Info.plist --visibility secret --environment preview
```

Repeat for other environments (`production`, etc.) as needed.

### Verify secrets are uploaded

```bash
eas env:list --environment preview
eas env:list --environment production
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
