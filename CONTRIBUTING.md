# Contributing to Virtual Carillon

Thanks for helping improve Virtual Carillon. Contributions should keep the
engine, its Home Assistant integration, and the bundled content easy to audit
and safe to redistribute.

## Before you start

- Read [the development guide](doc/development.md), [the architecture notes](doc/architecture.md), and [the music-rights policy](MUSIC_RIGHTS.md).
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

For a new melody, use structured notation, provide a stable ID, a provenance
link, creator/editor/arranger information, death dates where applicable, a
rights classification in `MUSIC_RIGHTS.md`, and liturgical tags. A source URL
is not by itself permission to redistribute a source edition or recording.

## Pull requests

Describe the user-visible change, deployment impact, content provenance, and
validation performed. Keep commits focused and do not include unrelated
generated files. Maintainers may request a rights review or a narrower scope
before merging content changes.

By contributing, you agree that your contribution is provided under the MIT
License unless a different license is explicitly stated for that contribution.
