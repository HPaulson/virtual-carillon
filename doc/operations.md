# Operations and troubleshooting

## Docker deployment

Create an environment file from the safe example, set a unique API token, and
start the service:

```bash
cp .env.example .env
# Edit .env and set VIRTUAL_CARILLON_API_TOKEN.
docker compose up -d --build
docker compose ps
docker compose logs -f virtual-carillon
```

The SQLite database and rendered-audio cache are stored in the
`virtual-carillon-data` Docker volume. Back up that volume before replacing it.
The health endpoint is `http://virtual-carillon:9876/health` from the Compose
network. For setup and Home Assistant configuration, see
[Docker deployment](../docs/docker.md).

## Common failures

### Home Assistant cannot connect

Confirm that Home Assistant and the service share a Docker network, use
`http://virtual-carillon:9876`, and configure the same API token on both sides.
The default Compose file does not publish a host port.

### A media player cannot play an asset

The service can render audio while a media player cannot retrieve it. Confirm
that the player can reach Home Assistant's configured internal or external URL
and supports `media_player.play_media`. Speaker pairing and transport are owned
by the relevant Home Assistant integration.

### Database locked

The database uses WAL mode and a busy timeout. Do not run multiple server
instances against one data directory, and do not delete SQLite WAL/SHM files
while the service is running.
