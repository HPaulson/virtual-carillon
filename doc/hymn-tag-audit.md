# Hymn tag audit

Audited 2026-08-24 against the structured metadata in `src/library/hymns/music/`.
The rule is conservative: a tag is retained only when the text, the source
rubric, or a clearly documented liturgical use supports it. A tune without a
text is not assigned the season of one possible text pairing.

## Inventory after correction

The bundled library contains 62 hymns. Coverage is:

| Dimension | Current coverage |
| --- | --- |
| Advent | 7 |
| Christmas | 16 |
| Epiphany | 4 |
| Lent | 9 |
| Holy Week | 3 |
| Easter | 9 |
| Ordinary Time | 24 |
| Marian | 12 |
| Eucharistic | 4 |
| Passion | 6 |
| Resurrection | 4 |
| Holy Spirit | 3 |
| Saints | 5 |
| Apostles | 4 |
| Matins / Office of Readings | 1 |
| Lauds / Morning Prayer | 3 |
| Daytime Prayer | 1 |
| Vespers | 6 |
| Compline / Night Prayer | 10 |

The `general` category remains intentionally empty for ordinary hymns; the
`contemplative` category also has no confirmed asset yet. Those are gaps, not
reasons to add speculative tags.

## Corrections made

- `Alma Redemptoris Mater` no longer claims Assumption, Presentation, or Mary,
  Mother of God as feast-specific assignments. It is a seasonal Marian
  antiphon used after Compline from Advent through the Presentation period.
- `Salve Regina` no longer claims Queenship, Assumption, or Visitation. Its
  traditional assignment is the seasonal Marian antiphon after Pentecost and
  before Advent.
- `Ave Regina caelorum` is mapped to Ordinary Time and Lent rather than
  Christmas and Lent: its traditional Compline period begins at the
  Presentation and runs to Holy Week.
- `Æterna Christi munera` is Common of Apostles, not Common of Martyrs.
  `For All the Saints` is kept at the broad Saints category instead of being
  expanded into every saint class.
- `As with Gladness Men of Old` is retained for Epiphany, but not Baptism of
  the Lord; `Joy to the World` is Christmas rather than Advent.
- `Ave de Lourdes` retains Our Lady of Lourdes but not the Immaculate
  Conception feast; `Christus vincit` is retained as a praise/christological
  acclamation without a feast-specific Christ the King claim.
- `Anima Christi` retains Eucharistic feast associations but not Sacred Heart,
  which was not supported by the cited source or the text used here.
- The tune-only assets `Hyfrydol` and `Hymn to Joy` now use general fallback
  metadata rather than inheriting a season or Christological claim from one
  possible hymn text.

## Canonical-hour evidence

The hour field means “documented use or proper office association,” not merely
“sounds appropriate at this time of day.” The USCCB overview identifies the
five current hours, describes Morning and Evening Prayer as the hinge hours,
and explains the traditional character of Office of Readings and Daytime
Prayer: [USCCB, Liturgy of the Hours](https://www.usccb.org/prayer-and-worship/liturgy-of-the-hours).

The specific chant associations in the catalog are supported by the linked
source on each asset. In particular:

- `Te lucis ante terminum` — Compline: [Gregorianum source](https://www.gregorianum.org/index.php?mobileaction=toggle_view_mobile&title=Te_lucis_ante_terminum_%28ad_Completorium%29).
- `Rector potens, verax Deus` — Daytime Prayer / Sext: [GregoBase chant record](https://gregobase.selapa.net/chant.php?id=7885).
- `Æterna Christi munera` — Matins in the Common of Apostles: [Divinum Officium](https://www.divinumofficium.com/cgi-bin/horas/Pofficium.pl?command=prayMatutinum&date1=5-8-2024&lang2=English&testmode=seasonal&version=Ordo+Praedicatorum+-+1962&votive=).
- `Exsultet Orbis Gaudiis` — Lauds / Common of Apostles: [Divinum Officium](https://www.divinumofficium.com/cgi-bin/horas/Pofficium.pl?caller=&command=prayLaudes&date1=01-25-2025&lang2=Latin-gabc&version=Tridentine+-+1888&votive=Hodie).
- `Exsultet Caelum Laudibus` — Vespers / Common of Apostles: [Divinum Officium](https://www2.divinumofficium.com/cgi-bin/horas/Pofficium.pl?command=prayVesperae&date1=11-11-2024&lang2=Latin-gabc&version=Monastic+-+1963&votive=C1).
- `Vexilla Regis` — Passiontide Vespers: [Divinum Officium](https://www2.divinumofficium.com/cgi-bin/horas/Pofficium.pl?command=prayVesperae&date1=04-14-2025&lang2=Latin-gabc&version=Tridentine+-+1906&votive=Hodie).
- `O Fathers of Our Ancient Faith` — Morning Prayer for the Common of Apostles: [Universalis example](https://universalis.com/USA.Hartford/20260824/lauds.htm).

For the Marian antiphons, the evidence is seasonal Night Prayer rather than
individual Marian feast assignment: [Alma Redemptoris Mater, Catholic
Encyclopedia](https://www.newadvent.org/cathen/01326d.htm), [Ave Regina
Caelorum, New Catholic Encyclopedia](https://www.encyclopedia.com/religion/encyclopedias-almanacs-transcripts-and-maps/ave-regina-caelorum),
and the [USCCB note on the current Liturgy of the Hours edition](https://www.usccb.org/prayer-and-worship/liturgy-of-the-hours/liturgy-of-the-hours-second-edition),
which explicitly retains seasonal Marian antiphon options for Night Prayer.

## Additions now bundled

- `Victimae paschali laudes` — Easter sequence and Resurrection category,
  sourced from [GregoBase chant 1086](https://gregobase.selapa.net/chant.php?id=1086),
  which identifies the Solesmes 1961 *Graduale Romanum* and *Liber Usualis*
  sources.
- `Sub tuum praesidium` — Marian antiphon and Compline confidence asset,
  sourced from [GregoBase chant 2064](https://gregobase.selapa.net/chant.php?id=2064),
  with *Liber Usualis* 1961, *Cantus selecti* 1957, and *Chants of the Church*
  1956 provenance. Its Night Prayer relevance also follows the [USCCB
  Second Edition note](https://www.usccb.org/prayer-and-worship/liturgy-of-the-hours/liturgy-of-the-hours-second-edition),
  which retains seasonal Marian antiphon options.
- `Creator alme siderum` — Advent office hymn for Vespers, sourced from
  [GregoBase chant 2134](https://gregobase.selapa.net/chant.php?id=2134),
  *Liber Usualis* 1961, p. 324. The source identifies it as a hymn, while the
  Advent Vespers placement is confirmed by the [Divinum Officium Advent
  Vespers](https://www.divinumofficium.com/cgi-bin/horas/Pofficium.pl?command=prayVesperae&date1=12-01-2024&lang2=Latin-gabc&version=Tridentine+-+1960&votive=) listing.

## Additions worth sourcing next

These are research candidates, not yet bundled. They fill real coverage gaps or
add a distinct feast/hour combination without just multiplying generic carols:

| Candidate | Why it is valuable | Source to obtain a public-domain/transcription-safe setting |
| --- | --- | --- |
| `Veni Sancte Spiritus` | Pentecost sequence; adds a second source-backed Pentecost form beyond Veni Creator | [GregoBase search](https://gregobase.selapa.net/search.php?search=Veni+Sancte+Spiritus) |
| `Te Deum laudamus` | Strong praise/thanksgiving asset for Office of Readings and solemn celebrations; no current contemplative/office candidate of this type | [Divinum Officium](https://www.divinumofficium.com/cgi-bin/horas/Pofficium.pl?command=prayMatutinum&date1=01-01-2025&lang2=Latin-gabc&version=Tridentine+-+1960&votive=) |

Before adding any candidate, import a complete source melody, verify the
edition and chant variant, then assign only the hour/season/feast fields that
the source actually establishes. In particular, do not infer a feast tag from
the fact that a hymn is often sung at that feast.
