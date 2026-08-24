from __future__ import annotations

from copy import deepcopy
import re
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
    CONF_CANONICAL_HOUR,
    CONF_CATEGORY_IDS,
    CONF_DISTANCE_PROFILE,
    CONF_LITCAL_CALENDAR,
    CONF_LITCAL_ENABLED,
    CONF_MEDIA_PLAYERS,
    CONF_NOT_AFTER,
    CONF_NOT_BEFORE,
    CONF_PLAY_TYPE,
    CONF_ROUTINE_ENABLED,
    CONF_ROUTINE_ID,
    CONF_ROUTINE_NAME,
    CONF_SCHEDULE,
    CONF_STRATEGY,
    CONF_TIMES,
    CONF_TOKEN,
    CONF_VOLUME,
    CONF_WESTMINSTER_CADENCE,
    CONF_WESTMINSTER_DAYS,
    CONF_WESTMINSTER_ENABLED,
    CONF_WESTMINSTER_MEDIA_PLAYERS,
    CONF_WESTMINSTER_NOT_AFTER,
    CONF_WESTMINSTER_NOT_BEFORE,
    DEFAULT_LITCAL_CALENDAR,
    DEFAULT_DISTANCE_PROFILE,
    DEFAULT_LITCAL_ENABLED,
    DEFAULT_URL,
    DOMAIN,
    DISTANCE_PROFILES,
    LITCAL_CALENDARS,
)

DEFAULT_SCHEDULE = {
    "enabled": False,
    "westminster": {
        "enabled": False,
        "cadence": "every_15",
        "weekdays": ["sun", "mon", "tue", "wed", "thu", "fri", "sat"],
        "mediaPlayers": [],
    },
    "routines": [],
    "litcal": {"enabled": DEFAULT_LITCAL_ENABLED, "calendar": DEFAULT_LITCAL_CALENDAR},
}
WEEKDAYS = ("sun", "mon", "tue", "wed", "thu", "fri", "sat")
WEEKDAY_OPTIONS = [
    {"value": "sun", "label": "Sunday"},
    {"value": "mon", "label": "Monday"},
    {"value": "tue", "label": "Tuesday"},
    {"value": "wed", "label": "Wednesday"},
    {"value": "thu", "label": "Thursday"},
    {"value": "fri", "label": "Friday"},
    {"value": "sat", "label": "Saturday"},
]
ASSET_TYPE_OPTIONS = [
    {"value": "manual", "label": "Manual — Select a specific hymn"},
    {"value": "category", "label": "Category — Select from a hymn category"},
    {"value": "automatic", "label": "Automatic — Hymn selected based on liturgical calendar"},
]
CATEGORY_OPTIONS = [
    # Devotional and doctrinal themes.
    {"value": "marian", "label": "Marian"},
    {"value": "christological", "label": "Christological"},
    {"value": "eucharistic", "label": "Eucharistic"},
    {"value": "holy-spirit", "label": "Holy Spirit"},
    {"value": "passion", "label": "Passion"},
    {"value": "resurrection", "label": "Resurrection"},

    # Saint and vocation affinities.
    {"value": "saints", "label": "Saints"},
    {"value": "angels", "label": "Angels"},
    {"value": "apostles", "label": "Apostles"},
    {"value": "martyrs", "label": "Martyrs"},
    {"value": "virgins", "label": "Virgins"},
    {"value": "doctors", "label": "Doctors of the Church"},
    {"value": "religious", "label": "Religious"},

    # Sacramental, devotional, and liturgical-use affinities.
    {"value": "praise", "label": "Praise"},
    {"value": "thanksgiving", "label": "Thanksgiving"},
    {"value": "confidence", "label": "Confidence in God"},
    {"value": "contemplative", "label": "Contemplative"},
    {"value": "incarnation", "label": "Incarnation"},
    {"value": "penitential", "label": "Penitential"},
    {"value": "psalm", "label": "Psalm"},
]
CATEGORY_LABELS = {option["value"]: option["label"] for option in CATEGORY_OPTIONS}
CANONICAL_HOUR_OPTIONS = [
    # HA treats an empty value in a required selector as an omitted field.
    # Use a real value in the form and translate it back to no filter below.
    {"value": "None", "label": "None"},
    {"value": "matins", "label": "Matins (Office of Readings)"},
    {"value": "lauds", "label": "Lauds (Morning)"},
    {"value": "daytime", "label": "Terce/Sext/None (Daytime)"},
    {"value": "vespers", "label": "Vespers (Evening)"},
    {"value": "compline", "label": "Compline (Night)"},
]
WESTMINSTER_CADENCE_OPTIONS = [
    {"value": "every_15", "label": "Every 15 minutes"},
    {"value": "every_30", "label": "Every 30 minutes"},
    {"value": "hourly", "label": "Every hour"},
]


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
        self._assets: list[dict[str, Any]] = []
        self._distance_profile = DEFAULT_DISTANCE_PROFILE

    async def async_step_init(self, user_input: dict[str, Any] | None = None):
        if self._schedule is None:
            existing = {**self.config_entry.data, **self.config_entry.options}
            self._distance_profile = existing.get(CONF_DISTANCE_PROFILE, DEFAULT_DISTANCE_PROFILE)
            schedule = existing.get(CONF_SCHEDULE)
            if not schedule:
                schedule = await self._async_get_schedule()
            self._schedule = _normalise_schedule(
                schedule,
                litcal_enabled=existing.get(CONF_LITCAL_ENABLED, DEFAULT_LITCAL_ENABLED),
                litcal_calendar=existing.get(CONF_LITCAL_CALENDAR, DEFAULT_LITCAL_CALENDAR),
            )
            self._assets = await self._async_get_assets()
            self._assets.extend(await self._async_get_hymns())

        menu_options = ["global", "westminster", "add_routine"]
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
            self._distance_profile = user_input[CONF_DISTANCE_PROFILE]
            return await self.async_step_init()
        return self.async_show_form(
            step_id="global",
            data_schema=vol.Schema({
                vol.Required("schedule_enabled", default=self._schedule["enabled"]): selector.BooleanSelector(),
                vol.Required(CONF_LITCAL_ENABLED, default=self._schedule["litcal"]["enabled"]): selector.BooleanSelector(),
                vol.Required(CONF_LITCAL_CALENDAR, default=self._schedule["litcal"]["calendar"]): selector.SelectSelector(
                    selector.SelectSelectorConfig(options=list(LITCAL_CALENDARS))
                ),
                vol.Required(CONF_DISTANCE_PROFILE, default=self._distance_profile): selector.SelectSelector(
                    selector.SelectSelectorConfig(options=[
                        {"value": value, "label": value.replace("-", " ").title()}
                        for value in DISTANCE_PROFILES
                    ])
                ),
            }),
        )

    async def async_step_westminster(self, user_input: dict[str, Any] | None = None):
        errors = {}
        if user_input is not None:
            if user_input[CONF_WESTMINSTER_ENABLED] and not _entities(user_input.get(CONF_WESTMINSTER_MEDIA_PLAYERS, [])):
                errors["base"] = "media_players_required"
            else:
                westminster = {
                    "enabled": user_input[CONF_WESTMINSTER_ENABLED],
                    "cadence": user_input[CONF_WESTMINSTER_CADENCE],
                    "weekdays": list(user_input[CONF_WESTMINSTER_DAYS]),
                    "mediaPlayers": _entities(user_input.get(CONF_WESTMINSTER_MEDIA_PLAYERS, [])),
                }
                for field, key in ((CONF_WESTMINSTER_NOT_BEFORE, "notBefore"), (CONF_WESTMINSTER_NOT_AFTER, "notAfter")):
                    value = _optional_time(user_input.get(field))
                    if value:
                        westminster[key] = value
                self._schedule["westminster"] = westminster
                return await self.async_step_init()
        westminster = self._schedule["westminster"]
        return self.async_show_form(
            step_id="westminster",
            data_schema=_westminster_schema(westminster),
            errors=errors,
        )

    async def async_step_add_routine(self, user_input: dict[str, Any] | None = None):
        if user_input is not None:
            self._routine_mode = user_input[CONF_PLAY_TYPE]
            return await self._async_step_add_routine_details()
        return self.async_show_form(step_id="add_routine", data_schema=_routine_mode_schema("automatic"))

    async def async_step_add_routine_manual(self, user_input: dict[str, Any] | None = None):
        self._routine_mode = "manual"
        return await self._async_step_add_routine_details(user_input)

    async def async_step_add_routine_automatic(self, user_input: dict[str, Any] | None = None):
        self._routine_mode = "automatic"
        return await self._async_step_add_routine_details(user_input)

    async def async_step_add_routine_category(self, user_input: dict[str, Any] | None = None):
        self._routine_mode = "category"
        return await self._async_step_add_routine_details(user_input)

    async def _async_step_add_routine_details(self, user_input: dict[str, Any] | None = None):
        errors = {}
        if user_input is not None:
            if self._routine_mode == "manual" and not str(user_input.get(CONF_ASSET, "")).strip():
                errors["base"] = "asset_required"
            elif self._routine_mode == "category" and not user_input.get(CONF_CATEGORY_IDS):
                errors["base"] = "category_required"
            elif not _valid_times(user_input.get(CONF_TIMES, "")):
                errors["base"] = "invalid_times"
            elif not _entities(user_input.get(CONF_MEDIA_PLAYERS, [])):
                errors["base"] = "media_players_required"
            else:
                self._schedule["routines"].append(
                    _routine_from_input({**user_input, CONF_PLAY_TYPE: self._routine_mode})
                )
                return await self.async_step_init()
        return self.async_show_form(
            step_id=f"add_routine_{self._routine_mode}",
            data_schema=_routine_schema(self._assets, mode=self._routine_mode),
            errors=errors,
        )

    async def async_step_edit_routine(self, user_input: dict[str, Any] | None = None):
        routines = self._schedule["routines"]
        if user_input is not None:
            routine = next(routine for routine in routines if routine["id"] == user_input[CONF_ROUTINE_ID])
            self._editing_routine_id = routine["id"]
            self._routine_mode = _routine_defaults(routine)["play_type"]
            return await self.async_step_edit_routine_mode()
        return self.async_show_form(
            step_id="edit_routine",
            data_schema=vol.Schema({
                vol.Required(CONF_ROUTINE_ID): vol.In({routine["id"]: routine["name"] for routine in routines})
            }),
        )

    async def async_step_edit_routine_mode(self, user_input: dict[str, Any] | None = None):
        if user_input is not None:
            self._routine_mode = user_input[CONF_PLAY_TYPE]
            return await self._async_step_edit_routine_details()
        return self.async_show_form(
            step_id="edit_routine_mode",
            data_schema=_routine_mode_schema(self._routine_mode),
        )

    async def async_step_edit_routine_manual(self, user_input: dict[str, Any] | None = None):
        self._routine_mode = "manual"
        return await self._async_step_edit_routine_details(user_input)

    async def async_step_edit_routine_automatic(self, user_input: dict[str, Any] | None = None):
        self._routine_mode = "automatic"
        return await self._async_step_edit_routine_details(user_input)

    async def async_step_edit_routine_category(self, user_input: dict[str, Any] | None = None):
        self._routine_mode = "category"
        return await self._async_step_edit_routine_details(user_input)

    async def _async_step_edit_routine_details(self, user_input: dict[str, Any] | None = None):
        routine = next(routine for routine in self._schedule["routines"] if routine["id"] == self._editing_routine_id)
        errors = {}
        if user_input is not None:
            if self._routine_mode == "manual" and not str(user_input.get(CONF_ASSET, "")).strip():
                errors["base"] = "asset_required"
            elif self._routine_mode == "category" and not user_input.get(CONF_CATEGORY_IDS):
                errors["base"] = "category_required"
            elif not _valid_times(user_input.get(CONF_TIMES, "")):
                errors["base"] = "invalid_times"
            elif not _entities(user_input.get(CONF_MEDIA_PLAYERS, [])):
                errors["base"] = "media_players_required"
            else:
                index = self._schedule["routines"].index(routine)
                self._schedule["routines"][index] = _routine_from_input(
                    {**user_input, CONF_PLAY_TYPE: self._routine_mode}, routine_id=routine["id"]
                )
                return await self.async_step_init()
        return self.async_show_form(
            step_id=f"edit_routine_{self._routine_mode}",
            data_schema=_routine_schema(self._assets, routine, mode=self._routine_mode),
            errors=errors,
        )

    async def async_step_remove_routine(self, user_input: dict[str, Any] | None = None):
        if user_input is not None:
            self._schedule["routines"] = [
                routine for routine in self._schedule["routines"] if routine["id"] != user_input[CONF_ROUTINE_ID]
            ]
            return await self.async_step_init()
        return self.async_show_form(
            step_id="remove_routine",
            data_schema=vol.Schema({
                vol.Required(CONF_ROUTINE_ID): vol.In({routine["id"]: routine["name"] for routine in self._schedule["routines"]})
            }),
        )

    async def async_step_finish(self, user_input: dict[str, Any] | None = None):
        try:
            await self._async_save_schedule(self._schedule)
        except Exception:
            return self.async_abort(reason="cannot_connect")
        return self.async_create_entry(
            title="",
            data={
                CONF_SCHEDULE: deepcopy(self._schedule),
                CONF_LITCAL_ENABLED: self._schedule["litcal"]["enabled"],
                CONF_LITCAL_CALENDAR: self._schedule["litcal"]["calendar"],
                CONF_DISTANCE_PROFILE: self._distance_profile,
            },
        )

    async def _async_get_schedule(self):
        url = self.config_entry.data[CONF_URL].rstrip("/")
        try:
            async with async_get_clientsession(self.hass).get(
                f"{url}/api/schedule",
                headers=_headers(self.config_entry.data.get(CONF_TOKEN, "")),
                timeout=5,
            ) as response:
                if response.status == 200:
                    return (await response.json()).get("config") or DEFAULT_SCHEDULE
        except Exception:
            pass
        return DEFAULT_SCHEDULE

    async def _async_get_assets(self) -> list[dict[str, Any]]:
        url = self.config_entry.data[CONF_URL].rstrip("/")
        try:
            async with async_get_clientsession(self.hass).get(
                f"{url}/api/assets",
                headers=_headers(self.config_entry.data.get(CONF_TOKEN, "")),
                timeout=10,
            ) as response:
                if response.status == 200:
                    return (await response.json()).get("assets", [])
        except Exception:
            pass
        return []

    async def _async_get_hymns(self) -> list[dict[str, Any]]:
        url = self.config_entry.data[CONF_URL].rstrip("/")
        try:
            async with async_get_clientsession(self.hass).get(
                f"{url}/api/hymns",
                headers=_headers(self.config_entry.data.get(CONF_TOKEN, "")),
                timeout=10,
            ) as response:
                if response.status == 200:
                    return (await response.json()).get("hymns", [])
        except Exception:
            pass
        return []

    async def _async_save_schedule(self, schedule):
        url = self.config_entry.data[CONF_URL].rstrip("/")
        async with async_get_clientsession(self.hass).put(
            f"{url}/api/schedule",
            headers={**_headers(self.config_entry.data.get(CONF_TOKEN, "")), "Content-Type": "application/json"},
            json=_simple_schedule(schedule),
            timeout=10,
        ) as response:
            if response.status >= 300:
                raise RuntimeError(await response.text())


def _litcal_schema(schema: dict[Any, Any], defaults: dict[str, Any] | None = None):
    defaults = defaults or {}
    schema.update({
        vol.Required(CONF_LITCAL_ENABLED, default=defaults.get(CONF_LITCAL_ENABLED, DEFAULT_LITCAL_ENABLED)): selector.BooleanSelector(),
        vol.Required(CONF_LITCAL_CALENDAR, default=defaults.get(CONF_LITCAL_CALENDAR, DEFAULT_LITCAL_CALENDAR)): selector.SelectSelector(
            selector.SelectSelectorConfig(options=list(LITCAL_CALENDARS))
        ),
    })
    return schema


def _westminster_schema(westminster: dict[str, Any]):
    schema = {
        vol.Required(CONF_WESTMINSTER_ENABLED, default=westminster.get("enabled", False)): selector.BooleanSelector(),
        vol.Required(CONF_WESTMINSTER_CADENCE, default=westminster.get("cadence", "every_15")): selector.SelectSelector(
            selector.SelectSelectorConfig(options=WESTMINSTER_CADENCE_OPTIONS)
        ),
        vol.Required(CONF_WESTMINSTER_DAYS, default=westminster.get("weekdays", list(WEEKDAYS))): selector.SelectSelector(
            selector.SelectSelectorConfig(options=WEEKDAY_OPTIONS, multiple=True)
        ),
        vol.Optional(
            CONF_WESTMINSTER_MEDIA_PLAYERS,
            default=westminster.get("mediaPlayers", []),
        ): selector.EntitySelector(selector.EntitySelectorConfig(domain="media_player", multiple=True)),
    }
    _add_optional_time(schema, CONF_WESTMINSTER_NOT_BEFORE, westminster.get("notBefore"))
    _add_optional_time(schema, CONF_WESTMINSTER_NOT_AFTER, westminster.get("notAfter"))
    return vol.Schema(schema)


def _routine_mode_schema(default: str):
    return vol.Schema({
        vol.Required(CONF_PLAY_TYPE, default=default): selector.SelectSelector(
            selector.SelectSelectorConfig(options=ASSET_TYPE_OPTIONS)
        ),
    })


def _routine_schema(
    assets: list[dict[str, Any]],
    routine: dict[str, Any] | None = None,
    *,
    mode: str | None = None,
):
    defaults = _routine_defaults(routine)
    schema = {
        vol.Optional(CONF_ROUTINE_NAME, default=defaults["name"]): str,
        vol.Required(CONF_ROUTINE_ENABLED, default=defaults["enabled"]): selector.BooleanSelector(),
        vol.Required(CONF_TIMES, default=defaults["times"]): str,
        vol.Required("weekdays", default=defaults["weekdays"]): selector.SelectSelector(
            selector.SelectSelectorConfig(options=WEEKDAY_OPTIONS, multiple=True)
        ),
        vol.Required(CONF_MEDIA_PLAYERS, default=defaults["media_players"]): selector.EntitySelector(
            selector.EntitySelectorConfig(domain="media_player", multiple=True)
        ),
    }
    volume_selector = selector.TextSelector(
        selector.TextSelectorConfig(type=selector.TextSelectorType.NUMBER)
    )
    if defaults["volume"] is None:
        schema[vol.Optional(CONF_VOLUME, default="")] = volume_selector
    else:
        schema[vol.Optional(CONF_VOLUME, default=str(defaults["volume"]))] = volume_selector
    selected_mode = mode or defaults["play_type"]
    if selected_mode == "manual":
        schema[vol.Required(CONF_ASSET, default=defaults["asset"])] = selector.SelectSelector(
            selector.SelectSelectorConfig(options=_asset_options(assets, include_empty=True))
        )
    else:
        if selected_mode == "category":
            schema[vol.Required(CONF_CATEGORY_IDS, default=defaults["category_ids"])] = selector.SelectSelector(
                selector.SelectSelectorConfig(
                    options=_category_options(assets, defaults["category_ids"]),
                    multiple=True,
                )
            )
        # This must be Required so selecting None is submitted as an explicit
        # value. Optional fields can be omitted by HA, which would preserve a
        # previously selected hour (for example, Vespers) while editing.
        schema[vol.Required(CONF_CANONICAL_HOUR, default=defaults["canonical_hour"])] = selector.SelectSelector(
            selector.SelectSelectorConfig(options=CANONICAL_HOUR_OPTIONS)
        )
    _add_optional_time(schema, CONF_NOT_BEFORE, defaults["not_before"])
    _add_optional_time(schema, CONF_NOT_AFTER, defaults["not_after"])
    return vol.Schema(schema)


def _add_optional_time(schema: dict[Any, Any], field: str, value: str | None):
    if value:
        schema[vol.Optional(field, default=f"{value}:00")] = selector.TimeSelector()
    else:
        schema[vol.Optional(field)] = selector.TimeSelector()


def _asset_options(assets: list[dict[str, Any]], *, include_empty: bool):
    options = [{"value": "", "label": "None"}] if include_empty else []
    valid_assets = sorted(
        {str(asset["id"]): asset for asset in assets if asset.get("id")}.values(),
        key=lambda asset: (str(asset.get("name", asset["id"])).casefold(), str(asset["id"]).casefold()),
    )
    options.extend(
        {"value": asset["id"], "label": f"{asset.get('name', asset['id'])} ({asset['id']})"}
        for asset in valid_assets
    )
    return options


def _category_options(assets: list[dict[str, Any]], selected: list[str] | None = None):
    """Return selectable categories represented by the engine's hymn catalog.

    The server is the source of truth for hymn metadata. Keep the canonical
    options as a fallback for a temporarily unavailable catalog, and retain
    saved values so editing a schedule never drops a category just because a
    hymn fetch was incomplete.
    """
    category_ids = {
        str(category)
        for asset in assets
        for category in (asset.get("liturgicalTags", {}).get("categories", []) if isinstance(asset.get("liturgicalTags"), dict) else [])
        if str(category) in CATEGORY_LABELS
    }
    category_ids.update(str(category) for category in (selected or []) if str(category) in CATEGORY_LABELS)
    if not category_ids:
        category_ids = set(CATEGORY_LABELS)
    return [
        {"value": option["value"], "label": option["label"]}
        for option in CATEGORY_OPTIONS
        if option["value"] in category_ids
    ]


def _routine_defaults(routine: dict[str, Any] | None):
    if not routine:
        return {
            "name": "",
            "enabled": True,
            "play_type": "manual",
            "asset": "",
            "category_ids": [],
            "canonical_hour": "None",
            "times": "12:00",
            "weekdays": list(WEEKDAYS),
            "media_players": [],
            "volume": None,
            "not_before": None,
            "not_after": None,
        }
    trigger = routine.get("trigger", {})
    action = next((item for item in routine.get("actions", []) if item.get("type") != "delay"), {})
    if not action and routine.get("type"):
        action = {
            "type": "select_hymn" if routine.get("type") == "liturgical_hymn" else "play",
            "asset": "angelus" if routine.get("type") == "angelus" else routine.get("asset", ""),
            "mediaPlayers": routine.get("mediaPlayers", []),
            "volume": routine.get("volume"),
        }
        trigger = {
            "times": routine.get("times", ["12:00"]),
            "time": (routine.get("times") or ["12:00"])[0],
            "weekdays": routine.get("weekdays", list(WEEKDAYS)),
            "notBefore": routine.get("notBefore"),
            "notAfter": routine.get("notAfter"),
        }
    return {
        "name": routine.get("name", ""),
        "enabled": routine.get("enabled", True),
        "play_type": "category" if action.get("type") == "select_hymn" and action.get("categoryIds") else ("automatic" if action.get("type") == "select_hymn" else "manual"),
        "asset": action.get("asset", ""),
        "category_ids": action.get("categoryIds", []),
        "canonical_hour": (action.get("canonicalHours") or ["None"])[0] or "None",
        "times": ", ".join(trigger.get("times", [trigger.get("time", "12:00")])),
        "weekdays": trigger.get("weekdays", list(WEEKDAYS)),
        "media_players": action.get("mediaPlayers", []),
        "volume": action.get("volume"),
        "not_before": trigger.get("notBefore"),
        "not_after": trigger.get("notAfter"),
    }


def _routine_from_input(user_input: dict[str, Any], *, routine_id: str | None = None):
    times = _csv(user_input.get(CONF_TIMES, ""))
    if not times:
        times = ["12:00"]
    trigger = {
        "frequency": "exact",
        "time": times[0],
        "times": times,
        "weekdays": list(user_input.get("weekdays", WEEKDAYS)),
        "excludedTimes": [],
    }
    for field, key in ((CONF_NOT_BEFORE, "notBefore"), (CONF_NOT_AFTER, "notAfter")):
        value = _optional_time(user_input.get(field))
        if value:
            trigger[key] = value

    play_type = user_input.get(CONF_PLAY_TYPE, "manual")
    if play_type in ("automatic", "category"):
        action = {
            "type": "select_hymn",
            "strategy": "random",
            "mediaPlayers": _entities(user_input.get(CONF_MEDIA_PLAYERS, [])),
        }
        if play_type == "category":
            action["categoryIds"] = list(user_input.get(CONF_CATEGORY_IDS, []))
        canonical_hour = str(user_input.get(CONF_CANONICAL_HOUR, "None")).strip()
        if canonical_hour and canonical_hour.casefold() != "none":
            action["canonicalHours"] = [canonical_hour]
        default_name = "Hymn from category" if play_type == "category" else "Automatic hymn"
    else:
        action = {
            "type": "play",
            "asset": str(user_input.get(CONF_ASSET, "")).strip(),
            "mediaPlayers": _entities(user_input.get(CONF_MEDIA_PLAYERS, [])),
        }
        default_name = action["asset"] or "Asset"

    volume = str(user_input.get(CONF_VOLUME, "")).strip()
    if volume:
        action["volume"] = int(float(volume))
    name = str(user_input.get(CONF_ROUTINE_NAME, "")).strip() or default_name
    return {
        "id": routine_id or f"routine-{uuid4().hex[:12]}",
        "name": name,
        "enabled": user_input.get(CONF_ROUTINE_ENABLED, True),
        "trigger": trigger,
        "actions": [action],
    }


def _normalise_schedule(value: Any, *, litcal_enabled: bool, litcal_calendar: str):
    if not isinstance(value, dict):
        value = {}
    westminster = value.get("westminster") if isinstance(value.get("westminster"), dict) else {}
    litcal = value.get("litcal") if isinstance(value.get("litcal"), dict) else {}
    routines = value.get("routines", []) if isinstance(value.get("routines"), list) else []
    normalised_routines = [
        _normalise_routine(routine, index)
        for index, routine in enumerate(routines)
        if isinstance(routine, dict)
    ]
    return {
        "enabled": bool(value.get("enabled", False)),
        "westminster": {
            **deepcopy(DEFAULT_SCHEDULE["westminster"]),
            **deepcopy(westminster),
        },
        "routines": normalised_routines,
        "litcal": {
            "enabled": bool(litcal.get("enabled", litcal_enabled)),
            "calendar": litcal.get("calendar", litcal_calendar),
        },
    }


def _normalise_routine(routine: dict[str, Any], index: int):
    if isinstance(routine.get("actions"), list):
        return deepcopy(routine)
    times = routine.get("times") if isinstance(routine.get("times"), list) else _csv(routine.get("times", "12:00"))
    times = times or ["12:00"]
    is_hymn = routine.get("type") in ("liturgical_hymn", "hymn_category")
    action = {
        "type": "select_hymn" if is_hymn else "play",
        "mediaPlayers": list(routine.get("mediaPlayers", [])),
        "outputs": list(routine.get("outputs", [])),
    }
    if routine.get("volume") is not None:
        action["volume"] = routine["volume"]
    if is_hymn:
        action["strategy"] = routine.get("strategy", "random")
        if routine.get("categoryIds"):
            action["categoryIds"] = list(routine["categoryIds"])
        if routine.get("canonicalHour"):
            action["canonicalHours"] = [routine["canonicalHour"]]
    else:
        action["asset"] = "angelus" if routine.get("type") == "angelus" else routine.get("asset", "")
    return {
        "id": routine.get("id") or f"routine-{index + 1}",
        "name": routine.get("name") or ("Liturgical hymn" if is_hymn else routine.get("asset", "Scheduled asset")),
        "enabled": routine.get("enabled", True),
        "trigger": {
            "frequency": "exact",
            "time": times[0],
            "times": times,
            "weekdays": routine.get("weekdays", list(WEEKDAYS)),
            "excludedTimes": routine.get("excludedTimes", []),
            **({"notBefore": routine["notBefore"]} if routine.get("notBefore") else {}),
            **({"notAfter": routine["notAfter"]} if routine.get("notAfter") else {}),
        },
        "actions": [action],
    }


def _simple_schedule(schedule: dict[str, Any]):
    routines = []
    for routine in schedule.get("routines", []):
        action = next((item for item in routine.get("actions", []) if item.get("type") != "delay"), {})
        trigger = routine.get("trigger", {})
        is_hymn = action.get("type") == "select_hymn"
        simple = {
            "id": routine["id"],
            "name": routine.get("name", "Scheduled playback"),
            "enabled": routine.get("enabled", True),
            "type": "hymn_category" if is_hymn and action.get("categoryIds") else ("liturgical_hymn" if is_hymn else "asset"),
            "times": trigger.get("times", [trigger.get("time", "12:00")]),
            "weekdays": trigger.get("weekdays", list(WEEKDAYS)),
            "mediaPlayers": action.get("mediaPlayers", []),
            "outputs": action.get("outputs", []),
        }
        if action.get("volume") is not None:
            simple["volume"] = action["volume"]
        if is_hymn:
            if action.get("canonicalHours"):
                simple["canonicalHour"] = action["canonicalHours"][0]
            if action.get("categoryIds"):
                simple["categoryIds"] = action["categoryIds"]
        else:
            simple["asset"] = action.get("asset", "")
        for key in ("notBefore", "notAfter"):
            if trigger.get(key):
                simple[key] = trigger[key]
        routines.append(simple)
    return {
        "enabled": schedule.get("enabled", False),
        "westminster": deepcopy(schedule.get("westminster", DEFAULT_SCHEDULE["westminster"])),
        "litcal": deepcopy(schedule.get("litcal", {"enabled": True, "calendar": "general"})),
        "routines": routines,
    }


def _optional_time(value: Any) -> str | None:
    if value is None or not str(value).strip():
        return None
    return str(value)[:5]


def _valid_times(value: Any) -> bool:
    return bool(_csv(value)) and all(re.fullmatch(r"(?:[01]\d|2[0-3]):[0-5]\d", item) for item in _csv(value))


def _csv(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    return [item.strip() for item in str(value or "").replace("\n", ",").split(",") if item.strip()]


def _entities(value: Any) -> list[str]:
    return [str(item) for item in (value if isinstance(value, list) else [value]) if str(item)]


def _headers(token: str):
    return {"Authorization": f"Bearer {token}"} if token else {}
