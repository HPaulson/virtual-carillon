# Virtual Carillon integration

This directory contains the Home Assistant integration only. For installation, follow the [main README](../../../README.md), which explains the two Home Assistant engine paths and the manual integration installation. The integration needs a separately running Virtual Carillon engine:

- use the Virtual Carillon Home Assistant app on Home Assistant OS or Home Assistant Supervised; or
- run the engine with Docker Compose for Home Assistant Container and other Docker installations.

After the engine is running, add **Virtual Carillon** in **Settings → Devices & services**. The integration provides the media browser, `virtual_carillon.play`, `virtual_carillon.select_hymn`, and `virtual_carillon.stop` actions; a status sensor; and a saved schedule editor for Westminster, Manual, Category, and Automatic hymn routines.

Home Assistant controls the selected speakers. The engine generates and serves the audio, so its container does not need direct access to ALSA, PipeWire, Bluetooth, or speaker hardware.

See the [Home Assistant guide](../../../docs/home-assistant.md) for media browsing, actions, exact settings, routine modes, and examples.
