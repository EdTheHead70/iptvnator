---
type: internal
area: build
---

Upgrade the test and lint tooling: jsdom 31, @types/jsdom 30, jest-junit 17,
globals 17, jsonc-eslint-parser 3, eslint-plugin-playwright 2 and node-gyp 13.
Remove the unused electron-playwright-helpers and @types/mocha packages, and
drop stale Playwright rule-disable comments from Node assertion performance
tests.
