# Security policy

## Report a vulnerability

Please do not open a public issue for a security vulnerability. Use [GitHub’s private vulnerability reporting form](https://github.com/HPaulson/virtual-carillon/security/advisories/new). If that form is unavailable, contact the repository owner through GitHub.

Include the affected version, deployment method, steps to reproduce, and any relevant logs. Remove tokens, private URLs, recordings, and other personal deployment information before sending them.

## Deployment boundary

Virtual Carillon is intended for local or otherwise trusted networks. Set a long, unique `VIRTUAL_CARILLON_API_TOKEN` for every networked deployment, keep the API off the public internet, and use a correctly configured reverse proxy if remote access is genuinely needed.

`GET /health` is intentionally unauthenticated for health checks. Every `/api/*` endpoint requires the bearer token when one is configured. Home Assistant exposes rendered audio to its media players through its own unauthenticated media proxy, so keep Home Assistant and the speakers that can reach it on an appropriate trusted network.
