# Automatic hymn selection

Automatic mode chooses a hymn for the current day. It looks at today's celebration on the Liturgical Calendar, the current season, and the liturgical labels assigned to each hymn in the catalog. It then chooses the strongest available match and avoids repeating hymns already played that day.

This makes **Automatic hymn** useful for a morning prayer, an evening routine, or several moments of prayer throughout the day. You can play it more than once without normally hearing the same hymn again.

## Using Automatic mode in Home Assistant

There are two ways to use Automatic mode in Home Assistant:

- Create a saved routine with **Automatic — Hymn selected based on liturgical calendar**.
- Choose **Automatic hymn** from **Media → Media browser → Virtual Carillon** in an automation, script, or dashboard button.

Before creating a routine, open **Settings → Devices & services → Virtual Carillon → Configure → Settings** and choose the **LitCal calendar** for your location. The available calendars are `general`, `US`, `IT`, `NL`, `VA`, and `CA`. Every saved Automatic routine uses this choice.

The **Liturgy of the Hours (Canonical Hour) preference** is optional. It tells Virtual Carillon what kind of hymn may fit the time of prayer -- for example, praise for Lauds, thanksgiving for Vespers, or confidence in God for Compline. It is only a preference for choosing the hymn; it does not make the routine run at that hour or replace a feast-day match.

The **Automatic hymn** media item selects a hymn when Home Assistant requests it. It does not create or run a saved schedule. Existing schedule history for the local date can still affect repeat avoidance, but playing the media item by itself does not add a new schedule-history entry.

## What influences the choice

Virtual Carillon gives the greatest weight to the most specific connection with the day:

| What matches                                 | How it affects the choice                               |
| -------------------------------------------- | ------------------------------------------------------- |
| The day’s feast or solemn celebration        | Strongest preference.                                   |
| A saint celebrated that day                  | Very strong preference.                                 |
| A category associated with the celebration   | Strong preference.                                      |
| The current liturgical season                | Seasonal preference.                                    |
| The selected Liturgy of the Hours preference | Favors matching hour, Office, and devotional themes.    |
| A hymn already played that day               | Strongly discourages repeating it.                      |
| A hymn tagged for another concrete season    | Discourages it unless there is no better unused choice. |

The built-in Liturgy of the Hours preferences use these devotional themes:

| Preference                      | Theme             |
| ------------------------------- | ----------------- |
| **Matins (Office of Readings)** | Contemplative     |
| **Lauds (Morning)**             | Praise            |
| **Terce/Sext/None (Daytime)**   | Passion           |
| **Vespers (Evening)**           | Thanksgiving      |
| **Compline (Night)**            | Confidence in God |

These are preferences, not rules. For example, a hymn that fits a major feast will normally be chosen over a hymn that merely fits the selected canonical hour.

The **General** season is neutral and can be used at any time of year. A hymn does not need a special season or feast tag to be selected, so the catalog can still provide a fallback when no highly specific match is available.

## How repeat avoidance works

For saved routines, Virtual Carillon remembers hymns that have been claimed or successfully played on the local date. A hymn from an earlier routine is therefore normally left out of the next suitable selection. If every reasonable choice has already been used, Virtual Carillon allows a repeat rather than refusing to play.

A failed delivery is not counted as a completed playback. Two schedule events that are being handled at the same time are also prevented from choosing the same hymn.

To test a routine again from the beginning, reset that date’s hymn history with `POST /api/hymns/reset-day`; this is an advanced API operation described below.

## If the calendar cannot be reached

Virtual Carillon uses a cached calendar year when one is available. A saved Automatic routine needs a calendar day to make a liturgical selection. If the day cannot be obtained, the routine does not play and the Home Assistant log explains the problem. It does not substitute an unrelated hymn.

When the **Automatic hymn** media item or a direct API request cannot obtain LitCal, it can use a neutral day instead. In that case, it may return a general hymn, but the result is not based on a feast, saint, or season.

If the hymn catalog has no eligible hymn, Automatic mode reports that no hymn is available.

## For advanced users

The following names are used by the HTTP API and command line. Home Assistant users normally do not need them.

Scored automatic selection is used when a request does not set a specific feast, category, or season filter. The API names for those filters are `feastIds`, `categoryIds`, and `seasonIds`. When one of them is supplied, the engine uses explicit matching instead of the scoring table: exact feast, saint, category, then season.

The automatic scoring values are:

| Match or condition                     |       Points |
| -------------------------------------- | -----------: |
| Matching feast tag                     | +100 per tag |
| Matching saint tag                     |  +80 per tag |
| Matching canonical-hour tag            |  +55 per tag |
| Matching canonical-hour theme category |  +50 per tag |
| Matching celebration category          |  +45 per tag |
| Matching season tag                    |  +35 per tag |
| Matching Office metadata               |  +25 per tag |
| Outside the current concrete season    |          −45 |
| Already played that day                |        −1000 |

The engine scores every eligible hymn. If an unused hymn has a score above zero, it chooses the highest-scoring unused hymn. Otherwise, previously played hymns remain available. Ties are resolved by the alphabetically first asset ID, making scored selection deterministic for the same inputs.

The API returns `scoring`, `selectedScore`, `selectedRank`, and `selectedScoreBreakdown`. `selectedRank` reflects the unpenalized liturgical fit; `selectedScore` includes any repeat penalty.

To preview the automatic order without playing audio:

```bash
node dist/cli/index.js hymn-order --date 2026-08-15 --calendar general --count 5
```

The HTTP API provides the same selection information:

```bash
curl -H "Authorization: Bearer $VIRTUAL_CARILLON_API_TOKEN" \
  "http://127.0.0.1:9876/api/liturgical/2026-08-15/hymn?calendar=general"
```

See the [HTTP API reference](api.md#litcal-and-hymn-selection) for request fields and response details. The point values are part of the current catalog behavior and may change in a future release.
