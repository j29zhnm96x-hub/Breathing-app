# Breathe - Breathing Exercise App

A full-featured Wim Hof-style breathing exercise PWA with guided cycles, custom routines, session history, dark mode, and offline support.

## Features

- **Guided Breathing Sessions** - Tap-and-hold inhale/exhale with timed hold phases and recovery breaths
- **Custom Exercises** - Create, edit, duplicate, and delete exercises with configurable cycles, breath counts, and hold times
- **Session History & Stats** - Track completed sessions, total minutes, and daily streak
- **Dark Mode** - Toggle between light and dark themes (persisted in settings)
- **Haptic Feedback** - Vibration cues on mobile devices during breathing phases
- **Audio Cues** - Sound-based cues with speech synthesis fallback when audio files are missing
- **Offline Support** - Full PWA with service worker for offline use
- **Installable** - Add to home screen on iOS and Android
- **Accessible** - ARIA labels, keyboard support (Space/Enter), Escape to close modals, focus management
- **Responsive** - Works on mobile, tablet, and desktop

## Getting Started

### Run Locally

Open `index.html` directly in a browser, or start a development server:

```bash
npm install
npm run dev
```

### Install as PWA

- **iOS Safari**: Tap Share > Add to Home Screen
- **Android Chrome**: Tap the menu > Install app / Add to Home Screen
- **Desktop Chrome/Edge**: Click the install icon in the address bar

## Audio Files

Place audio cues in the `Audio/` folder. The app looks for:

| Cue Key | Default File |
|---------|-------------|
| Start session | `Audio/three_two_one.mp3` |
| Last breath | `Audio/last-breathe_now-hold.mp3` |
| Recovery hold | `Audio/hold_for_10_seconds.mp3` |
| Next cycle | `Audio/next-cycle.mp3` |
| Session finished | `Audio/session-finished.mp3` |

If an audio file is missing, the app falls back to speech synthesis.

## Project Structure

```
index.html          Main app shell
script.js           App logic (BreathingApp class)
styles.css          Styling with CSS custom properties for theming
manifest.json       PWA manifest
sw.js               Service worker for offline caching
package.json        Dev dependencies
Audio/              Audio cue files (.mp3)
IMG/                App icons
```

## Tech Stack

- Vanilla JavaScript (no frameworks)
- CSS3 with custom properties
- Lucide Icons (CDN)
- Web APIs: SpeechSynthesis, Vibration, Service Worker, localStorage

## License

MIT