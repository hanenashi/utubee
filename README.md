# utubee

Minimal YouTube video wall with local watch-state tracking.

Clean tiles, click-to-play, no YouTube clutter, no backend.

## Features
- Grid of YouTube video previews
- In-tile playback (official YouTube embed, policy-safe)
- Watch states stored locally per browser:
  - Green border = not seen
  - Orange border = partially seen
  - No border = seen
- Click to play → marks video as seen
- Right-click (desktop) or long-press (mobile) to cycle state manually
- Adjustable tile size and border thickness
- Everything stored in `localStorage` (no accounts, no tracking)

## Pages
- Wall (share with friends):  
  https://hanenashi.github.io/utubee/
- Admin helper (generate `videos.json`):  
  https://hanenashi.github.io/utubee/admin.html

## Updating videos
1. Open `admin.html`
2. Paste YouTube links (one per line)
3. Copy generated JSON into `videos.json`
4. Commit → refresh wall

Static site. GitHub Pages friendly.
