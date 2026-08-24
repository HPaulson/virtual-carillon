from __future__ import annotations

from homeassistant.components.media_player import MediaPlayerDeviceClass, MediaPlayerEntity, MediaPlayerEntityFeature
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import DOMAIN
from .coordinator import CarillonCoordinator


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback):
    async_add_entities([VirtualCarillonPlayer(hass.data[DOMAIN][entry.entry_id], entry.entry_id)])


class VirtualCarillonPlayer(MediaPlayerEntity):
    _attr_has_entity_name = True
    _attr_name = "Player"
    _attr_device_class = MediaPlayerDeviceClass.SPEAKER
    _attr_supported_features = MediaPlayerEntityFeature.PLAY_MEDIA | MediaPlayerEntityFeature.STOP

    def __init__(self, coordinator: CarillonCoordinator, entry_id: str):
        self.coordinator = coordinator
        self._attr_unique_id = f"{entry_id}_player"
        self._attr_device_info = {"identifiers": {(DOMAIN, entry_id)}, "name": "Virtual Carillon", "manufacturer": "Open Source"}

    @property
    def available(self): return self.coordinator.last_update_success
    @property
    def state(self): return "playing" if self.coordinator.data and self.coordinator.data.get("recentEvents", [{}])[0].get("status") == "played" else "idle"
    async def async_media_play(self): await self.coordinator.async_play("test-bell")
    async def async_media_stop(self): await self.coordinator.async_stop()
    async def async_play_media(self, media_type, media_id, **kwargs): await self.coordinator.async_play(media_id)
