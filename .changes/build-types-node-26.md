---
type: internal
area: build
---

Update `@types/node` to 26.6.6 and raise the shared TypeScript lib to ES2022 for
the Node 26 APIs. Normalize unknown worker errors, replace the removed
`path.PlatformPath` type, and keep the zlib duplex bridge typed across the
Node 26 stream overloads.
