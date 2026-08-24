from __future__ import annotations

from typing import Any

import voluptuous as vol
from homeassistant import config_entries
from homeassistant.const import CONF_URL
from homeassistant.core import callback
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers import selector

from .const import (
    CONF_LITCAL_CALENDAR,
    CONF_LITCAL_ENABLED,
    CONF_TOKEN,
    DEFAULT_LITCAL_CALENDAR,
    DEFAULT_LITCAL_ENABLED,
    DEFAULT_URL,
    DOMAIN,
    LITCAL_CALENDARS,
)


class VirtualCarillonConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    VERSION = 1

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: config_entries.ConfigEntry):
        return VirtualCarillonOptionsFlow()

    async def async_step_user(self, user_input=None):
        errors = {}
        if user_input is not None:
            url = user_input[CONF_URL].rstrip("/")
            token = user_input.get(CONF_TOKEN, "").strip()
            headers = {"Authorization": f"Bearer {token}"} if token else {}
            try:
                async with async_get_clientsession(self.hass).get(f"{url}/api/status", headers=headers, timeout=5) as response:
                    if response.status == 401:
                        errors["base"] = "invalid_auth"
                    elif response.status != 200:
                        raise RuntimeError("Engine did not return healthy status")
            except Exception:
                if "base" not in errors:
                    errors["base"] = "cannot_connect"
            if not errors:
                await self.async_set_unique_id(url)
                self._abort_if_unique_id_configured()
                return self.async_create_entry(
                    title="Virtual Carillon",
                    data={
                        CONF_URL: url,
                        CONF_TOKEN: token,
                        CONF_LITCAL_ENABLED: user_input[CONF_LITCAL_ENABLED],
                        CONF_LITCAL_CALENDAR: user_input[CONF_LITCAL_CALENDAR],
                    },
                )
        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema(_litcal_schema({
                vol.Required(CONF_URL, default=DEFAULT_URL): str,
                vol.Optional(CONF_TOKEN, default=""): selector.TextSelector(
                    selector.TextSelectorConfig(type=selector.TextSelectorType.PASSWORD)
                ),
            })),
            errors=errors,
        )


class VirtualCarillonOptionsFlow(config_entries.OptionsFlow):
    async def async_step_init(self, user_input: dict[str, Any] | None = None):
        if user_input is not None:
            return self.async_create_entry(title="", data=user_input)

        defaults = {**self.config_entry.data, **self.config_entry.options}
        return self.async_show_form(
            step_id="init",
            data_schema=vol.Schema(_litcal_schema({}, defaults)),
        )


def _litcal_schema(schema: dict[Any, Any], defaults: dict[str, Any] | None = None):
    defaults = defaults or {}
    schema.update({
        vol.Required(
            CONF_LITCAL_ENABLED,
            default=defaults.get(CONF_LITCAL_ENABLED, DEFAULT_LITCAL_ENABLED),
        ): selector.BooleanSelector(),
        vol.Required(
            CONF_LITCAL_CALENDAR,
            default=defaults.get(CONF_LITCAL_CALENDAR, DEFAULT_LITCAL_CALENDAR),
        ): selector.SelectSelector(
            selector.SelectSelectorConfig(options=list(LITCAL_CALENDARS))
        ),
    })
    return schema
