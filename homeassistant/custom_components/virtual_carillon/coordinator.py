from __future__ import annotations

import logging
from datetime import date, timedelta
from urllib.parse import quote
from homeassistant.core import HomeAssistant
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .const import MEDIA_SOURCE_PREFIX

_LOGGER = logging.getLogger(__name__)
class CarillonCoordinator(DataUpdateCoordinator):
    def __init__(self, hass: HomeAssistant, url: str, token: str = "", *, litcal_enabled: bool = True, litcal_calendar: str = "general", distance_profile: str = "half-mile"):
        self.url = url.rstrip("/")
        self.headers = {"Authorization": f"Bearer {token}"} if token else {}
        self.litcal_enabled = litcal_enabled
        self.litcal_calendar = litcal_calendar
        self.distance_profile = distance_profile
        super().__init__(hass, logger=_LOGGER, name="Virtual Carillon", update_interval=timedelta(seconds=30))

    async def _async_update_data(self):
        from homeassistant.helpers.aiohttp_client import async_get_clientsession
        try:
            async with async_get_clientsession(self.hass).get(f"{self.url}/api/status", headers=self.headers, timeout=5) as response:
                if response.status != 200:
                    raise UpdateFailed(f"Engine returned HTTP {response.status}")
                status = await response.json()
            async with async_get_clientsession(self.hass).get(f"{self.url}/api/assets", headers=self.headers, timeout=5) as response:
                if response.status == 200:
                    status["assets"] = (await response.json()).get("assets", [])
            async with async_get_clientsession(self.hass).get(f"{self.url}/api/hymns", headers=self.headers, timeout=5) as response:
                if response.status == 200:
                    status["hymns"] = (await response.json()).get("hymns", [])
            if self.litcal_enabled:
                async with async_get_clientsession(self.hass).get(
                    f"{self.url}/api/liturgical/{date.today().isoformat()}",
                    params={"calendar": self.litcal_calendar},
                    headers=self.headers,
                    timeout=5,
                ) as response:
                    if response.status == 200:
                        status["liturgical_day"] = (await response.json()).get("day")
            return status
        except Exception as err:
            raise UpdateFailed(f"Unable to reach Virtual Carillon: {err}") from err

    async def async_play(
        self,
        asset: str,
        media_players: list[str],
        *,
        refresh: bool = True,
        enqueue: str | None = None,
        volume: float | None = None,
    ):
        media_id = f"{MEDIA_SOURCE_PREFIX}{quote(asset, safe='')}"
        _LOGGER.info(
            "Playing asset=%s on %s (volume=%s, enqueue=%s)",
            asset,
            media_players,
            volume,
            enqueue,
        )
        if volume is not None:
            await self.hass.services.async_call(
                "media_player",
                "volume_set",
                {
                    "entity_id": media_players,
                    "volume_level": max(0, min(100, float(volume))) / 100,
                },
                blocking=True,
            )
        data = {
            "entity_id": media_players,
            "media_content_id": media_id,
            "media_content_type": "audio/wav",
        }
        if enqueue is not None:
            data["enqueue"] = enqueue
        await self.hass.services.async_call(
            "media_player",
            "play_media",
            data,
            blocking=True,
        )
        if refresh:
            await self.async_request_refresh()

    async def async_update_schedule(self, schedule: dict):
        from homeassistant.helpers.aiohttp_client import async_get_clientsession
        async with async_get_clientsession(self.hass).put(
            f"{self.url}/api/schedule",
            headers={**self.headers, "Content-Type": "application/json"},
            json=schedule,
            timeout=10,
        ) as response:
            if response.status >= 300:
                raise RuntimeError(await response.text())
            return await response.json()

    async def async_claim_schedule(self, at):
        from homeassistant.helpers.aiohttp_client import async_get_clientsession
        async with async_get_clientsession(self.hass).post(
            f"{self.url}/api/schedule/claim",
            headers={**self.headers, "Content-Type": "application/json"},
            json={"at": at.isoformat()},
            timeout=10,
        ) as response:
            if response.status >= 300:
                raise RuntimeError(await response.text())
            result = await response.json()
            if result.get("due"):
                _LOGGER.info(
                    "Schedule due at %s: slot=%s claimed=%s",
                    at.isoformat(),
                    result.get("slotKey"),
                    result.get("claimed"),
                )
            return result

    async def async_complete_schedule(self, slot_key: str, status: str, message: str | None = None):
        from homeassistant.helpers.aiohttp_client import async_get_clientsession
        async with async_get_clientsession(self.hass).post(
            f"{self.url}/api/schedule/complete",
            headers={**self.headers, "Content-Type": "application/json"},
            json={"slotKey": slot_key, "status": status, "message": message},
            timeout=10,
        ) as response:
            if response.status >= 300:
                raise RuntimeError(await response.text())
        _LOGGER.info(
            "Schedule complete: slot=%s status=%s%s",
            slot_key,
            status,
            f" message={message}" if message else "",
        )

    async def async_stop(self, media_players: list[str]):
        await self.hass.services.async_call(
            "media_player",
            "media_stop",
            {"entity_id": media_players},
            blocking=True,
        )

    async def async_select_hymn(
        self,
        media_players: list[str],
        strategy: str = "random",
        fixed_asset_id: str | None = None,
        category_ids: list[str] | None = None,
        feast_ids: list[str] | None = None,
        offices: list[str] | None = None,
        seasons: list[str] | None = None,
        rank: str | None = None,
        canonical_hours: list[str] | None = None,
        seed: str | int | None = None,
        recent_exclusion: int | None = None,
        date_value: str | None = None,
    ):
        from homeassistant.helpers.aiohttp_client import async_get_clientsession
        payload = {"strategy": strategy, "useLitCal": self.litcal_enabled, "calendar": self.litcal_calendar}
        if date_value is not None:
            payload["date"] = date_value
        if fixed_asset_id:
            payload["fixedAssetId"] = fixed_asset_id
        if category_ids is not None:
            payload["categoryIds"] = category_ids
        if feast_ids is not None:
            payload["feastIds"] = feast_ids
        if offices is not None:
            payload["offices"] = offices
        if seasons is not None:
            payload["seasons"] = seasons
        if rank:
            payload["rank"] = rank
        if canonical_hours is not None:
            payload["canonicalHours"] = canonical_hours
        if seed is not None:
            payload["seed"] = seed
        if recent_exclusion is not None:
            payload["recentExclusion"] = recent_exclusion
        async with async_get_clientsession(self.hass).post(
            f"{self.url}/api/hymns/select",
            headers=self.headers,
            json=payload,
            timeout=10,
        ) as response:
            if response.status >= 300:
                raise RuntimeError(await response.text())
            result = await response.json()
        asset = ((result.get("selection") or {}).get("asset") or {}).get("id")
        if asset:
            await self.async_play(asset, media_players)
