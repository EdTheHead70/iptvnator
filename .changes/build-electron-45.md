---
type: internal
area: build
---

Upgrade Electron to 45.3.4 and pin `node-abi` 4.40.0 so the native dependency
rebuild can resolve the Electron 45 ABI. Rebuilt better-sqlite3 for the new
runtime.
