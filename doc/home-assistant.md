# Home Assistant Integration

The Virtual Carillon integration connects Home Assistant to the engine. It adds a media source, a status sensor, three actions, and a schedule editor. Home Assistant chooses the speakers; the engine generates the audio and keeps the saved schedule.

## After installation

Follow the [main README](../README.md) for the three installation paths, including HACS, the Home Assistant app, Docker networking, and API-token setup. This page starts once the integration is connected.

The integration sends the API token as a request header rather than putting it in the URL. After setup, change the LitCal calendar in **Configure → Settings**.

<img width="570" height="659" alt="Screenshot 2026-09-04 at 00 33 51" src="https://github.com/user-attachments/assets/eb15bceb-ce51-4f79-9e77-f4959871f907" />

## Browse and play

Open **Media → Media browser → Virtual Carillon** to find:

- **All assets** — bells, Westminster sequences, Angelus signals, Office signals, hymns, and imported recordings;
- **Automatic hymn** — selects the appropriate hymn for today's LitCal context when played;
- **Hymns → All hymns** — every bundled or imported hymn; and
- **Hymns → By season** — hymns grouped by their liturgical season tags. A hymn with more than one season tag appears in each relevant folder.

Select an item, then choose any working Home Assistant media player. The integration proxies the generated audio through Home Assistant, so the engine container does not need speaker or Bluetooth access.

**Automatic hymn** is a virtual item intended for Home Assistant automations. When Home Assistant resolves it for playback, Virtual Carillon selects a hymn for today’s LitCal context and streams it. It does not create or run a saved Virtual Carillon schedule, although existing schedule history for the local date can affect repeat avoidance.

<img width="428" height="812" alt="Screenshot 2026-09-04 at 00 34 08" src="https://github.com/user-attachments/assets/51e64c4c-2415-44dd-b1c1-b29f8f88ae64" />

## Actions

Use these actions in an automation, script, dashboard button, or the Developer Tools action panel.

### `virtual_carillon.play`

Plays one named asset on the target media players. `asset` is required and must be the asset’s stable ID, such as `angelus`, `test-bell`, or `salve-regina`.

```yaml
action: virtual_carillon.play
target:
  entity_id: media_player.kitchen
data:
  asset: angelus
```

### `virtual_carillon.stop`

Stops playback on the target media players.

```yaml
action: virtual_carillon.stop
target:
  entity_id:
    - media_player.kitchen
    - media_player.office
```

### `virtual_carillon.select_hymn`

Selects a hymn, then plays it on the target media players. Every use needs at least one `media_player` target.

| Field              | Default  | Effect                                                                                                                                      |
| ------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `strategy`         | `random` | `random` chooses a candidate at random; `sequential` cycles through candidates in the running engine; `fixed` uses `fixed_asset_id`.        |
| `fixed_asset_id`   | —        | Exact hymn ID for `fixed`, for example `salve-regina`.                                                                                      |
| `category_ids`     | —        | Restricts selection to one or more category IDs, such as `marian` or `eucharistic`.                                                         |
| `feast_ids`        | —        | Runs only when the evaluated LitCal day matches a listed feast, then restricts selection to those feast tags.                               |
| `seasons`          | —        | Runs only in a listed liturgical season, then restricts selection to those season tags.                                                     |
| `rank`             | —        | Runs only when the LitCal day has a matching rank, such as `solemnity`, `feast`, or `memorial`.                                             |
| `offices`          | —        | Restricts candidates to hymn metadata for the listed Office IDs.                                                                            |
| `canonical_hours`  | —        | Prefers the listed Liturgy of the Hours contexts while selecting; it is not a clock-time trigger.                                           |
| `seed`             | —        | Makes an unscored random selection reproducible for the same date and request.                                                              |
| `recent_exclusion` | `1`      | For unseeded, non-automatic selection, avoids this many recent selections when enough candidates exist. Set `0` to allow immediate repeats. |
| `date`             | Today    | Evaluates a specific `YYYY-MM-DD` date instead of today. Useful for testing.                                                                |

The supported canonical-hour IDs are `matins`, `lauds`, `daytime`, `vespers`, and `compline`. The selectable category IDs in the schedule editor are listed in the [main guide](../README.md#scheduling-in-home-assistant); API users can also inspect the hymn metadata returned by `/api/hymns`.

An uncomplicated automatic request is:

```yaml
action: virtual_carillon.select_hymn
target:
  entity_id: media_player.kitchen
data:
  strategy: random
```

A category-based request is:

```yaml
action: virtual_carillon.select_hymn
target:
  entity_id: media_player.kitchen
data:
  strategy: random
  category_ids: [marian]
```

The action always evaluates the requested date with the selected LitCal calendar. An unfiltered request uses the current celebration and season. `feast_ids`, `seasons`, and `rank` require a matching LitCal day, so a request with those fields does not play when its condition does not match.

If the engine cannot reach its hymn library or no eligible hymn exists, the action fails with a descriptive Home Assistant log message. The media-browser item uses the direct selection endpoint, which can use a neutral context if LitCal is unavailable. A scheduled Automatic routine requires a LitCal day; if that day cannot be obtained, the routine records the reason in the Home Assistant log and does not play an unrelated fallback hymn.

## Create schedules

Open **Settings → Devices & services → Virtual Carillon → Configure**.

<img width="439" height="317" alt="Screenshot 2026-09-04 at 00 34 36" src="https://github.com/user-attachments/assets/4469eb62-b381-435c-be0b-ce83e5f6bcbd" />

### 1. Turn on schedules and choose LitCal

In **Settings**:

- Turn on **Enable schedules**. This master switch controls Westminster and every saved routine.
- Choose the **LitCal calendar**: `general`, `US`, `IT`, `NL`, `VA`, or `CA`. Every Automatic routine uses this calendar to select a hymn for the date.
- Choose **Playback distance**. It changes the generated sound heard through Home Assistant: `near`, `church-grounds`, `quarter-mile`, `half-mile` (the default), or `one-mile`.

<img width="435" height="846" alt="Screenshot 2026-09-04 at 00 35 26" src="https://github.com/user-attachments/assets/5686b851-5707-4172-b2d7-9d362a528e89" />

### 2. Configure Westminster Chimes, if wanted

Choose **Westminster Chimes**. Turn on **Enable Westminster**, select the cadence, days, optional window, volume, and media players.

| Cadence              | Chime times                |
| -------------------- | -------------------------- |
| **Every 15 minutes** | `:00`, `:15`, `:30`, `:45` |
| **Every 30 minutes** | `:00`, `:30`               |
| **Every hour**       | `:00`                      |

The engine plays the appropriate quarter sequence at each quarter. On the hour it plays the full sequence followed by the correct one-to-twelve count of hour strikes. **Never before** and **Never after** are inclusive; an overnight range such as `22:00`–`06:00` continues into the following morning. A selected **Volume (%)** changes the target players’ volume before playback and does not restore it afterward. At least one media player is required when Westminster is enabled.

| Westminster setting                | Effect                                                                                             |
| ---------------------------------- | -------------------------------------------------------------------------------------------------- |
| **Enable Westminster**             | Turns Westminster on or off. It has no effect while the master **Enable schedules** switch is off. |
| **Every**                          | Selects one of the three cadence rows above.                                                       |
| **Days**                           | Chooses the weekdays on which chimes may run.                                                      |
| **Never before** / **Never after** | Limits chimes to an inclusive daily `HH:MM` window. Leave both blank for all day.                  |
| **Volume (%)**                     | Sets selected players to 0–100% before playback. Leave blank to preserve their current volume.     |
| **Media players**                  | The Home Assistant speakers to receive the chimes. Required when Westminster is enabled.           |

### 3. Add routines

Choose **Schedule: Add**, then choose a mode:

| Mode                                                       | Required choice                 | Selection behavior                                                                                        |
| ---------------------------------------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------- |
| **Manual — Select a specific hymn**                        | **Specific asset or hymn**      | Plays that exact asset at every listed time. Use it for the Angelus, a particular hymn, or a bell signal. |
| **Category — Select from a hymn category**                 | One or more **Hymn categories** | Chooses one hymn from those categories. It has no canonical-hour setting in the Home Assistant form.      |
| **Automatic — Hymn selected based on liturgical calendar** | No asset or category            | Uses the selected LitCal calendar for the date. **Liturgy of the Hours preference** is optional.          |

Each routine uses exact local `HH:MM` times separated with commas, one or more days, and one or more media players. **Never before** and **Never after** filter every listed time. A routine can remain saved but inactive by turning off **Enable schedule**.

Leave **Volume (%)** blank to preserve each player’s present volume. If you enter a number from 0 to 100, Home Assistant sets that volume immediately before each playback; it does not change it back afterward.

| Routine setting                     | Effect                                                                                           |
| ----------------------------------- | ------------------------------------------------------------------------------------------------ |
| **Name (optional)**                 | The name shown in the schedule list. When blank, the integration supplies one based on the mode. |
| **Enable schedule**                 | Turns this routine on or off without deleting it.                                                |
| **Specific asset or hymn**          | Required in Manual mode. Selects the exact asset to play.                                        |
| **Hymn categories**                 | Required in Category mode. Selects one or more categories from which the engine chooses a hymn.  |
| **Liturgy of the Hours preference** | Available only in Automatic mode. Helps select a suitable hymn; it does not set the time.        |
| **Times (HH:MM, comma separated)**  | One or more exact local times, such as `12:00, 18:00`. Seconds are not used.                     |
| **Days**                            | Days on which the routine may run.                                                               |
| **Never before** / **Never after**  | Optional inclusive daily time window for every listed time. It may cross midnight.               |
| **Media players**                   | One or more `media_player` entities. Required for every routine created in this form.            |
| **Volume (%)**                      | Sets selected players to 0–100% before playback and leaves that volume in place.                 |

The Category form offers Marian, Christological, Eucharistic, Holy Spirit, Passion, Resurrection, Saints, Angels, Apostles, Martyrs, Virgins, Doctors of the Church, Religious, Praise, Thanksgiving, Confidence in God, Contemplative, Incarnation, Penitential, and Psalm.

<img width="1424" height="596" alt="Screenshot 2026-09-04 at 00 36 02" src="https://github.com/user-attachments/assets/49e104b7-2921-49bc-889a-a339fa18eb89" />

<img width="1429" height="910" alt="Screenshot 2026-09-04 at 00 36 29" src="https://github.com/user-attachments/assets/d05e1d13-e32a-4f59-b211-32f7f64b5d41" />

For an automatic schedule, **Liturgy of the Hours preference** is a preference only:

| Preference                      | Selection effect                                                     |
| ------------------------------- | -------------------------------------------------------------------- |
| **None**                        | Does not prefer a Liturgy of the Hours context. This is the default. |
| **Matins (Office of Readings)** | Prefers Matins metadata and a contemplative character.               |
| **Lauds (Morning)**             | Prefers Lauds metadata and a praise character.                       |
| **Terce/Sext/None (Daytime)**   | Prefers Daytime Prayer metadata and a Passion character.             |
| **Vespers (Evening)**           | Prefers Vespers metadata and a thanksgiving character.               |
| **Compline (Night)**            | Prefers Compline metadata and confidence in God.                     |

The preference is subordinate to a good feast, saint, category, or season match. It affects hymn selection only; it does not change when the routine runs.

The schedule is saved in the engine’s SQLite data directory and survives restarts. Home Assistant checks it each minute, claims due events, and sends the resulting audio to the selected players. You do not need a separate Home Assistant automation for a standard routine.

## Status sensor

The **Virtual Carillon Status** sensor reports `online` when the integration can reach the engine and `offline` when it cannot. Its attributes include outputs, Bluetooth diagnostics, recent engine events, assets, hymn metadata, the selected LitCal calendar, and today’s normalized LitCal day. This is useful for a dashboard or troubleshooting, but it is not required for normal use.

## Advanced automations

The built-in schedule editor is ideal for simple repeating routines. For bells and hymns that depend on something happening in Home Assistant, use a regular automation instead. You can combine Virtual Carillon with presence, time, calendar, or any other Home Assistant condition.

For example, this automation waits five minutes after I arrive home, then plays **Automatic hymn**. Virtual Carillon chooses a hymn for the current liturgical season or feast at the moment the automation runs. This gives you the convenience of calendar-aware hymn selection together with the full flexibility of Home Assistant automations.

<p align="center">
  <img width="1680" height="912" alt="Home Assistant automation that plays a seasonal automatic hymn five minutes after arriving home" src="https://github.com/user-attachments/assets/8ca655de-b097-41f5-a401-21a4b5462ad0">
</p>
