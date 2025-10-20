# Galaxy Splash Background - Upload Instructions

## What This Is

This is the background image for your Devvit **splash screen** - the loading screen that appears BEFORE your webview game loads. This is what shows in Reddit posts when someone clicks to open your app.

## Current Situation

Your splash currently shows a **blue background** because it's using the default image:

```
https://i.redd.it/71i7wq0xripf1.gif
```

## Files Created

1. **galaxy-splash-background.svg** - Animated galaxy background (1200x800)
   - Twinkling stars
   - Nebula clouds
   - Your brand colors
   - Subtle animations

## How to Update

### Step 1: Create a Static Version (Recommended)

Since Reddit's splash might not support SVG animations, I recommend creating a PNG:

1. Open `galaxy-splash-background.svg` in a browser
2. Take a screenshot or export as PNG (1200x800 or larger)
3. Or use an online SVG to PNG converter

**Recommended dimensions**: 1500x1024 (matches Pixelary)

### Step 2: Upload to Reddit

1. Go to Reddit image uploader (or upload as a post image)
2. Upload your PNG
3. Get the `i.redd.it` URL
4. Example: `https://i.redd.it/your-image-id.png`

### Step 3: Update Your Code

#### Option A: Set Global Default (Recommended)

Use the admin endpoint to set it for all posts:

```bash
curl -X POST http://localhost:3000/internal/admin/set-splash-background \
  -H "Content-Type: application/json" \
  -d '{"backgroundUri": "https://i.redd.it/your-image-id.png"}'
```

#### Option B: Update the Default Constant

Edit `src/server/core/post.js`:

```javascript
const SPLASH_BACKGROUND_URI = 'https://i.redd.it/your-image-id.png';
```

#### Option C: Per-Post Override

When creating posts, pass a custom `backgroundUri`:

```javascript
const post = await createLevelPost({
  title: 'My Level',
  splash: {
    heading: 'Level Name',
    backgroundUri: 'https://i.redd.it/your-image-id.png', // Custom background
  },
  // ...
});
```

## Design Specs

Your galaxy splash uses:

- **Base colors**:

  - Deep space: `#0b1020`
  - Mid tones: `#0e1830`, `#152238`
  - Highlights: `#2a4d7c`

- **Star colors**:

  - Bright stars: `#e5f0ff`
  - Dim stars: `#9bb3c8`
  - Accent stars: `#5ed4ff` (cyan), `#60f0af` (green), `#6aa8ff` (blue)

- **Effects**:
  - Radial gradient glow from top
  - Nebula clouds (12% opacity)
  - Twinkling stars
  - Subtle glow filters

## Alternative: Simple Gradient

If you want an even simpler splash without stars, create a basic gradient:

```svg
<svg width="1500" height="1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="bg" cx="50%" cy="30%">
      <stop offset="0%" style="stop-color:#2a4d7c;stop-opacity:0.6" />
      <stop offset="100%" style="stop-color:#0b1020;stop-opacity:1" />
    </radialGradient>
  </defs>
  <rect width="1500" height="1024" fill="url(#bg)" />
</svg>
```

## Testing

1. Update the background URI
2. Create a new test post
3. Open it in Reddit
4. Check that the splash shows your galaxy background
5. Verify it looks good on mobile and desktop

## Notes

- Reddit splash screens show while the webview loads
- They support images from `i.redd.it` domain only
- Max file size: typically 5-10MB
- Recommended format: PNG or GIF
- SVG might work but PNG is safer

## Current Splash Config

Your posts currently use these splash settings:

```javascript
splash: {
  appDisplayName: 'Galaxy Explorer',
  backgroundUri: '<your-image-url>',
  heading: 'Galaxy Explorer',
  description: 'Pilot your ship, dodge enemies and top the leaderboard.',
  buttonLabel: 'Enter Space Battle',
}
```

Only the `backgroundUri` needs to be updated!

## Quick Start

**Fastest way to test locally**:

1. For development, you can temporarily use a data URI or local URL
2. Once it looks good, upload to Reddit for production
3. Use the admin endpoint to update globally

## References

- Devvit Splash Docs: https://developers.reddit.com/docs/
- Your implementation: `src/server/core/post.js`
- Admin endpoint: `POST /internal/admin/set-splash-background`
