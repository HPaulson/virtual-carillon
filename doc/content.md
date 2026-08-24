# Content model

Virtual Carillon has three distinct kinds of content:

- Generated bells and bell signals are synthesized by the project; no sampled
  recordings are bundled.
- Built-in melodies are symbolic pitch and timing data, rendered by the
  project. Their rights status is recorded in [MUSIC_RIGHTS.md](../MUSIC_RIGHTS.md).
- User recordings stay in the local data directory and are never part of the
  repository or published package.

The library intentionally does not bundle hymn text, translations, scans,
publisher typesetting, MIDI, MusicXML, ABC/GABC source files, or recordings.
Those materials can have rights distinct from an old underlying melody.

When importing a local recording, the operator is responsible for the rights
to store and play it. Record its license, attribution, and source URL through
the import command where applicable; do not submit the recording to this
repository without a documented redistribution grant.

For the complete included-melody inventory, contributor requirements, source
links, and the one deliberately excluded melody, see
[MUSIC_RIGHTS.md](../MUSIC_RIGHTS.md).
