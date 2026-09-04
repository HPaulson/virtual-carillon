from __future__ import annotations

from homeassistant.components.sensor import SensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import DOMAIN
from .coordinator import CarillonCoordinator


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback):
    async_add_entities([CarillonStatusSensor(hass.data[DOMAIN][entry.entry_id], entry.entry_id)])


class CarillonStatusSensor(SensorEntity):
    _attr_has_entity_name = True
    _attr_name = "Status"
    _attr_icon = "mdi:bell"

    def __init__(self, coordinator: CarillonCoordinator, entry_id: str):
        self.coordinator = coordinator
        self._attr_unique_id = f"{entry_id}_status"
        self._attr_device_info = {"identifiers": {(DOMAIN, entry_id)}, "name": "Virtual Carillon", "manufacturer": "Open Source"}
        coordinator.async_add_listener(self.async_write_ha_state)

    @property
    def native_value(self): return "online" if self.coordinator.last_update_success else "offline"
    @property
    def extra_state_attributes(self):
        data = self.coordinator.data or {}
        # The API catalog includes full melody/notation data. Storing that in
        # Recorder makes this entity exceed HA's 16 KiB state-attribute limit.
        return {
            "outputs": data.get("outputs", []),
            "bluetooth": data.get("bluetooth", {}),
            "recent_events": data.get("recentEvents", []),
            "assets": _compact_assets(data.get("assets", [])),
            "hymns": _compact_assets(data.get("hymns", [])),
            "litcal_calendar": self.coordinator.litcal_calendar,
            "liturgical_day": data.get("liturgical_day"),
        }


def _compact_assets(assets: object) -> list[dict[str, object]]:
    if not isinstance(assets, list):
        return []
    return [
        {key: asset[key] for key in ("id", "name", "type") if key in asset}
        for asset in assets
        if isinstance(asset, dict) and asset.get("id")
    ]
