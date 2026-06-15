# Project Rules — stellix-tv

Rules Claude must follow when working in this repository.

## Workflow

- **ALWAYS commit and push automatically.** After completing any code change, run
  `git commit` and `git push origin main` as the final step. Do **not** ask
  "push?" / "should I push?" — just do it.
- Work directly on the `main` branch. Pushing to `main` triggers an automatic
  Vercel deploy.
- Run `npx tsc --noEmit` to type-check before committing when changes are
  non-trivial.
- Write commit messages in English; keep them clear and descriptive.

## Communication

- The user communicates in Russian — reply in Russian.
- The app UI is multi-language; never hardcode user-facing strings (especially
  not Russian) — use the existing i18n / translation helpers.

## Project notes

- Next.js 16 (App Router, Turbopack) + React 19 + TypeScript + Tailwind v4.
- IPTV/HLS streaming app. Player: hls.js (see `src/components/player/`).
  Streams proxied via `src/app/api/stream-proxy/`.
- Channel list uses react-window v2 virtualization (`src/components/channels/`).
- Firestore for data/settings.
