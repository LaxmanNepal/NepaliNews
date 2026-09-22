# Live News Engine

The site is a static PWA, so browser-to-RSS requests can be blocked by CORS. This repository now uses GitHub Actions as the live feed collector.

- Runs every 15 minutes and can be started manually.
- Reads every source from `feeds.json`.
- Parses RSS and Atom feeds.
- Deduplicates stories.
- Publishes `data/news.json`.
- Publishes `data/feed-health.json` for source health.
- The browser loads generated news first and falls back to direct RSS/proxy fetching if the generated dataset is unavailable.

No API key is required.
