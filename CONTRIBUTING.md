# Contributing to ICT-Casino

## Workflow
1. Pick the next unblocked issue from the [roadmap #34](https://github.com/VilleBoee/ICT-Casino/issues/34). Only start it once every issue in its **Depends on** list is closed.
2. Branch from `main`: `feat/<issue>-short-name` (for example `feat/12-roulette-ui`).
3. Keep each PR to one issue, and put `Closes #<issue>` in the description.
4. Before opening a PR, run `npm test` and `npm run build`. Both must pass.
5. Open the PR into `main`. It's reviewed and squash-merged, and the branch is deleted.

## Code layout
- `src/engine/`: pure TypeScript game logic (no React). Every payout needs tests.
- `src/components/`, `src/games/`: React UI. It only renders engine state and calls engine actions.
- All money goes through `Wallet` (integer chips, saved in localStorage).

## Labels
`P0`–`P8` is build order, `M1`–`M4` is the milestone (title prefix), `ui` / `logic` / `infra` is the owner, and `game:*` is the game.

## Commits
Use [Conventional Commits](https://www.conventionalcommits.org/): `feat(engine): ...`, `fix(ui): ...`, `chore: ...`.
