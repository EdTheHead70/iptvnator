---
type: internal
area: build
---

Upgrade the package manager to pnpm 12.18.0 and move dependency overrides and
patched dependencies into `pnpm-workspace.yaml`, replacing the deprecated
`package.json#pnpm` field. Build-script permissions are now listed explicitly
under `allowBuilds`.
