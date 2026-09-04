# Configuration reference

The engine reads its deployment settings from environment variables when it starts. Copy `.env.example` to `.env` for Docker Compose, or set the same variables in the environment that starts the server.

Home Assistant schedules, speaker targets, and the schedule’s LitCal choice are configured in the integration’s **Configure** flow, not with environment variables. See [Home Assistant setup](home-assistant.md).

| Variable                            | Default                                       | Use                                                                                                                                                                              |
| ----------------------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VIRTUAL_CARILLON_DATA_DIR`         | `.data`                                       | Stores `carillon.sqlite`, rendered audio, imported recordings, and LitCal cache files. Back up this directory if you want to retain schedules, history, and imported recordings. |
| `VIRTUAL_CARILLON_HOST`             | `127.0.0.1`                                   | HTTP address on which the engine listens. Docker Compose uses `0.0.0.0` inside the container.                                                                                    |
| `VIRTUAL_CARILLON_PORT`             | `9876`                                        | HTTP port for `/health` and the authenticated `/api/*` endpoints.                                                                                                                |
| `VIRTUAL_CARILLON_API_TOKEN`        | unset                                         | Bearer token for every `/api/*` endpoint. Set a long, unique value for every networked deployment. `/health` remains unauthenticated for health checks.                          |
| `VIRTUAL_CARILLON_DISTANCE_PROFILE` | `half-mile`                                   | Default acoustic distance used by native playback and API audio requests that do not specify a profile.                                                                          |
| `VIRTUAL_CARILLON_SAMPLE_RATE`      | `44100`                                       | WAV sample rate. The only accepted values are `44100` and `48000`.                                                                                                               |
| `VIRTUAL_CARILLON_LITCAL_URL`       | `https://litcal.johnromanodorazio.com/api/v5` | Base URL for the Liturgical Calendar API. Change this only when using a compatible LitCal endpoint.                                                                              |
| `VIRTUAL_CARILLON_LITCAL_CALENDAR`  | `general`                                     | Default calendar used by the command line and API: `general`, `US`, `IT`, `NL`, `VA`, or `CA`. A Home Assistant schedule stores its own calendar choice.                         |

## Distance profiles

The following names are accepted by `VIRTUAL_CARILLON_DISTANCE_PROFILE`, the `play --distance` command option, and the API’s `distance` field. The profile changes the generated audio: farther settings are quieter, less bright, and have more distant reflections.

| Profile          | Intended character                              |
| ---------------- | ----------------------------------------------- |
| `near`           | Close, clear bells.                             |
| `church-grounds` | Bells heard from nearby grounds.                |
| `quarter-mile`   | Bells heard from a short distance away.         |
| `half-mile`      | The default: a more distant outdoor sound.      |
| `one-mile`       | The quietest and most filtered bundled profile. |

The HTTP `POST /api/play` endpoint also accepts `custom` with individual distance values. That is an API-only advanced option; the environment variable and Home Assistant integration accept the five bundled profiles only.

Home Assistant’s schedule controls, LitCal calendar, playback distance, routine modes, Westminster cadence, volume handling, time windows, and canonical-hour preference are documented in the [Home Assistant guide](home-assistant.md).
