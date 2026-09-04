# Operations and troubleshooting

Use this page after initial installation. The [main README](../README.md) is the only installation guide; this page covers maintenance and troubleshooting.

## Routine maintenance

For a Docker Compose deployment:

```bash
docker compose ps
docker compose logs -f virtual-carillon
```

The `virtual-carillon-data` volume contains the saved schedule, playback history, imported recordings, LitCal cache, and rendered audio. Back it up before removing the volume or moving to a new host.

For the Home Assistant app, the same information is held in Supervisor-managed app storage. Include the app data in ordinary Home Assistant backups.

You may remove rendered WAV cache files while the engine is stopped; it will render them again when needed. Do not delete `carillon.sqlite`, the `assets/` directory, or SQLite `-wal` and `-shm` files while the engine is running unless you intentionally want to lose or reset that data.

## Check the engine

From the engine’s network:

```bash
curl http://virtual-carillon:9876/health
curl -H 'Authorization: Bearer YOUR_TOKEN' http://virtual-carillon:9876/api/status
```

For a local native installation, replace `virtual-carillon` with `127.0.0.1` when the server uses its default address.

`/health` confirms that the engine is running. `/api/status` also reports the current distance profile, discovered outputs, Bluetooth diagnostics, and recent playback events.

## Common problems

### The integration cannot connect

Confirm all of the following:

1. The engine is running and `/health` responds.
2. The API URL is reachable from Home Assistant. In the supplied Compose deployment, use `http://virtual-carillon:9876` only when both containers share a network.
3. The API token exactly matches the engine or app token.
4. The engine API is not being blocked by a reverse proxy or firewall.

The default Compose file does not publish port `9876` to the Docker host. The host’s `localhost:9876` is therefore not an integration address unless you deliberately add a port mapping.

### A schedule is saved but nothing plays

Check the master **Enable schedules** switch in **Configure → Settings**, then check the individual **Enable Westminster** or **Enable schedule** switch. Confirm that the routine includes the current weekday, an exact `HH:MM` time, and at least one media player.

For routines with **Never before** and **Never after**, remember that both boundaries are inclusive and overnight ranges continue into the next morning. Check the Home Assistant log for a claimed schedule event and the Virtual Carillon Status sensor’s recent events.

### A speaker does not play an asset

First play a normal Home Assistant media item on that speaker. Then confirm that it can reach Home Assistant’s configured internal or external URL and supports `media_player.play_media`. Virtual Carillon does not manage pairing, speaker groups, or transport details for another integration.

When a routine specifies **Volume (%)**, Home Assistant sets the player’s volume before playback and leaves it there. An unexpectedly quiet or loud later playback may be the result of that setting.

### Automatic mode cannot find a suitable hymn

Check the selected **LitCal calendar** in **Configure → Settings** and the Home Assistant log for the exact selection message. The engine uses a cached calendar year when it has one. If it cannot obtain a LitCal day, the routine does not play and the Home Assistant log identifies the date and calendar involved.

If no suitable hymn is available, the log identifies the routine and date. Check that the engine can reach LitCal and that the hymn library contains eligible hymns.

### Native playback fails

Native playback is an advanced standalone path, not the supported Home Assistant speaker path. Run:

```bash
node engine/dist/cli/index.js doctor
node engine/dist/cli/index.js devices
```

Use the returned device information with the CLI or API if your setup requires it. Virtual Carillon does not provide configuration guidance for audio drivers, Bluetooth pairing, or particular speaker hardware. For ordinary use, send the audio through a working Home Assistant `media_player`. The standard Docker/Home Assistant deployment does not provide native audio devices to the container.

### The database is locked

Do not run two engine processes against the same data directory. The database uses WAL mode and a busy timeout, but simultaneous independent servers are not a supported arrangement.
