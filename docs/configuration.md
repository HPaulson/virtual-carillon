# Configuration

The Node engine is configured with environment variables so service deployments can remain declarative:

| Variable | Default | Purpose |
| --- | --- | --- |
| `VIRTUAL_CARILLON_DATA_DIR` | `.data` | SQLite database and rendered audio cache |
| `VIRTUAL_CARILLON_HOST` | `127.0.0.1` | HTTP bind address |
| `VIRTUAL_CARILLON_PORT` | `9876` | Home Assistant API port |
| `VIRTUAL_CARILLON_SAMPLE_RATE` | `44100` | WAV sample rate |
| `VIRTUAL_CARILLON_DISTANCE_PROFILE` | `half-mile` | Outdoor listener model: `near`, `church-grounds`, `quarter-mile`, `half-mile`, `one-mile`, or `custom` |
| `VIRTUAL_CARILLON_OUTPUT` | unset | Default PipeWire output id/name |
| `VIRTUAL_CARILLON_RECONNECT` | `true` | Reserved for Bluetooth reconnect policy |

Schedules are stored in SQLite and can be read/written through `GET /api/schedules` and `PUT /api/schedules`. A schedule's `days` use JavaScript weekday numbers: Sunday `0` through Saturday `6`; `time` accepts `HH:MM`, `hourly`, `*/15`, or `*/30`.
