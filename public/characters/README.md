# Character art overrides

Every character is drawn as a layered, animated SVG by default. To swap in real art,
edit `src/characters/config.ts`:

```ts
cartman: {
  renderer: 'image',              // 'svg' (default) | 'image'
  images: {
    neutral: '/characters/cartman/neutral.png',
    angry: '/characters/cartman/angry.png',
    // …one image per expression; missing ones fall back to `neutral`
  },
},
```

Images go in this folder (e.g. `public/characters/cartman/angry.png`). Transparent PNG/WebP
works best. Animated WebP/GIF also work. Whole-body motion (bobbing, squash & stretch, shakes,
tantrums) is still applied by the character rig in image mode.
