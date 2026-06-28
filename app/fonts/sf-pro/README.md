# SF Pro (self-hosted)

These files are **not committed** by default. Run from the repo root:

```bash
npm run setup:fonts
```

That downloads SF Pro from Apple's official CDN, extracts it, and generates Latin-subset WOFF2 files here.

**Source:** https://developer.apple.com/fonts/  
**Direct download:** https://devimages-cdn.apple.com/design/resources/download/SF-Pro.dmg

## License

Apple's SF Pro license restricts use. Read the license in the downloaded DMG before deploying. By running `setup:fonts` you agree to Apple's terms. These subset files are for this project's web UI only — do not redistribute separately.

## Files generated

| File | Weight |
|---|---|
| `SF-Pro-Text-Regular.woff2` | 400 |
| `SF-Pro-Text-Medium.woff2` | 500 |
| `SF-Pro-Text-Semibold.woff2` | 600 |
| `SF-Pro-Text-Bold.woff2` | 700 |

Requires: `p7zip-full` (or 7z), Python 3, `fonttools` (`pip install fonttools brotli`).
