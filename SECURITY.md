# Security policy

Virtual Carillon is intended for a trusted local network or a private
Home Assistant/Docker network. Set `VIRTUAL_CARILLON_API_TOKEN` for every
deployment. It protects `/api/*`; `/health` remains unauthenticated for
container health checks.

Do not report a vulnerability publicly. Use GitHub's private security advisory
for this repository, or contact the maintainer through the GitHub profile with
the affected version, deployment path, reproduction steps, and impact. Do not
include real tokens, recordings, or private deployment details in an issue.

Until a release policy is established, the `main` branch is the supported
development version. Users should keep Docker, Node.js, Home Assistant, and
their reverse proxy up to date.
