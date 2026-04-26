# SimplyBudget

A simple privacy-focused budgeting app. All of your expenses remain on your device and under your control. Optionally opt into crash reporting, notifications, and screen-lock protection.

[Privacy Policy](https://gist.github.com/helloRupa/132f443ccd82fdfe95302c99ff3d9c36)

## Features

- Create, read, update, and delete expenses, recurring expenses, and spending categories
- Update weekly spending budget
- Track weekly and overall spending against a set budget
- Track spending across categories
- Backup and restore past budget data
- Opt into notifications for updating expenses (daily) or backing up data (weekly)
- Opt into crash reporting
- Opt into screen lock protection: uses your existing screen lock to unlock the app on load or after sleep

# Contributing

Contributing is easy! Just follow a few simple rules and use the git workflow.

## Rules

- A user's financial data must never be transmitted to any server
- Do not install any packages that might violate a user's privacy, e.g., analytics
- Do not install any packages that are deprecated or poorly maintained
- Never solicit payment for any additional services or features

## Git workflow

1. Fork this repo
2. Create a new branch with a meaningful name, e.g., "feature-addLocationToExpenses" (I'm not terribly fussed about the format)
3. Keep your work focused on the type of work described in the feature's name
4. Once you're done, raise a PR!

# Built with Expo and React Native

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Install simulators:
   - [Android](https://docs.expo.dev/workflow/android-studio-emulator/)
   - [iOS](https://docs.expo.dev/workflow/ios-simulator/)

3. Start the app

   ```bash
   // Apple iOS simulator
   npx expo run:ios

   // Android simulator
   npx expo run:android
   ```

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).
