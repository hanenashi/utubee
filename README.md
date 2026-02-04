# utubee

Minimal media wall with local watch-state tracking.
Now supports **YouTube Videos** and **Photo Galleries** mixed in one feed.

Clean tiles, click-to-play, zero backend.

## Features
- **Mixed Media Grid:**
  - YouTube videos (click-to-play, official embed)
  - Photo Galleries (mini-grid preview, full-screen lightbox)
- **Watch states** stored locally per browser:
  - Green border = Unseen
  - Orange border = Partially seen
  - No border = Seen
- **Smart Tracking:**
  - Videos mark as "seen" when you press play.
  - Galleries mark as "seen" when you open them.
  - Right-click (desktop) or Long-press (mobile) to cycle state manually.
- **Privacy:** Everything stored in `localStorage` (no accounts, no tracking).

## Pages
- **Wall (The Feed):**
  https://hanenashi.github.io/utubee/
- **Admin Helper (Manage Content):**
  https://hanenashi.github.io/utubee/admin.html

## Updating Content
1. Open `admin.html`.
2. **To add Videos:** Paste YouTube links (one per line).
3. **To add Galleries:** Switch to the "Add Gallery" tab, enter a title, and paste image URLs.
4. Click **Generate JSON**.
5. Copy the output into `content.json` (replacing the old `videos.json`).
6. Commit → Refresh wall.

## Tech Stack
- Static HTML/CSS/JS
- GitHub Pages friendly
- No build step required