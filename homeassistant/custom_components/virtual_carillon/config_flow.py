from __future__ import annotations

import voluptuous as vol
from homeassistant import config_entries
from homeassistant.const import CONF_URL
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .const import DEFAULT_URL, DOMAIN


class VirtualCarillonConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    VERSION = 1

    async def async_step_user(self, user_input=None):
        errors = {}
        if user_input is not None:
            url = user_input[CONF_URL].rstrip("/")
            try:
                async with async_get_clientsession(self.hass).get(f"{url}/health", timeout=5) as response:
                    if response.status != 200:
                        raise RuntimeError("Engine did not return healthy status")
                await self.async_set_unique_id(url)
                self._abort_if_unique_id_configured()
                return self.async_create_entry(title="Virtual Carillon", data={"url": url})
            except Exception:
                errors["base"] = "cannot_connect"
        return self.async_show_form(step_id="user", data_schema=vol.Schema({vol.Required(CONF_URL, default=DEFAULT_URL): str}), errors=errors)
