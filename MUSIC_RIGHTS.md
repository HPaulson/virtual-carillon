# Music rights and provenance

## Scope

Virtual Carillon distributes no recordings, MIDI files, MusicXML, scans, hymn
texts, translations, or source-edition notation. The files in
`src/library/hymns/music/` are project-authored TypeScript representations of
melody pitches, durations, tags, and rendering parameters. The renderer creates
new audio from those data at runtime. This distinction matters: a public-domain
composition does not make a modern score edition or a recording public domain.

The project source and its generated audio are MIT-licensed only to the extent
of the project-authored code, transcription, and procedural arrangement. They
do not grant rights to a work not listed below.

## Review standard

Every bundled melody must meet all of these conditions:

1. The underlying melody is identified as public domain under the project's
   U.S.-focused review, either because it is traditional/anonymous or because
   the cited composition is old enough to be public domain.
2. The repository contains no protected text, translation, recording, scan, or
   publisher's typesetting.
3. The data file is a project transcription and procedural arrangement; it is
   not an imported ABC, GABC, MIDI, or MusicXML edition.
4. A provenance link is recorded in the source file. For chant, the linked
   source is used to identify the repertoire, not copied as an edition.

The U.S. Copyright Office confirms that works published in the United States
before 1931 are public domain. Gregorian and other medieval chant is
anonymous/traditional; no modern editor, edition, or translation is included.
GregoBase additionally publishes its chant
transcriptions under CC0; where it is cited, no attribution is required.

Sources: [U.S. Copyright Office Circular 15A](https://www.copyright.gov/circs/circ15a.pdf),
[GregoBase licensing statement](https://gregobase.selapa.net/?page_id=2), and
[Library of Congress chant rights statement](https://www.loc.gov/item/2012564127/).

## Included melody inventory

`PD` means the underlying melody is public domain. `PROJECT` means the bundled
representation is a project-authored transcription/arrangement. `CC0` means a
GregoBase transcription is cited as corroborating provenance. A dash in the
creator/death field denotes an anonymous or traditional work, not missing
research. Hymn titles identify tunes only; no lyric, translation, or text
setting is distributed.

| Asset                                                             | Underlying melody creator (death)                 | Status             | Basis                                  |
| ----------------------------------------------------------------- | ------------------------------------------------- | ------------------ | -------------------------------------- |
| `abide-with-me`                                                   | Traditional Welsh setting (—)                     | PD + PROJECT       | Traditional melody only                |
| `adoramus-te-christe`                                             | Gregorian chant (anonymous)                       | PD + PROJECT       | Chant melody only                      |
| `adoro-te-devote`                                                 | Gregorian chant (anonymous)                       | PD + PROJECT       | Chant melody only                      |
| `aeterna-christi-munera`                                          | Gregorian chant (anonymous)                       | PD + PROJECT       | Chant melody only                      |
| `alleluia-sing-to-jesus`                                          | Rowland H. Prichard (1887)                        | PD + PROJECT       | HYFRYDOL, 1855                         |
| `alma-redemptoris-mater` / `-solemn`                              | Gregorian chant (anonymous)                       | PD + PROJECT       | Chant melody only                      |
| `amazing-grace`                                                   | NEW BRITAIN, traditional (—)                      | PD + PROJECT       | Early American traditional tune        |
| `angels-from-the-realms-of-glory`                                 | IRIS, traditional (—)                             | PD + PROJECT       | Eighteenth-century tune                |
| `anima-christi`                                                   | Gregorian chant (anonymous)                       | PD + PROJECT       | Chant melody only                      |
| `as-with-gladness-men-of-old`                                     | Conrad Kocher (1872)                              | PD + PROJECT       | DIX                                    |
| `at-the-cross-her-station-keeping`                                | Gregorian chant (anonymous)                       | PD + PROJECT       | Stabat Mater chant melody              |
| `ave-de-lourdes`                                                  | Traditional Pyrenean tune (—)                     | PD + PROJECT       | Published 1882; no text included       |
| `ave-maris-stella`                                                | Gregorian chant (anonymous)                       | PD + PROJECT + CC0 | Chant melody only                      |
| `ave-regina-caelorum` / `-solemn`                                 | Gregorian chant (anonymous)                       | PD + PROJECT       | Chant melody only                      |
| `away-in-a-manger`                                                | Traditional carol melody (—)                      | PD + PROJECT       | Melody only; no text or recording      |
| `christ-is-made-the-sure-foundation`                              | Traditional chant-derived tune (—)                | PD + PROJECT       | Melody only; Neale translation omitted |
| `christe-redemptor-omnium`                                        | Gregorian chant (anonymous)                       | PD + PROJECT       | Chant melody only                      |
| `christus-vincit`                                                 | Laudes Regiae, traditional (—)                    | PD + PROJECT + CC0 | Chant melody only                      |
| `come-holy-ghost-creator-blest`                                   | Gregorian chant (anonymous)                       | PD + PROJECT       | English text omitted                   |
| `come-holy-spirit`                                                | Gregorian chant (anonymous)                       | PD + PROJECT       | English text omitted                   |
| `come-thou-fount`                                                 | John Wyeth (1858)                                 | PD + PROJECT       | NETTLETON, 1813                        |
| `come-thou-long-expected-jesus`                                   | Rowland H. Prichard (1887)                        | PD + PROJECT       | HYFRYDOL; text omitted                 |
| `creator-alme-siderum`                                            | Gregorian chant (anonymous)                       | PD + PROJECT + CC0 | Chant melody only                      |
| `exsultet-caelum-laudibus`                                        | Gregorian chant (anonymous)                       | PD + PROJECT       | Chant melody only                      |
| `exsultet-orbis-gaudiis`                                          | Gregorian chant (anonymous)                       | PD + PROJECT       | Chant melody only                      |
| `first-noel`                                                      | Traditional English carol (—)                     | PD + PROJECT       | Melody only                            |
| `gabriels-message`                                                | Traditional Basque carol (—)                      | PD + PROJECT       | Melody only                            |
| `gloria-in-excelsis-deo`                                          | Traditional French carol (—)                      | PD + PROJECT       | Melody only                            |
| `god-rest-ye-merry-gentlemen`                                     | Traditional English carol (—)                     | PD + PROJECT       | Melody only                            |
| `hail-the-day-that-sees-him-rise` / `jesus-christ-is-risen-today` | EASTER HYMN, traditional (—)                      | PD + PROJECT       | _Lyra Davidica_, 1708                  |
| `hark-the-herald-angels-sing`                                     | Felix Mendelssohn (1847)                          | PD + PROJECT       | MENDELSSOHN, 1840                      |
| `holy-holy-holy`                                                  | John Bacchus Dykes (1876)                         | PD + PROJECT       | NICAEA, 1861                           |
| `hyfrydol`                                                        | Rowland H. Prichard (1887)                        | PD + PROJECT       | HYFRYDOL, 1855                         |
| `hymn-to-joy`                                                     | Ludwig van Beethoven (1827)                       | PD + PROJECT       | Symphony No. 9, 1824                   |
| `in-the-bleak-midwinter`                                          | Gustav Holst (1934)                               | PD + PROJECT       | CRANHAM; text omitted                  |
| `joy-to-the-world`                                                | Lowell Mason (1872), after Handel (1759)          | PD + PROJECT       | Melody only                            |
| `o-come-all-ye-faithful`                                          | John Francis Wade (1786)                          | PD + PROJECT       | ADESTE FIDELES                         |
| `o-come-o-come-emmanuel`                                          | Traditional French processional (—)               | PD + PROJECT       | Fifteenth-century tune                 |
| `o-fathers-of-our-ancient-faith`                                  | Gregorian chant (anonymous)                       | PD + PROJECT       | Modern text omitted                    |
| `o-god-beyond-all-praising`                                       | Gustav Holst (1934)                               | PD + PROJECT       | THAXTED; modern text omitted           |
| `o-sacred-head-now-wounded`                                       | Hans Leo Hassler (1612)                           | PD + PROJECT       | PASSION CHORALE                        |
| `old-hundredth`                                                   | Louis Bourgeois (c. 1561)                         | PD + PROJECT       | Genevan Psalter melody                 |
| `once-in-royal-davids-city`                                       | Henry J. Gauntlett (1876)                         | PD + PROJECT       | IRBY, 1849                             |
| `pange-lingua`                                                    | Gregorian chant (anonymous)                       | PD + PROJECT       | Chant melody only                      |
| `psalm-51-miserere`                                               | Traditional psalm tone (anonymous)                | PD + PROJECT       | Tone formula only                      |
| `rector-potens-verax-deus`                                        | Gregorian chant (anonymous)                       | PD + PROJECT + CC0 | Chant melody only                      |
| `regina-caeli` / `-solemn`                                        | Gregorian chant (anonymous)                       | PD + PROJECT       | Chant melody only                      |
| `salve-regina` / `-solemn`                                        | Gregorian chant (anonymous)                       | PD + PROJECT       | Chant melody only                      |
| `sub-tuum-praesidium`                                             | Gregorian chant (anonymous)                       | PD + PROJECT + CC0 | Chant melody only                      |
| `te-lucis-ante-terminum`                                          | Gregorian chant (anonymous)                       | PD + PROJECT       | Chant melody only                      |
| `veni-creator-spiritus`                                           | Gregorian chant (anonymous)                       | PD + PROJECT       | Chant melody only                      |
| `vexilla-regis`                                                   | Venantius Fortunatus (c. 609) / traditional chant | PD + PROJECT       | Chant melody only                      |
| `victimae-paschali`                                               | Medieval sequence (anonymous)                     | PD + PROJECT + CC0 | Chant melody only                      |
| `when-i-survey-the-wondrous-cross`                                | Lowell Mason (1872)                               | PD + PROJECT       | HAMBURG, 1824                          |
| `while-shepherds-watched`                                         | CRANBROOK, traditional (—)                        | PD + PROJECT       | Melody only                            |
| `winchester-new`                                                  | William H. Havergal (1870)                        | PD + PROJECT       | WINCHESTER NEW                         |

## Adding content

Do not add an item merely because an old composition is easy to find online.
Include a row in this file, identify every author/editor/arranger and death
date where known, link to an authoritative or explicit-license source, state
what is actually committed, and include any required attribution. If any one
of those checks is unresolved, do not commit the content.
