# Playlist catalog pipeline

Regenerates `src/data/playlistSources.ts` — the verified catalog of public
playlist sources used by the admin **Discover** page.

Everything is measured live, nothing is hand-written. Run from the repo root,
in this order (intermediate data lands in `.scratch/data/`, which is gitignored):

```bash
node scripts/catalog/discover.mjs         # iptv-org API indexes + per-country counts
node scripts/catalog/collect-iptvorg.mjs  # every published iptv-org playlist URL
node scripts/catalog/verify-playlists.mjs # HTTP 200 + valid M3U + channel count (~470 playlists)
node scripts/catalog/probe-others.mjs     # Free-TV and other community repos
node scripts/catalog/probe-fast.mjs       # FAST services (Samsung TV Plus, Plex, Roku, Tubi)
node scripts/catalog/crawl-streams.mjs    # opens all ~18k streams: alive? CORS-playable? (~25 min)
node scripts/catalog/gen-sources.mjs      # writes src/data/playlistSources.ts
```

`crawl-streams.mjs` is what produces the `metrics` numbers in the catalog:

- `alive` — share of streams that answered with a valid HLS manifest
- `direct` — share that also sent CORS headers, i.e. hls.js can play them
  straight from the browser, with no `/api/stream-proxy` and no server traffic

Results are geo-dependent: a stream that is geo-blocked from where the crawl
ran counts as dead. The admin Discover page re-verifies every candidate from
the server at import time anyway, so the catalog metrics are only used for
ordering ("best yield first").

Pluto TV is intentionally excluded from the catalog: its manifests only allow
`Origin: pluto.tv`, so they can never play without a proxy.
