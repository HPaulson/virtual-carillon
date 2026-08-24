from __future__ import annotations

from copy import deepcopy
from typing import Any
from uuid import uuid4

import voluptuous as vol
from homeassistant import config_entries
from homeassistant.const import CONF_URL
from homeassistant.core import callback
from homeassistant.helpers import selector
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .const import (
    CONF_ASSET,
    CONF_CANONICAL_HOURS,
    CONF_CATEGORY_IDS,
    CONF_DELAY_SECONDS,
    CONF_EXCLUDED_TIMES,
    CONF_FALLBACK_ASSET,
    CONF_FEAST_IDS,
    CONF_FIXED_ASSET_ID,
    CONF_FREQUENCY,
    CONF_LITCAL_CALENDAR,
    CONF_LITCAL_ENABLED,
    CONF_MEDIA_PLAYERS,
    CONF_NOT_AFTER,
    CONF_NOT_BEFORE,
    CONF_OFFICES,
    CONF_RANK,
    CONF_RECENT_EXCLUSION,
    CONF_ROUTINE_ENABLED,
    CONF_ROUTINE_ID,
    CONF_ROUTINE_NAME,
    CONF_SCHEDULE,
    CONF_SEED,
    CONF_SEASONS,
    CONF_STRATEGY,
    CONF_TAGS,
    CONF_TIME,
    CONF_TOKEN,
    CONF_WEEKDAYS,
    DEFAULT_LITCAL_CALENDAR,
    DEFAULT_LITCAL_ENABLED,
    DEFAULT_URL,
    DOMAIN,
    LITCAL_CALENDARS,
)

DEFAULT_SCHEDULE = {
    "enabled": False,
    "routines": [],
    "litcal": {"enabled": DEFAULT_LITCAL_ENABLED, "calendar": DEFAULT_LITCAL_CALENDAR},
}
WEEKDAYS = ("sun", "mon", "tue", "wed", "thu", "fri", "sat")
FREQUENCIES = ("exact", "hourly", "every_15", "every_30")


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
    def __init__(self):
        self._schedule: dict[str, Any] | None = None
        self._draft_routine: dict[str, Any] | None = None
        self._draft_index: int | None = None

    async def async_step_init(self, user_input: dict[str, Any] | None = None):
        if self._schedule is None:
            existing = {**self.config_entry.data, **self.config_entry.options}
            self._schedule = _normalise_schedule(
                existing.get(CONF_SCHEDULE),
                litcal_enabled=existing.get(CONF_LITCAL_ENABLED, DEFAULT_LITCAL_ENABLED),
                litcal_calendar=existing.get(CONF_LITCAL_CALENDAR, DEFAULT_LITCAL_CALENDAR),
            )
            if not existing.get(CONF_SCHEDULE):
                remote = await self._async_get_schedule()
                self._schedule = _normalise_schedule(
                    remote,
                    litcal_enabled=existing.get(CONF_LITCAL_ENABLED, DEFAULT_LITCAL_ENABLED),
                    litcal_calendar=existing.get(CONF_LITCAL_CALENDAR, DEFAULT_LITCAL_CALENDAR),
                )

        menu_options = ["global", "add_routine"]
        if self._schedule["routines"]:
            menu_options.extend(["edit_routine", "remove_routine"])
        menu_options.append("finish")
        return self.async_show_menu(step_id="init", menu_options=menu_options)

    async def async_step_global(self, user_input: dict[str, Any] | None = None):
        if user_input is not None:
            self._schedule["enabled"] = user_input["schedule_enabled"]
            self._schedule["litcal"] = {
                "enabled": user_input[CONF_LITCAL_ENABLED],
                "calendar": user_input[CONF_LITCAL_CALENDAR],
            }
            return await self.async_step_init()
        return self.async_show_form(
            step_id="global",
            data_schema=vol.Schema({
                vol.Required("schedule_enabled", default=self._schedule["enabled"]): selector.BooleanSelector(),
                vol.Required(CONF_LITCAL_ENABLED, default=self._schedule["litcal"]["enabled"]): selector.BooleanSelector(),
                vol.Required(CONF_LITCAL_CALENDAR, default=self._schedule["litcal"]["calendar"]): selector.SelectSelector(
                    selector.SelectSelectorConfig(options=list(LITCAL_CALENDARS))
                ),
            }),
        )

    async def async_step_add_routine(self, user_input: dict[str, Any] | None = None):
        if user_input is not None:
            self._draft_index = None
            self._draft_routine = _routine_from_input(user_input)
            return await self.async_step_routine_actions()
        return self.async_show_form(step_id="add_routine", data_schema=_routine_schema())

    async def async_step_edit_routine(self, user_input: dict[str, Any] | None = None):
        routines = self._schedule["routines"]
        if user_input is not None:
            self._draft_index = next(index for index, routine in enumerate(routines) if routine["id"] == user_input[CONF_ROUTINE_ID])
            self._draft_routine = deepcopy(routines[self._draft_index])
            return await self.async_step_edit_routine_details()
        return self.async_show_form(
            step_id="edit_routine",
            data_schema=vol.Schema({vol.Required(CONF_ROUTINE_ID): vol.In({routine["id"]: routine["name"] for routine in routines})}),
        )

    async def async_step_edit_routine_details(self, user_input: dict[str, Any] | None = None):
        if user_input is not None:
            self._draft_routine.update(_routine_from_input(user_input, routine_id=self._draft_routine["id"], actions=self._draft_routine["actions"]))
            return await self.async_step_routine_actions()
        return self.async_show_form(step_id="edit_routine_details", data_schema=_routine_schema(self._draft_routine))

    async def async_step_remove_routine(self, user_input: dict[str, Any] | None = None):
        if user_input is not None:
            self._schedule["routines"] = [routine for routine in self._schedule["routines"] if routine["id"] != user_input[CONF_ROUTINE_ID]]
            return await self.async_step_init()
        return self.async_show_form(
            step_id="remove_routine",
            data_schema=vol.Schema({vol.Required(CONF_ROUTINE_ID): vol.In({routine["id"]: routine["name"] for routine in self._schedule["routines"]})}),
        )

    async def async_step_routine_actions(self, user_input: dict[str, Any] | None = None):
        menu_options = ["add_play", "add_hymn", "add_delay"]
        if self._draft_routine["actions"]:
            menu_options.append("remove_action")
        menu_options.append("finish_routine")
        return self.async_show_menu(
            step_id="routine_actions",
            menu_options=menu_options,
        )

    async def async_step_add_play(self, user_input: dict[str, Any] | None = None):
        if user_input is not None:
            self._draft_routine["actions"].append({
                "type": "play",
                "asset": user_input[CONF_ASSET].strip(),
                "mediaPlayers": _entities(user_input[CONF_MEDIA_PLAYERS]),
            })
            return await self.async_step_routine_actions()
        return self.async_show_form(step_id="add_play", data_schema=vol.Schema({
            vol.Required(CONF_ASSET): str,
            vol.Required(CONF_MEDIA_PLAYERS): selector.EntitySelector(selector.EntitySelectorConfig(domain="media_player", multiple=True)),
        }))

    async def async_step_add_hymn(self, user_input: dict[str, Any] | None = None):
        if user_input is not None:
            action = {
                "type": "select_hymn",
                "mediaPlayers": _entities(user_input[CONF_MEDIA_PLAYERS]),
                "strategy": user_input[CONF_STRATEGY],
                "recentExclusion": user_input[CONF_RECENT_EXCLUSION],
            }
            if str(user_input.get(CONF_SEED, "")).strip():
                action["seed"] = str(user_input[CONF_SEED]).strip()
            for field, key in (
                (CONF_FIXED_ASSET_ID, "fixedAssetId"),
                (CONF_FALLBACK_ASSET, "fallbackAsset"),
                (CONF_SEASONS, "seasons"),
                (CONF_RANK, "rank"),
                (CONF_FEAST_IDS, "feastIds"),
                (CONF_CATEGORY_IDS, "categoryIds"),
                (CONF_OFFICES, "offices"),
                (CONF_CANONICAL_HOURS, "canonicalHours"),
                (CONF_TAGS, "tags"),
            ):
                value = user_input.get(field, "")
                if field in (CONF_FIXED_ASSET_ID, CONF_FALLBACK_ASSET, CONF_RANK):
                    if str(value).strip():
                        action[key] = str(value).strip()
                else:
                    values = _csv(value)
                    if values:
                        action[key] = values
            self._draft_routine["actions"].append(action)
            return await self.async_step_routine_actions()
        return self.async_show_form(step_id="add_hymn", data_schema=_hymn_schema())

    async def async_step_add_delay(self, user_input: dict[str, Any] | None = None):
        if user_input is not None:
            self._draft_routine["actions"].append({"type": "delay", "seconds": user_input[CONF_DELAY_SECONDS]})
            return await self.async_step_routine_actions()
        return self.async_show_form(step_id="add_delay", data_schema=vol.Schema({
            vol.Required(CONF_DELAY_SECONDS, default=2): selector.NumberSelector(
                selector.NumberSelectorConfig(min=0, max=86400, step=0.5, mode=selector.NumberSelectorMode.BOX)
            ),
        }))

    async def async_step_remove_action(self, user_input: dict[str, Any] | None = None):
        actions = self._draft_routine["actions"]
        if user_input is not None:
            del actions[int(user_input["action_index"])]
            return await self.async_step_routine_actions()
        options = {str(index): _action_label(action, index) for index, action in enumerate(actions)}
        return self.async_show_form(step_id="remove_action", data_schema=vol.Schema({vol.Required("action_index"): vol.In(options)}))

    async def async_step_finish_routine(self, user_input: dict[str, Any] | None = None):
        if not self._draft_routine["actions"]:
            return await self.async_step_routine_actions()
        if self._draft_index is None:
            self._schedule["routines"].append(self._draft_routine)
        else:
            self._schedule["routines"][self._draft_index] = self._draft_routine
        self._draft_routine = None
        self._draft_index = None
        return await self.async_step_init()

    async def async_step_finish(self, user_input: dict[str, Any] | None = None):
        try:
            await self._async_save_schedule(self._schedule)
        except Exception:
            return self.async_abort(reason="cannot_connect")
        return self.async_create_entry(
            title="",
            data={
                CONF_LITCAL_ENABLED: self._schedule["litcal"]["enabled"],
                CONF_LITCAL_CALENDAR: self._schedule["litcal"]["calendar"],
            },
        )

    async def _async_get_schedule(self):
        url = self.config_entry.data[CONF_URL].rstrip("/")
        try:
            async with async_get_clientsession(self.hass).get(f"{url}/api/schedule", headers=_headers(self.config_entry.data.get(CONF_TOKEN, "")), timeout=5) as response:
                if response.status == 200:
                    return (await response.json()).get("config") or DEFAULT_SCHEDULE
        except Exception:
            pass
        return DEFAULT_SCHEDULE

    async def _async_save_schedule(self, schedule):
        url = self.config_entry.data[CONF_URL].rstrip("/")
        async with async_get_clientsession(self.hass).put(
            f"{url}/api/schedule",
            headers={**_headers(self.config_entry.data.get(CONF_TOKEN, "")), "Content-Type": "application/json"},
            json=schedule,
            timeout=10,
        ) as response:
            if response.status >= 300:
                raise RuntimeError(await response.text())
            return await response.json()


def _litcal_schema(schema: dict[Any, Any], defaults: dict[str, Any] | None = None):
    defaults = defaults or {}
    schema.update({
        vol.Required(CONF_LITCAL_ENABLED, default=defaults.get(CONF_LITCAL_ENABLED, DEFAULT_LITCAL_ENABLED)): selector.BooleanSelector(),
        vol.Required(CONF_LITCAL_CALENDAR, default=defaults.get(CONF_LITCAL_CALENDAR, DEFAULT_LITCAL_CALENDAR)): selector.SelectSelector(
            selector.SelectSelectorConfig(options=list(LITCAL_CALENDARS))
        ),
    })
    return schema


def _routine_schema(routine: dict[str, Any] | None = None):
    routine = routine or {}
    trigger = routine.get("trigger", {})
    schema = {
        vol.Required(CONF_ROUTINE_NAME, default=routine.get("name", "")): str,
        vol.Required(CONF_ROUTINE_ENABLED, default=routine.get("enabled", True)): selector.BooleanSelector(),
        vol.Required(CONF_FREQUENCY, default=trigger.get("frequency", "exact")): selector.SelectSelector(selector.SelectSelectorConfig(options=list(FREQUENCIES))),
        vol.Required(CONF_TIME, default=trigger.get("time", "12:00")): selector.TimeSelector(),
        vol.Required(CONF_WEEKDAYS, default=trigger.get("weekdays", list(WEEKDAYS))): selector.SelectSelector(
            selector.SelectSelectorConfig(options=list(WEEKDAYS), multiple=True)
        ),
        vol.Optional(CONF_EXCLUDED_TIMES, default=", ".join(trigger.get("excludedTimes", []))): str,
    }
    for field, key in ((CONF_NOT_BEFORE, "notBefore"), (CONF_NOT_AFTER, "notAfter")):
        value = trigger.get(key)
        if value:
            schema[vol.Optional(field, default=f"{value}:00")] = selector.TimeSelector()
        else:
            schema[vol.Optional(field)] = selector.TimeSelector()
    return vol.Schema(schema)


def _hymn_schema():
    return vol.Schema({
        vol.Required(CONF_MEDIA_PLAYERS): selector.EntitySelector(selector.EntitySelectorConfig(domain="media_player", multiple=True)),
        vol.Required(CONF_STRATEGY, default="random"): selector.SelectSelector(selector.SelectSelectorConfig(options=["random", "sequential", "fixed"])),
        vol.Optional(CONF_FIXED_ASSET_ID, default=""): str,
        vol.Optional(CONF_FALLBACK_ASSET, default=""): str,
        vol.Required(CONF_RECENT_EXCLUSION, default=3): selector.NumberSelector(selector.NumberSelectorConfig(min=0, max=100, mode=selector.NumberSelectorMode.BOX)),
        vol.Optional(CONF_SEED, default=""): str,
        vol.Optional(CONF_SEASONS, default=""): str,
        vol.Optional(CONF_RANK, default=""): str,
        vol.Optional(CONF_FEAST_IDS, default=""): str,
        vol.Optional(CONF_CATEGORY_IDS, default=""): str,
        vol.Optional(CONF_OFFICES, default=""): str,
        vol.Optional(CONF_CANONICAL_HOURS, default=""): str,
        vol.Optional(CONF_TAGS, default=""): str,
    })


def _routine_from_input(user_input: dict[str, Any], *, routine_id: str | None = None, actions: list[dict[str, Any]] | None = None):
    trigger = {
        "frequency": user_input[CONF_FREQUENCY],
        "time": _time_value(user_input[CONF_TIME]),
        "weekdays": list(user_input[CONF_WEEKDAYS]),
        "excludedTimes": _csv(user_input.get(CONF_EXCLUDED_TIMES, "")),
    }
    for field, key in ((CONF_NOT_BEFORE, "notBefore"), (CONF_NOT_AFTER, "notAfter")):
        value = _optional_time(user_input.get(field))
        if value:
            trigger[key] = value
    return {
        "id": routine_id or f"routine-{uuid4().hex[:12]}",
        "name": user_input[CONF_ROUTINE_NAME].strip(),
        "enabled": user_input[CONF_ROUTINE_ENABLED],
        "trigger": trigger,
        "actions": actions or [],
    }


def _normalise_schedule(value: Any, *, litcal_enabled: bool, litcal_calendar: str):
    if not isinstance(value, dict) or not isinstance(value.get("routines"), list):
        return {
            **deepcopy(DEFAULT_SCHEDULE),
            "litcal": {"enabled": litcal_enabled, "calendar": litcal_calendar},
        }
    return {
        "enabled": bool(value.get("enabled", False)),
        "routines": deepcopy(value.get("routines", [])),
        "litcal": {
            "enabled": bool(value.get("litcal", {}).get("enabled", litcal_enabled)),
            "calendar": value.get("litcal", {}).get("calendar", litcal_calendar),
        },
    }


def _time_value(value: Any) -> str:
    return str(value)[:5]


def _optional_time(value: Any) -> str | None:
    if value is None or not str(value).strip():
        return None
    return _time_value(value)


def _csv(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    return [item.strip() for item in str(value or "").replace("\n", ",").split(",") if item.strip()]


def _entities(value: Any) -> list[str]:
    return [str(item) for item in (value if isinstance(value, list) else [value])]


def _action_label(action: dict[str, Any], index: int) -> str:
    if action["type"] == "play":
        return f"{index + 1}: {action['asset']}"
    if action["type"] == "select_hymn":
        return f"{index + 1}: hymn ({action.get('strategy', 'random')})"
    return f"{index + 1}: wait {action['seconds']} seconds"


def _headers(token: str):
    return {"Authorization": f"Bearer {token}"} if token else {}
