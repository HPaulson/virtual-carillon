# Security policy

Virtual Carillon is intended for a trusted local network or a private
Home Assistant/Docker network. The API token protects `/api/*` when configured;
`/health` remains unauthenticated for container health checks.

Do not report a vulnerability publicly. Email the repository maintainer through
the contact method on the GitHub profile, including the affected version,
deployment path, reproduction steps, and impact. Do not include real tokens,
recordings, or private deployment details in an issue.

Until a release policy is established, the `main` branch is the supported
development version. Users should keep Docker, Node.js, Home Assistant, and
their reverse proxy up to date.
