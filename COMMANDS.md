# NeuroFocus — Terminal Commands Reference

> **IMPORTANT:** Do NOT use `npx` — known EPERM bug with Node 24 on this machine.
> Always use `./node_modules/.bin/expo` directly.

## Running the App

| Purpose | Command |
|---|---|
| Start app | `cd ~/Desktop/NeuroFocus && ./node_modules/.bin/expo start` |
| Start with cache cleared | `./node_modules/.bin/expo start --clear` |
| Start on iOS simulator | `./node_modules/.bin/expo start --ios` |
| Start on Android emulator | `./node_modules/.bin/expo start --android` |

## Troubleshooting

| Purpose | Command |
|---|---|
| Clear Metro cache | `./node_modules/.bin/expo start --clear` |
| Clear Watchman cache | `watchman watch-del-all` |
| Full nuclear reset | `watchman watch-del-all && rm -rf node_modules/.cache && ./node_modules/.bin/expo start --clear` |
| Check what is on port 8081 | `lsof -i :8081` |
| Kill Metro bundler | `kill -9 $(lsof -ti:8081)` |

## Packages

| Purpose | Command |
|---|---|
| Install Expo-compatible package | `./node_modules/.bin/expo install <package-name>` |
| Install with npm | `npm install <package-name>` |
| Check installed packages | `cat package.json` |
| Check Expo version | `./node_modules/.bin/expo --version` |

## Code Checks

| Purpose | Command |
|---|---|
| TypeScript error check | `npx tsc --noEmit` |
| Check git status | `git status` |
| See unstaged changes | `git diff` |
| See recent commits | `git log --oneline -10` |

## Building for Distribution

| Purpose | Command |
|---|---|
| EAS dev build (iOS) | `./node_modules/.bin/eas build --profile development --platform ios` |
| EAS dev build (Android) | `./node_modules/.bin/eas build --profile development --platform android` |
| EAS preview build | `./node_modules/.bin/eas build --profile preview --platform all` |
| Publish update (OTA) | `./node_modules/.bin/eas update --branch preview` |
