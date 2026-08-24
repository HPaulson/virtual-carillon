# Contributing to Virtual Carillon

Thanks for helping improve Virtual Carillon. Contributions should keep the
engine, its Home Assistant integration, and the bundled content easy to audit
and safe to redistribute.

## Before you start

- Read [the development guide](doc/development.md), [the architecture notes](doc/architecture.md), and [the content policy](doc/content.md).
- Open an issue for a substantial behavior or API change before implementing it.
- Do not add recordings, scans, copied GABC/ABC files, hymn texts, or other
  third-party material unless redistribution rights and attribution are
  documented in the same change.
- Do not commit `.env`, credentials, runtime data, generated `dist/` output,
  audio caches, `node_modules/`, Python bytecode, or editor files.

## Development

Use the Node and pnpm versions declared in `package.json`:

```bash
pnpm install
pnpm typecheck
pnpm build
pnpm test
pnpm lint
```

For a new hymn, use structured `melody()` notation, provide a stable ID,
source URL, provenance, license statement, and liturgical tags, then add or
update tests. A source URL is attribution/provenance; it is not automatically
permission to redistribute the source page's edition or recording.

## Pull requests

Describe the user-visible change, deployment impact, content provenance, and
validation performed. Keep commits focused and do not include unrelated
generated files. Maintainers may request a rights review or a narrower scope
before merging content changes.

By contributing, you agree that your contribution is provided under the MIT
License unless a different license is explicitly stated for that contribution.
