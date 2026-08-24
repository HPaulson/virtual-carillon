from __future__ import annotations

import logging
from datetime import date, timedelta
from homeassistant.core import HomeAssistant
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

_LOGGER = logging.getLogger(__name__)


class CarillonCoordinator(DataUpdateCoordinator):
    def __init__(self, hass: HomeAssistant, url: str):
        self.url = url.rstrip("/")
        super().__init__(hass, logger=_LOGGER, name="Virtual Carillon", update_interval=timedelta(seconds=30))

    async def _async_update_data(self):
        from homeassistant.helpers.aiohttp_client import async_get_clientsession
        try:
            async with async_get_clientsession(self.hass).get(f"{self.url}/api/status", timeout=5) as response:
                if response.status != 200:
                    raise UpdateFailed(f"Engine returned HTTP {response.status}")
                status = await response.json()
            async with async_get_clientsession(self.hass).get(f"{self.url}/api/assets", timeout=5) as response:
                if response.status == 200:
                    status["assets"] = (await response.json()).get("assets", [])
            async with async_get_clientsession(self.hass).get(f"{self.url}/api/hymns", timeout=5) as response:
                if response.status == 200:
                    status["hymns"] = (await response.json()).get("hymns", [])
            async with async_get_clientsession(self.hass).get(f"{self.url}/api/liturgical/{date.today().isoformat()}", timeout=5) as response:
                if response.status == 200:
                    status["liturgical_day"] = (await response.json()).get("day")
            return status
        except Exception as err:
            raise UpdateFailed(f"Unable to reach Virtual Carillon: {err}") from err

    async def async_play(self, asset: str, output: str | None = None):
        from homeassistant.helpers.aiohttp_client import async_get_clientsession
        async with async_get_clientsession(self.hass).post(f"{self.url}/api/play", json={"asset": asset, "output": output}, timeout=10) as response:
            if response.status >= 300:
                raise RuntimeError(await response.text())
        await self.async_request_refresh()

    async def async_stop(self):
        from homeassistant.helpers.aiohttp_client import async_get_clientsession
        async with async_get_clientsession(self.hass).post(f"{self.url}/api/stop", timeout=5) as response:
            if response.status >= 300:
                raise RuntimeError(await response.text())

    async def async_select_hymn(self, strategy: str = "automatic", hymn: str | None = None, category: str | None = None, feast: str | None = None, office: str | None = None, seed: str | int | None = None, output: str | None = None):
        from homeassistant.helpers.aiohttp_client import async_get_clientsession
        payload = {"strategy": strategy if strategy != "automatic" else None, "fixedAssetId": hymn, "categoryIds": [category] if category else None, "feastIds": [feast] if feast else None, "officeIds": [office] if office else None, "seed": seed}
        payload = {key: value for key, value in payload.items() if value is not None}
        async with async_get_clientsession(self.hass).post(f"{self.url}/api/hymns/select", json=payload, timeout=10) as response:
            if response.status >= 300:
                raise RuntimeError(await response.text())
            result = await response.json()
        asset = ((result.get("selection") or {}).get("asset") or {}).get("id")
        if asset:
            await self.async_play(asset, output)
