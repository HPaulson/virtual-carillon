# Contributing to Virtual Carillon

Thanks for helping improve Virtual Carillon. Contributions should keep the
engine, its Home Assistant integration, and the bundled content easy to maintain.

## Before you start

- Read [the development guide](doc/development.md) and [the architecture notes](doc/architecture.md).
- Open an issue for a substantial behavior or API change before implementing it.
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

For a new melody, use structured notation, provide a stable ID, and add liturgical tags.

## Pull requests

Describe the user-visible change, deployment impact, and validation performed.
Keep commits focused and do not include unrelated generated files.
