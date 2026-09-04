# Virtual Carillon Home Assistant app

This app runs the Virtual Carillon engine under Home Assistant Supervisor. Use it with Home Assistant OS or Home Assistant Supervised. It is not available for Home Assistant Container.

The app runs the engine only. The separate **Virtual Carillon** integration supplies the media library, speaker selection, and schedules; follow the main README for its installation.

## Setup

Follow the [main README’s Home Assistant OS/Supervised path](../../README.md#1-home-assistant-os-and-home-assistant-supervised) for installation. It covers adding the app repository, installing the app, installing the integration with HACS (or manually), and connecting the two pieces. This page only documents the app’s own settings and storage.

The app stores its database, rendered audio, LitCal cache, and imported recordings in Supervisor-managed persistent storage. Include that data in your Home Assistant backups.

Home Assistant remains responsible for speaker configuration and playback. The integration sends the generated audio to the media players you select.

For the app’s settings, see [DOCS.md](DOCS.md). For the complete integration guide, see [Home Assistant](../../doc/home-assistant.md).
