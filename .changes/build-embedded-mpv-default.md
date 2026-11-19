---
type: internal
area: build
---

Enable Embedded MPV for every desktop build instead of requiring the development
experiment environment variable. Local serve builds use the Homebrew runtime
fallback when no vendored runtime is staged; packaged builds still require the
validated bundled runtime.
