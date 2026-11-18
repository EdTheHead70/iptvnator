---
type: internal
area: build
---

Remove the unused deprecated `@angular/platform-browser-dynamic` package. The
app boots with `bootstrapApplication`, and `jest-preset-angular` now uses
`@angular/platform-browser/testing`.
