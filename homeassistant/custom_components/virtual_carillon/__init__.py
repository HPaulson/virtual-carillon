from __future__ import annotations

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
import voluptuous as vol

from .const import DOMAIN, SERVICE_PLAY, SERVICE_SELECT_HYMN, SERVICE_STOP
from .coordinator import CarillonCoordinator

PLATFORMS = ["sensor", "media_player"]


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    hass.data.setdefault(DOMAIN, {})
    async def async_play(call):
        for coordinator in hass.data[DOMAIN].values():
            await coordinator.async_play(call.data["asset"], call.data.get("output"))
    async def async_stop(call):
        for coordinator in hass.data[DOMAIN].values():
            await coordinator.async_stop()
    async def async_select_hymn(call):
        for coordinator in hass.data[DOMAIN].values():
            await coordinator.async_select_hymn(**call.data)
    hass.services.async_register(DOMAIN, SERVICE_PLAY, async_play, schema=vol.Schema({vol.Required("asset"): str, vol.Optional("output"): str}))
    hass.services.async_register(DOMAIN, SERVICE_STOP, async_stop)
    hass.services.async_register(DOMAIN, SERVICE_SELECT_HYMN, async_select_hymn, schema=vol.Schema({
        vol.Optional("strategy", default="automatic"): vol.In(["automatic", "fixed", "random", "sequential"]),
        vol.Optional("hymn"): str,
        vol.Optional("category"): str,
        vol.Optional("feast"): str,
        vol.Optional("office"): str,
        vol.Optional("seed"): vol.Any(str, int),
        vol.Optional("output"): str,
    }))
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    coordinator = CarillonCoordinator(hass, entry.data["url"])
    await coordinator.async_config_entry_first_refresh()
    hass.data[DOMAIN][entry.entry_id] = coordinator
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    unloaded = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unloaded:
        hass.data[DOMAIN].pop(entry.entry_id, None)
    return unloaded
