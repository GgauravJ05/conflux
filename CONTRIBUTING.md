# Contributing to Conflux

Thanks for taking a look. This is a personal portfolio project, but issues and
pull requests are welcome.

## Getting set up

See [Local setup](README.md#local-setup) in the README. You need Node 18+ and a
MongoDB instance.

## Testing a change

Video calling is hard to test in one window. The minimum bar for anything that
touches the call:

1. Open the same room URL in **two browser tabs**.
2. Join with different names so the roster and name plates are distinguishable.
3. Exercise the thing you changed on **both** sides — a bug that only shows up
   for the remote peer is the most common kind in this codebase.

Before opening a PR:

```bash
cd frontend
npm test -- --watchAll=false
CI=true npm run build      # CI=true turns lint warnings into errors
```

## Conventions

- **Styling** goes through the theme in `frontend/src/theme.js`. Read colours
  and radii from `tokens` rather than hard-coding hex values.
- **Comments** explain *why*, not *what*. Most comments in this repo mark a
  non-obvious constraint (a browser quirk, a WebRTC ordering requirement).
- **Socket events** are documented in the README's signalling protocol table.
  If you add one, update that table.
- Keep new browser-only APIs behind a capability check with a graceful
  fallback, the way captions and background blur are.

## Reporting bugs

Include your browser and OS — WebRTC behaviour varies a lot between browsers,
and several features (captions, screen share) are not available everywhere.
