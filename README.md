# Virtual Carillon

<p align="center">
  <img src="custom_components/virtual_carillon/brand/logo@2x.png" alt="Virtual Carillon" width="480">
</p>

Virtual Carillon turns your speakers into a programmable Church carillon.

Use it with Home Assistant to build routines such as:

- Play **Westminster Chimes** every 15 minutes, every 30 minutes, or on the hour.
- Ring the **Angelus** at noon and 6:00 PM.
- Play a favorite hymn each morning, or choose one at random from a category such as Marian or Eucharistic hymns.
- Play a hymn that fits the current liturgical season or feast day automatically.
- Send different routines to the speakers you already use, with their volume and schedule under your control.

You can also run the carillon on its own from the command line or connect to it through the REST API. Generated bells, signals, and hymn arrangements are rendered on demand rather than shipped as pre-recorded bell sounds. Imported recordings are played from the persistent library, and generated audio can be adjusted for different speaker setups.

## Before you install

Most people will use Virtual Carillon with [Home Assistant](https://www.home-assistant.io/getting-started/), a free, self-hosted home-automation system. The included Home Assistant Integration provides a user-friendly GUI to interact with Virtual Carillon. We also provide Virtual Carillon as a standalone app for advanced users who are comfortable working from the command line and don't want to use Home Assistant.

[HACS](https://hacs.xyz/docs/use/) (Home Assistant Community Store) is the recommended way to install the Home Assistant integration. The integration is stored in the standard top-level `custom_components/virtual_carillon` directory, and releases include the HACS package. If HACS is unavailable, use the manual installation fallback below.

For either Home Assistant path, you must have at least one working Home Assistant `media_player` (speaker) before setting up Virtual Carillon.

## Installation

Choose one of the following installation paths:

### 1. Home Assistant OS and Home Assistant Supervised

Use this path when your Home Assistant installation has **Settings → Apps**. It runs the engine as a Home Assistant app. **This is the recommended install path for most users.**

1. Open **Settings → Apps → App store**. Open the three-dot menu, choose **Repositories**, add the following repository, and close the dialog:

   ```text
   https://github.com/HPaulson/virtual-carillon
   ```

2. Search the App store for **Virtual Carillon**, select it, choose **Install**, and then choose **Start**.
3. Open the app’s **Configuration** tab. Set **API token** to a long, unique private value, choose **Save**, and restart the app if Home Assistant asks.
4. Install the integration through HACS:

   - In HACS, open **Integrations**, choose the three-dot menu, and select **Custom repositories**.
   - Add `https://github.com/HPaulson/virtual-carillon` as an **Integration**, then choose **Download** for the latest release.
   - Restart Home Assistant when HACS asks.

   If HACS is unavailable, manually copy this repository’s `custom_components/virtual_carillon` directory to `/config/custom_components/virtual_carillon/`, then restart Home Assistant.

5. Open **Settings → Devices & services → Add integration**, search for **Virtual Carillon**, and enter:

   - **Engine URL:** `http://<home-assistant-ip>:9876`
   - **API token:** the value from the app’s Configuration tab
   - **LitCal calendar:** choose the calendar Automatic routines should use

6. Open **Configure** on the new integration. Create a short Manual routine for `test-bell` and one media player to confirm playback before adding regular schedules.

### 2. Home Assistant Container with Docker

Use this path when Home Assistant itself runs in a Docker container. Virtual Carillon runs in its own container, while the integration remains inside Home Assistant.

1. On the Docker host, clone or copy this repository and change into its root directory.
2. Create the engine configuration and set a private token:

   ```bash
   cp .env.example .env
   ```

   Open `.env` and set `VIRTUAL_CARILLON_API_TOKEN` to a long, unique value.

3. Start the engine with the fixed Compose project name used in the next step:

   ```bash
   docker compose -p virtual-carillon up -d --build
   docker compose -p virtual-carillon ps
   ```

4. Attach the Home Assistant container to the engine network. First identify its container name with `docker ps`, then run:

   ```bash
   docker network connect virtual-carillon_default <home-assistant-container>
   ```

   The `virtual-carillon_default` network is created by the command in step 3. Once both containers share it, Home Assistant can reach the engine as `http://virtual-carillon:9876`. Keep this connection in your own Compose configuration if you recreate the Home Assistant container.

5. Install the integration through HACS:

   - In HACS, open **Integrations**, choose the three-dot menu, and select **Custom repositories**.
   - Add `https://github.com/HPaulson/virtual-carillon` as an **Integration**, then choose **Download** for the latest release.
   - Restart Home Assistant when HACS asks.

   If HACS is unavailable, manually copy this repository’s `custom_components/virtual_carillon` directory to `/config/custom_components/virtual_carillon/`, then restart Home Assistant.

6. Open **Settings → Devices & services → Add integration**, search for **Virtual Carillon**, and enter:

   - **Engine URL:** `http://virtual-carillon:9876`
   - **API token:** `VIRTUAL_CARILLON_API_TOKEN` from `.env`
   - **LitCal calendar:** choose the calendar Automatic routines should use

7. Open **Configure** on the integration and test `test-bell` on one media player before creating regular schedules.

Do not run the Home Assistant app and the Compose service against the same port and data directory.

### 3. Standalone engine (advanced)

Use this path only when you are comfortable working with the command line without a GUI to interact with the Virtual Carillon. It can play the host’s default audio output, but local speakers, Bluetooth, and unusual audio setups are outside the project’s supported deployment paths. The CLI and [HTTP API](docs/api.md) are provided for experienced users to integrate as they see fit.

Install Node.js 24 or later and the pnpm version declared in `package.json`, then run:

```bash
pnpm install --frozen-lockfile
pnpm build

# List the available bells, signals, and hymns.
node engine/dist/cli/index.js assets

# Check whether this host has an available local audio output.
node engine/dist/cli/index.js doctor
node engine/dist/cli/index.js devices

# Play through the default local output.
node engine/dist/cli/index.js play test-bell
node engine/dist/cli/index.js play angelus
```

To expose the API on the local machine, run `node engine/dist/cli/index.js server`. Set `VIRTUAL_CARILLON_API_TOKEN` before binding it to any network address. Run `node engine/dist/cli/index.js --help` for the complete command reference.

## Scheduling in Home Assistant

Open **Settings → Devices & services → Virtual Carillon → Configure**. Turn on **Enable schedules** before creating any routine: when it is off, neither Westminster nor a saved routine will run.

The editor has one Westminster schedule and three routine modes:

| Mode                                                       | What it is for                                                                                                  |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Westminster Chimes**                                     | Quarter chimes every 15 minutes, every 30 minutes, or hourly, with the correct number of hour strikes at `:00`. |
| **Manual — Select a specific hymn**                        | The same named bell, signal, or hymn every time. Use it for the Angelus or a favorite hymn.                     |
| **Category — Select from a hymn category**                 | Variety within a chosen category, such as Marian or Eucharistic.                                                |
| **Automatic — Hymn selected based on liturgical calendar** | A hymn chosen from the current LitCal context, with an optional Liturgy of the Hours preference.                |

Automatic mode uses the selected LitCal calendar, favoring the day’s feast, saint, category, and season while avoiding a suitable hymn already used that day. See the [automatic mode guide](docs/automatic-mode.md) for details on the hymn selection behavior.

Use the built-in editor for simple, repetitive schedules with fixed times, days, and media players. When a schedule depends on other Home Assistant entities, use a regular automation and select a Virtual Carillon item from the Media browser. The engine renders and serves the audio and keeps it available in Home Assistant’s media library; Home Assistant chooses the media players and handles those additional conditions.

The [Home Assistant guide](docs/home-assistant.md#create-schedules) documents every schedule field, cadence, time-window rule, category, canonical-hour preference, and volume behavior in the GUI.

## A few good starting points

| Purpose                  | Starting routine                                                           |
| ------------------------ | -------------------------------------------------------------------------- |
| Hourly time signal       | Westminster **Every hour**, `08:00`–`20:00`, at a low player volume.       |
| Scheduled Angelus        | Manual routine with the `angelus` asset at `12:00, 18:00`.                 |
| Calendar-aware selection | Automatic routine with the appropriate **LitCal calendar**.                |
| Category-based selection | Category routine with **Marian**, or a Manual routine with `salve-regina`. |

Virtual Carillon does not set up speakers, Bluetooth pairing, or media-player integrations. It sends audio to the local output you select or to Home Assistant media players you already have working.

## Further reading

The guides below expand on the relevant parts of this README:

- [Home Assistant setup, actions, and schedule details](docs/home-assistant.md)
- [Automatic hymn selection](docs/automatic-mode.md)
- [Development, architecture, and testing](docs/development.md)
- [HTTP API reference](docs/api.md)
- [Contributing guide](CONTRIBUTING.md)
- [Security policy](SECURITY.md)

## License

Virtual Carillon is available under the [MIT License](LICENSE).
