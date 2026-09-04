# Virtual Carillon app settings

The Home Assistant app runs the engine on port `9876`. The separate Virtual Carillon integration connects to that port and sends the rendered audio to your selected Home Assistant media players.

| App setting                               | Default                                       | What it controls                                                                                                                                                                                                                |
| ----------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **API token** (`api_token`)               | Empty                                         | The private bearer token for the engine API. Set a long, unique value and enter the same value when adding the integration. If it is empty, the engine API is not protected; do not leave it empty on a networked installation. |
| **Distance profile** (`distance_profile`) | `half-mile`                                   | The acoustic distance used for audio rendered through the integration. Choose `near`, `church-grounds`, `quarter-mile`, `half-mile`, or `one-mile`. Farther profiles are quieter and less bright.                               |
| **Sample rate** (`sample_rate`)           | `44100`                                       | The generated WAV sample rate. Choose `44100` or `48000`.                                                                                                                                                                       |
| **LitCal API URL** (`litcal_url`)         | `https://litcal.johnromanodorazio.com/api/v5` | The Liturgical Calendar API endpoint. Change it only for a compatible LitCal service.                                                                                                                                           |
| **LitCal calendar** (`litcal_calendar`)   | `general`                                     | The engine’s default calendar for direct API and command-line requests: `general`, `US`, `IT`, `NL`, `VA`, or `CA`. A Home Assistant schedule saves its calendar separately in the integration’s **Settings** form.             |

The app exposes port `9876` to the Home Assistant host and internal app network. Use `http://<home-assistant-ip>:9876` when adding the integration; `http://local-virtual-carillon:9876` may also work for a local app installation.

The app is for Home Assistant OS and Home Assistant Supervised. For Home Assistant Container, run the engine with [Docker Compose](../../docs/docker.md) instead.
