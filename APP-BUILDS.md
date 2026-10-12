# NYVEX desktop and Android apps

NYVEX now has native app shells that open the live workspace at https://nyvex-kati.onrender.com. The existing Node.js backend stays on Render; the Windows app and Android app do not contain API keys or a second backend.

## Download prebuilt apps

Every successful run of **Build NYVEX native apps** on the GitHub Actions tab produces:
- **Windows installer** — `NYVEX-Setup-1.0.0-x64.exe`
- **Windows portable app** — `NYVEX-Portable-1.0.0-x64.exe`
- **Android APK** — `NYVEX-Android-1.0.0-debug.apk`

Open the repository's Actions tab, select the latest successful **Build NYVEX native apps** run, then download the Windows or Android artifact. Unzip the artifact archive to access the installer or APK. A release created from an `app-v*` tag includes the same files directly under Releases.

## Windows

Run the installer and follow its prompts. The portable EXE can be launched without installation. These builds are not code-signed, so Windows may show an unverified-publisher notice. The app requires an internet connection and signs in through the same NYVEX website account flow.

## Android

Copy the APK to your Android device and open it to install. Android may warn that the APK was downloaded outside the Play Store. This is a debug-signed sideload build for personal testing, not a Play Store release package. Keep the APK from the GitHub build you trust.

## Build locally

Windows desktop (Windows, Node.js 22+):
```powershell
cd desktop
npm install
npm run dist:win
```

Android (Node.js 22+, Android SDK, Java 21):
```bash
cd mobile
npm install
npx cap add android
npx cap sync android
cd android
./gradlew assembleDebug
```

The Android build uses a native speech-recognition plugin for microphone input. NYVEX's voice interface still asks for explicit user interaction and requires microphone permission. Spoken AI replies and cloud AI requests require internet access. The app shells load the production website, so updates to the web interface and backend arrive from Render without reinstalling; native plugin/permission changes require a new app build.

## Important limits

These are installable connected apps, not offline AI models. AI, account login, cloud memory, and voice generation depend on the live Render service and its configured providers/quotas. Chat history stored locally by a browser may be separate between the desktop, Android app, and ordinary browser session.
