# AndroidReactPlayer

A clean, single-screen Android audio player built with React Native.

Load audio files from your device and control playback with volume, fast-forward, rewind, play, and stop.

---

## Screenshot

```
┌─────────────────────────────┐
│       REACT PLAYER          │
│    Android · Local Audio    │
│                             │
│  ▁▂▄▇▅▃▁▂▄▇▅▃▁▂▄▇▅▃▁▂▄▇   │
│  Bohemian Rhapsody          │
│  Local Device File          │
│  0:42 ━━━━━━━●──────── 5:54│
│                             │
│  [⏪10s] [⏹] [▶] [⏩10s]  │
│                             │
│  🔈 ━━━━━━━━━━━━● 🔊  87%  │
│                             │
│  [📂  Load Audio File]      │
└─────────────────────────────┘
```

---

## Features

- **Load local audio** — MP3, AAC, FLAC, WAV, OGG via Android file picker
- **Play / Pause** — with pulsing animation while playing
- **Stop** — stops and resets position to start
- **Rewind** — jumps back 10 seconds
- **Fast Forward** — jumps ahead 10 seconds
- **Seek bar** — drag to any position
- **Volume slider** — 0–100%
- **Background playback** — audio continues when screen is off
- **Lock screen / notification controls** — standard Android media controls

---

## Requirements

| Tool | Version |
|------|---------|
| Node.js | ≥ 18 |
| React Native | 0.73.x |
| Android Studio | Hedgehog or newer |
| JDK | 17 |
| Android SDK | API 34 |
| Gradle | 8.3 |

---

## Quick Start

### 1. Clone & install

```bash
git clone https://github.com/edmund-landgraf/AndroidReactPlayer.git
cd AndroidReactPlayer
npm install
```

### 2. Generate a debug keystore (one-time)

```bash
cd android/app
keytool -genkeypair -v \
  -storetype PKCS12 \
  -keystore debug.keystore \
  -storepass android \
  -alias androiddebugkey \
  -keypass android \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -dname "CN=Android Debug,O=Android,C=US"
cd ../..
```

### 3. Connect a device or start an emulator

```bash
adb devices   # verify device is listed
```

### 4. Run

```bash
# Terminal 1 — Metro bundler
npm start

# Terminal 2 — build & install
npm run android
```

---

## Project Structure

```
AndroidReactPlayer/
├── App.tsx                         # Single screen — all UI & logic
├── index.js                        # Entry point, registers PlaybackService
├── app.json
├── package.json
├── babel.config.js
├── metro.config.js
├── tsconfig.json
└── android/
    ├── build.gradle                # Root Gradle config
    ├── settings.gradle
    ├── gradle.properties
    ├── gradle/wrapper/
    │   └── gradle-wrapper.properties
    └── app/
        ├── build.gradle            # App-level Gradle config
        ├── proguard-rules.pro
        └── src/main/
            ├── AndroidManifest.xml # Permissions + service declaration
            ├── java/com/androidreactplayer/
            │   ├── MainActivity.kt
            │   └── MainApplication.kt
            └── res/values/
                ├── strings.xml
                └── styles.xml
```

---

## Key Dependencies

| Package | Purpose |
|---------|---------|
| `react-native-track-player` | Audio engine with background/notification support |
| `react-native-document-picker` | System file picker for local audio files |
| `@react-native-community/slider` | Seek bar and volume slider |

---

## Permissions

The app requests these Android permissions:

| Permission | Why |
|-----------|-----|
| `READ_MEDIA_AUDIO` | Read audio files (Android 13+) |
| `READ_EXTERNAL_STORAGE` | Read audio files (Android 12 and below) |
| `FOREGROUND_SERVICE` | Keep audio playing in background |
| `FOREGROUND_SERVICE_MEDIA_PLAYBACK` | Required for media foreground services (Android 14+) |
| `WAKE_LOCK` | Prevent CPU sleep during playback |

---

## Supported Audio Formats

Whatever MediaPlayer on the device supports — typically:

- MP3, AAC, M4A
- FLAC, WAV, OGG
- OPUS, AMR

---

## Troubleshooting

**"No audio plays after picking a file"**
- Check that `READ_MEDIA_AUDIO` permission was granted at runtime (Android 13+)
- The app requests it automatically via DocumentPicker

**"Build fails with Kotlin version error"**
- Make sure your Android Studio has Kotlin plugin ≥ 1.8.0

**"Gradle sync fails"**
- Run `cd android && ./gradlew clean` then retry

**Metro bundler port conflict**
```bash
npm start -- --reset-cache
```

---

## License

MIT
