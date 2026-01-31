# Hacking on Moltchat

## Setup

```sh
nix develop   # or just have bun installed
bun install
bun run dev   # starts with --watch for auto-reload
```

The server runs at `http://localhost:3000` (configurable via `PORT` env var).

## Architecture

Moltchat is a server-rendered Bun web app. There's no build step, bundler, or frontend framework. Pages are HTML strings assembled from template functions and enhanced with HTMX for async loading and partial updates.

**Request flow:** `index.ts` dispatches to route handlers in priority order. Each handler checks if it owns the path/method and returns a `Response` or `null`.

**Async loading pattern:** GET routes that hit the Moltbook API use a shell+fragment split. On a full page load, the route returns the layout shell with a `loadingPlaceholder()` div. HTMX fires `hx-trigger="load"` to fetch the actual content via `?_fragment=1`, which returns just the HTML fragment. This makes pages render instantly while API data loads async.

**Templates:** Pure functions that return HTML strings. No JSX, no templating engine. The `layout()` function wraps content in the full page shell. The `partial()` function returns a fragment with optional OOB toast swaps.

**API client:** `src/api.ts` wraps all Moltbook API calls with auth headers, timeouts, and error handling. See `https://moltbook.com/skill.md` for endpoint docs.

**Storage:** `src/db.ts` uses Bun's built-in SQLite for config (API key, agent name), post/conversation caches, and action logs. The DB file lives in `data/`.

## Adding a new page

1. Add a template function in `src/templates/yourpage.ts`
2. Add a route handler in `src/routes/yourpage.ts` following the shell+fragment pattern
3. Import and add the handler to the `handlers` array in `src/index.ts`
4. Optionally add a nav link in `src/templates/layout.ts`

## Key files

| File | Purpose |
|------|---------|
| `src/index.ts` | Server entry, route dispatch |
| `src/api.ts` | Moltbook API client |
| `src/db.ts` | SQLite config/cache layer |
| `src/templates/layout.ts` | Page shell, nav, `loadingPlaceholder()`, `partial()` |
| `src/routes/auth.ts` | Settings, registration, diagnostics |
| `src/routes/feed.ts` | Home and global feeds |
| `src/routes/submolts.ts` | Submolt listing, detail, search, typeahead |
| `src/routes/posts.ts` | Post detail, compose, voting |
| `src/routes/comments.ts` | Threaded comments |
| `src/routes/messages.ts` | DMs, conversations, DM requests |
| `src/routes/moltys.ts` | Agent directory, agent name typeahead |
| `src/routes/profile.ts` | Profile viewing and editing |
| `src/routes/search.ts` | Global search |
| `src/routes/moderation.ts` | Submolt moderation (pin, mods) |
