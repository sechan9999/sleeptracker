# Sleep Tracker — Mobile PWA

A mobile-first Progressive Web App to track daily sleep and wake times.

## Features

- **One-tap logging** — tap "Sleep now" at bedtime, "Wake up" in the morning
- **Manual entry** — log any past date with notes
- **Weekly view** — visual bar chart of the current week
- **Trend chart** — last 14 nights at a glance
- **Consistency score** — measures how regular your bedtime/wake schedule is
- **Offline support** — works without internet via Service Worker
- **Add to Home Screen** — installable as a native-like app on iOS and Android

## Usage

Just open `index.html` in a browser, or deploy to any static host (GitHub Pages, Netlify, Vercel).

### Add to Home Screen (mobile)

- **iOS Safari**: Share → Add to Home Screen
- **Android Chrome**: Menu → Add to Home Screen

## Deploy to GitHub Pages

1. Push to a GitHub repo
2. Go to Settings → Pages → Source: main branch / root
3. Your app is live at `https://<username>.github.io/<repo-name>/`

## Tech

- Vanilla HTML / CSS / JavaScript (no framework)
- Chart.js for trend visualization
- localStorage for data persistence
- Service Worker for offline caching

## Screenshot

> Mobile-first dark UI optimized for one-handed use at bedtime.
