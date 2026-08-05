# StudyFlow

My Personal Study Hub — a desktop-first study companion app. Features an AI Agent (Gemini-powered study tools), a code runner, a media player with live TV, notes, revision planner, pomodoro timer, calendar, class timetables, and personal space with local data storage.

## Stack

- **React + TypeScript + Vite** (`src/`)
- **Tailwind CSS** styling
- Packaged as a Windows desktop app with **Nativefier** + **Inno Setup** installer
- Data stored locally (IndexedDB / localStorage) — no backend required
- AI tools powered by the **Google Gemini API** (`gemini-3.6-flash`); bring your own API key in Settings

## Getting started

```bash
npm install
npm run dev        # start the dev server
npm run build      # production build to dist/
```

Open the app, reserve a username, and you're in.

## Packaging (Windows)

```bash
npm run windows:package   # nativefier build + portable ZIP + Inno Setup installer
npm run publish:github    # upload artifacts from public\releases to a GitHub Release
```

Release artifacts (ZIP / installer EXE) are published to `public/releases/` with matching `.sha256` checksums. They are **not stored in this repo** — the binaries exceed GitHub's 100 MB per-file repo limit, so they are hosted as **GitHub Release assets** (up to 2 GB each) and downloaded from there. The download links in the app and the marketing site point to `https://github.com/DharushShimry/StudyFlow/releases/latest/download/<file>`, so publishing a new release automatically updates every download button.

To publish a build: create the release on GitHub (tag it, e.g. `v1.0.0`), then run `npm run publish:github` — it uses the GitHub CLI if installed, otherwise a `GITHUB_TOKEN` personal access token with "Contents: read and write" permission.

## Project layout

- `src/` — the app (components, contexts, services, data)
- `Website/` — the separate marketing/landing site project
- `scripts/` — build, packaging, and backup tooling
- `installer/` — Inno Setup script (`StudyFlow.iss`)
