# Soundtrack files

Each track looks for `.mp4`, then `.m4a`, then `.mp3`:

| Track | File name |
| --- | --- |
| E85 — Don Toliver (default) | `e85.m4a` |
| Purple Rain — Prince | `purple-rain.m4a` |
| Billie Jean — Michael Jackson | `billie-jean.m4a` |
| Thriller — Michael Jackson | `thriller.m4a` |

`npm run build:doppel` publishes the `.m4a` songs under a `.mp4` name (same audio): Cloudflare caches `.mp4` and
serves it in byte ranges, which iPhone Safari needs; `.m4a` it doesn't.

If a file is missing, the player falls back to an original procedural placeholder beat (marked "beat" in the track list).
