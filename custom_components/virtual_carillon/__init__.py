from __future__ import annotations

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.service import async_extract_entity_ids
import voluptuous as vol

from .const import (
    CONF_LITCAL_CALENDAR,
    CONF_DISTANCE_PROFILE,
    CONF_TOKEN,
    DOMAIN,
    SERVICE_PLAY,
    SERVICE_SELECT_HYMN,
    SERVICE_STOP,
    DEFAULT_LITCAL_CALENDAR,
    DEFAULT_DISTANCE_PROFILE,
)
from .coordinator import CarillonCoordinator
from .media_source import VirtualCarillonAudioView
from .schedule_runner import ScheduleRunner

PLATFORMS = ["sensor"]


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    hass.data.setdefault(DOMAIN, {})

    hass.http.register_view(VirtualCarillonAudioView(hass))

    async def media_player_targets(call):
        entity_ids = await async_extract_entity_ids(call)
        media_players = sorted(entity_id for entity_id in entity_ids if entity_id.startswith("media_player."))
        if len(media_players) != len(entity_ids):
            raise HomeAssistantError("Virtual Carillon targets must be media_player entities")
        if not media_players:
            raise HomeAssistantError("Select at least one media_player target")
        return media_players

    async def async_play(call):
        media_players = await media_player_targets(call)
        for coordinator in hass.data[DOMAIN].values():
            await coordinator.async_play(call.data["asset"], media_players)

    async def async_stop(call):
        media_players = await media_player_targets(call)
        for coordinator in hass.data[DOMAIN].values():
            await coordinator.async_stop(media_players)

    async def async_select_hymn(call):
        media_players = await media_player_targets(call)
        option_keys = (
            "strategy",
            "fixed_asset_id",
            "category_ids",
            "feast_ids",
            "offices",
            "seasons",
            "rank",
            "canonical_hours",
            "seed",
            "recent_exclusion",
            "date",
        )
        options = {key: call.data[key] for key in option_keys if key in call.data}
        if "date" in options:
            options["date_value"] = options.pop("date")
        for coordinator in hass.data[DOMAIN].values():
            await coordinator.async_select_hymn(media_players=media_players, **options)

    service_schema = vol.Schema({}, extra=vol.ALLOW_EXTRA)
    hass.services.async_register(DOMAIN, SERVICE_PLAY, async_play, schema=vol.Schema({vol.Required("asset"): str}, extra=vol.ALLOW_EXTRA))
    hass.services.async_register(DOMAIN, SERVICE_STOP, async_stop, schema=service_schema)
    hass.services.async_register(DOMAIN, SERVICE_SELECT_HYMN, async_select_hymn, schema=vol.Schema({
        vol.Optional("strategy", default="random"): vol.In(["fixed", "random", "sequential"]),
        vol.Optional("offices"): [str],
        vol.Optional("seasons"): [str],
        vol.Optional("rank"): str,
        vol.Optional("category_ids"): [str],
        vol.Optional("feast_ids"): [str],
        vol.Optional("canonical_hours"): [str],
        vol.Optional("fixed_asset_id"): str,
        vol.Optional("seed"): vol.Any(str, int),
        vol.Optional("recent_exclusion"): vol.All(vol.Coerce(int), vol.Range(min=0)),
        vol.Optional("date"): str,
    }, extra=vol.ALLOW_EXTRA))
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    options = {**entry.data, **entry.options}
    coordinator = CarillonCoordinator(
        hass,
        entry.data["url"],
        entry.data.get(CONF_TOKEN, ""),
        litcal_calendar=options.get(CONF_LITCAL_CALENDAR, DEFAULT_LITCAL_CALENDAR),
        distance_profile=options.get(CONF_DISTANCE_PROFILE, DEFAULT_DISTANCE_PROFILE),
    )
    await coordinator.async_config_entry_first_refresh()
    hass.data[DOMAIN][entry.entry_id] = coordinator
    runner = ScheduleRunner(hass, coordinator)
    await runner.async_setup()
    hass.data.setdefault(f"{DOMAIN}_schedule_runners", {})[entry.entry_id] = runner
    entry.async_on_unload(entry.add_update_listener(_async_update_options))
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    return True


async def _async_update_options(hass: HomeAssistant, entry: ConfigEntry) -> None:
    await hass.config_entries.async_reload(entry.entry_id)


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    runner = hass.data.get(f"{DOMAIN}_schedule_runners", {}).pop(entry.entry_id, None)
    if runner:
        await runner.async_unload()
    unloaded = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unloaded:
        hass.data[DOMAIN].pop(entry.entry_id, None)
    return unloaded
