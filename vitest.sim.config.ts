// Config for `npm run sim` only; normal `npm test` ignores scripts/.
export default { test: { include: ['scripts/*.run.ts'], testTimeout: 30 * 60_000, disableConsoleIntercept: true, silent: false } }
