# utubee

Minimal media wall with local watch-state tracking.
Now supports **YouTube Videos** and **Photo Galleries** mixed in one feed.

Clean tiles, click-to-play, zero backend.

## Features
- **Mixed Media Grid:**
  - YouTube videos (click-to-play, official embed)
  - Photo Galleries (mini-grid preview)
- **Immersive Gallery:**
  - Click a gallery card to open the detail grid.
  - Click a photo to enter **Fullscreen Lightbox**.
  - **Loupe Zoom:** Click and hold on high-res images to inspect details with a flashlight-style zoom.
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
4. **Edit Mode:** Click "Edit" on any item in the list to modify it.
5. Click **Generate JSON**.
6. Copy the output into `content.json` (replacing the old `videos.json` if you still have it).
7. Commit → Refresh wall.

## Tech Stack
- Static HTML/CSS/JS
- GitHub Pages friendly
- No build step required
- Automatic thumbnail handling for supported hosts (opu.peklo.biz)