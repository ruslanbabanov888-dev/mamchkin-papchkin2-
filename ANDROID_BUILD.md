# Android test build

This repository uses Capacitor 8.6.2 to package the existing static game as an Android app.

- App name: Мамчкин и Папчкин
- Android application ID: `ru.mamchkinpapchkin.app`
- Web source: the existing audited files in the repository root
- Capacitor web output: `www/`

## Build a debug APK with GitHub Actions

1. Push or update the branch `rustore/capacitor-android-setup`.
2. Open the repository's **Actions** tab.
3. Select **Android debug APK** and open the latest run.
4. Wait for all build steps to pass.
5. Download the artifact named `mamchkin-papchkin-debug-apk`.

The artifact is a debug APK for internal device testing. It is not a signed release build and must not be submitted to RuStore.

## Local build

Requirements: Node.js 22, Java 21, Android SDK.

```bash
npm install
npm run prepare:web
npx cap add android
npx cap sync android
cd android
./gradlew assembleDebug
```

The game remains an offline-first static app. Cloud services, VK SDKs, advertising SDKs, and release signing are not configured by this setup.
