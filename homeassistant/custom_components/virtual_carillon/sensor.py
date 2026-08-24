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
        return {"outputs": data.get("outputs", []), "bluetooth": data.get("bluetooth", {}), "recent_events": data.get("recentEvents", []), "assets": data.get("assets", []), "hymns": data.get("hymns", []), "litcal_enabled": self.coordinator.litcal_enabled, "litcal_calendar": self.coordinator.litcal_calendar, "liturgical_day": data.get("liturgical_day")}
