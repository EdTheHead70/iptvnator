---
type: internal
area: build
---

Upgrade the website to Astro MDX 8 and Tailwind CSS 4. Tailwind now runs through
its Vite plugin with a CSS-first import; the existing theme config is loaded via
`@config`, and scoped Astro styles reference the global stylesheet.
