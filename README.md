# Virtual Carillon

Virtual Carillon brings the sound and rhythm of a Catholic bell tower to your home.

It uses the liturgical calendar to ring the Angelus, mark the hours with Westminster chimes, play Catholic hymns, and choose music for the season or feast of the day. Run it from the command line, or connect it to Home Assistant for scheduling and speaker selection.

It is meant for a living room, home chapel, garden, or family prayer routine—not to simulate a public church tower. You choose the times, volume, and sounds that work for your household.

## How it works

Set the Angelus to ring at noon and 6 p.m. Let the Westminster chimes mark the daytime hours, but keep them quiet or turn them off overnight. Before evening prayer, have the system choose a Marian hymn in May or an Advent hymn in December. Or simply ask it to play *Salve Regina* through a speaker while the family gathers.

Virtual Carillon generates the bell and hymn audio and saves it locally, so it is ready when it needs to play. It can send audio to a speaker from the command line, or let Home Assistant send it to one of its media players.

## Sounds and traditions

### Westminster chimes

The familiar Westminster pattern can run every 15 minutes, every 30 minutes, or on the hour. At the hour, Virtual Carillon plays the full quarter sequence and the correct number of hour strikes—one at 1 o'clock through twelve at noon or midnight.

For home use, a gentle hourly setting during waking hours is a good place to start. Set the days and a start/end time to keep it quiet while your household sleeps.

### Angelus

The included traditional Angelus is three groups of three tolls, with a pause between each group. There is also a Roman evening variation. Schedule either one for noon, 6 p.m., or whatever times your family observes.

These are bell signals, not background music: simple reminders to pause for prayer. Local customs differ, so you can use whichever pattern fits your household.

### Hymns for the Catholic year

The built-in library contains 62 carillon arrangements. It includes Marian antiphons and hymns such as *Alma Redemptoris Mater*, *Ave Regina Caelorum*, *Regina Caeli*, and *Salve Regina*; hymns for Advent, Christmas, Lent, Easter, and Ordinary Time; and well-known devotional and traditional tunes.

Each hymn is arranged for the carillon rather than played from a bundled recording. Hymns are tagged by their liturgical setting—season, feast or category, and in some cases a canonical hour—so they can be browsed deliberately or selected for the day.

The current catalog has hour-specific material in all five contexts, with the deepest selection around Compline and Vespers. Untagged hymns are still available: an hour preference guides the choice, it does not hide the rest of the library.

### Canonical Hours

Canonical Hours let you specify where music belongs in the Church's daily prayer. The available contexts are:

- **Matins (Office of Readings):** a quiet, contemplative choice for scripture and spiritual reading.
- **Lauds (Morning Prayer):** praise and thanksgiving at the beginning of the day.
- **Daytime (Terce, Sext, or None):** a daytime pause, with themes of the Passion and the spread of the Gospel.
- **Vespers (Evening Prayer):** thanksgiving at the close of the working day.
- **Compline (Night Prayer):** confidence in God and a peaceful ending before sleep.

An hour can be used in two ways. You can schedule one of the built-in Divine Office bell signals—deep Matins, larger Lauds or Vespers, or a single deep Compline bell—or give hymn selection an hour preference. The selector first looks for a good liturgical match, then gives extra weight to hymns tagged for that hour, its devotional character, or its office usage. If no hour-specific hymn fits, the best feast, season, or category match still wins.

### Automatic mode

Automatic mode follows the Church year without requiring you to choose every hymn. It reads the day's liturgical calendar entry, including its season, principal celebration, feast, and inferred themes. The calendar can be the General Roman Calendar or a supported national calendar. All calendar data comes from Fr. John D'Orazio's [Liturgical Calendar API](https://github.com/Liturgical-Calendar/LiturgicalCalendarAPI).

Automatic mode checks the available hymns and ranks them by:

- A direct feast match is strongest, followed by a saint match.
- Category matches (such as Marian, Eucharistic, Passion, Resurrection, Holy Spirit, or Saints) and the current season add further weight.
- A requested canonical hour adds weight for an exact hour tag, its associated theme, and office usage.
- A hymn clearly outside the current season is penalized.
- Hymns already played that day receive a very large penalty, so the routine works through suitable choices before repeating one.

For example, Corpus Christi can favor Eucharistic hymns, Easter can favor Resurrection hymns, and a Vespers routine can lean toward thanksgiving without losing the day's stronger feast match. If there is no specific match, the selector falls back to seasonal and general-purpose hymns. You can override it with a fixed hymn, a category such as Marian, sequential order, or ordinary random selection.

## Choose how to run it

### On its own: command line and local speakers

Virtual Carillon can run as a self-contained local program on a computer connected to speakers. It also works well for people who prefer scripts and commands to a home-automation dashboard.

```bash
pnpm install
pnpm build

# See the available bells, signals, and hymns
node dist/cli/index.js assets

# Hear a simple bell through the computer's configured audio output
node dist/cli/index.js play test-bell

# Play the Angelus
node dist/cli/index.js play angelus

# Play a particular hymn
node dist/cli/index.js play salve-regina
```

Other useful commands:

```bash
# Check audio support and the available outputs
node dist/cli/index.js doctor
node dist/cli/index.js devices

# Render a sampling of the library
node dist/cli/index.js test

# Play hymns in a changing order; stop with Ctrl+C
node dist/cli/index.js shuffle-hymns

# A short three-hymn listening session, with ten seconds between pieces
node dist/cli/index.js shuffle-hymns --count 3 --pause 10

# Start the service and its saved schedule (including native playback)
node dist/cli/index.js server
```

Run `node dist/cli/index.js --help` to see every command. The service has an API and its own saved schedule, so a custom local setup can use the same calendar-aware routines without Home Assistant.

### With Home Assistant: schedules and familiar speakers

Home Assistant is optional, but useful if your home already uses it. The integration provides a media-browser view of the bells and hymns, a schedule editor, and a way to choose one or more existing media players. It is a front end for the carillon engine, not a replacement for it.

For example, one household might set up:

- Westminster every hour from 8 a.m. to 8 p.m. on weekends, played quietly in the kitchen.
- The Angelus at noon and 6 p.m. every day, sent to a living-room speaker.
- Automatic hymn selection at 7:30 p.m., with a Vespers preference, during a family prayer routine.
- A manually chosen Christmas hymn before guests arrive.

To install the Home Assistant option:

1. Create the service settings file:

   ```bash
   cp .env.example .env
   ```

   Set `VIRTUAL_CARILLON_API_TOKEN` in `.env` to a long private value.

2. Start the service:

   ```bash
   docker compose up -d --build
   ```

3. Copy `homeassistant/custom_components/virtual_carillon` to your Home Assistant configuration folder at `custom_components/virtual_carillon`.

4. Restart Home Assistant. Under **Settings → Devices & services**, add **Virtual Carillon**, enter the service address and the value from `VIRTUAL_CARILLON_API_TOKEN`, then use **Configure** to build your routines.

If both are running in Docker on the same network, the service address is usually `http://virtual-carillon:9876`. [The Docker guide](docs/docker.md) covers other arrangements.

## A few starting routines

| If you want… | Try this |
| --- | --- |
| A gentle clock at home | Westminster hourly, 8 a.m.–8 p.m., at a low volume. |
| A daily prayer reminder | Angelus at noon and 6 p.m. |
| Music for the season | Automatic hymn selection at a set time, using the current liturgical calendar. |
| A particular devotion | Pick a Marian category or select *Salve Regina* directly. |
| A simple listening session | Run `shuffle-hymns --count 3 --pause 10` from the command line. |

## Common questions

### Do I need special bell hardware?

No. Virtual Carillon makes audio for ordinary computer or networked speakers. A direct command-line setup uses the audio output configured on the computer; Home Assistant can send it to its supported media players.

### Does it require Home Assistant?

No. The command-line tools, local library, API, and saved schedule work independently. Home Assistant adds browsing, schedules, and multi-speaker control for people who want those conveniences.

### Can I choose every sound myself?

Yes. You can play a named bell signal or hymn directly, run a random hymn cycle, choose a tagged group, or use automatic selection. Automatic mode is there to reduce routine setup, not to take choices away.

### Can I add audio of my own?

Yes. The `import` command adds audio files you are allowed to use. See [the content guide](doc/content.md) for formats and instructions.

## Further reading

- [Home Assistant setup and examples](doc/home-assistant.md)
- [Docker deployment](docs/docker.md)
- [Configuration options](docs/configuration.md)
- [Development notes](doc/development.md)
- [Full documentation index](doc/README.md)

## License

Virtual Carillon is available under the [MIT License](LICENSE).
