from __future__ import annotations

from urllib.parse import quote, unquote

from aiohttp import web
from homeassistant.components.http import HomeAssistantView
from homeassistant.components.media_player import BrowseError, MediaClass
from homeassistant.components.media_source import (
    BrowseMediaSource,
    MediaSource,
    MediaSourceItem,
    PlayMedia,
    Unresolvable,
)
from homeassistant.core import HomeAssistant
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .const import DOMAIN

AUDIO_URL = "/api/virtual_carillon/audio/{asset}"


def _coordinator(hass: HomeAssistant):
    return next(iter(hass.data.get(DOMAIN, {}).values()), None)


class VirtualCarillonAudioView(HomeAssistantView):
    """Proxy rendered audio through Home Assistant for its media players."""

    url = AUDIO_URL
    name = "api:virtual_carillon:audio"
    requires_auth = False

    def __init__(self, hass: HomeAssistant):
        self.hass = hass

    async def get(self, request: web.Request, asset: str) -> web.StreamResponse:
        coordinator = _coordinator(self.hass)
        if coordinator is None:
            return web.Response(status=503, text="Virtual Carillon is not configured")

        upstream_url = f"{coordinator.url}/api/assets/{quote(asset, safe='')}/audio"
        try:
            headers = dict(coordinator.headers)
            if request.headers.get("Range"):
                headers["Range"] = request.headers["Range"]
            async with async_get_clientsession(self.hass).get(
                upstream_url,
                headers=headers,
                timeout=60,
            ) as upstream:
                if upstream.status not in (200, 206):
                    return web.Response(status=upstream.status, text=await upstream.text())

                response_headers = {
                    "Content-Type": upstream.headers.get("Content-Type", "audio/wav"),
                    "Cache-Control": "public, max-age=3600",
                }
                for header in ("Content-Length", "Content-Range", "Accept-Ranges"):
                    if upstream.headers.get(header):
                        response_headers[header] = upstream.headers[header]
                response = web.StreamResponse(
                    status=upstream.status,
                    headers=response_headers,
                )
                await response.prepare(request)
                async for chunk in upstream.content.iter_chunked(64 * 1024):
                    await response.write(chunk)
                await response.write_eof()
                return response
        except Exception as err:
            return web.Response(status=502, text=f"Unable to fetch rendered audio: {err}")


class VirtualCarillonMediaSource(MediaSource):
    """Expose the engine's rendered assets in Home Assistant's media browser."""

    name = "Virtual Carillon"

    def __init__(self, hass: HomeAssistant):
        super().__init__(DOMAIN)
        self.hass = hass

    async def async_browse_media(self, item: MediaSourceItem) -> BrowseMediaSource:
        coordinator = _coordinator(self.hass)
        if coordinator is None:
            raise BrowseError("Virtual Carillon is not configured")

        identifier = item.identifier or ""
        if not identifier:
            return BrowseMediaSource(
                domain=DOMAIN,
                identifier=None,
                media_class=MediaClass.APP,
                media_content_type="",
                title="Virtual Carillon",
                can_play=False,
                can_expand=True,
                children=[
                    self._directory("assets", "All assets"),
                    self._directory("hymns", "Hymns"),
                ],
            )

        if identifier == "assets":
            assets = (coordinator.data or {}).get("assets", [])
        elif identifier == "hymns":
            return self._hymn_root((coordinator.data or {}).get("hymns", []))
        elif identifier == "hymns/all":
            assets = (coordinator.data or {}).get("hymns", [])
        elif identifier == "hymns/season":
            seasons = sorted({season for hymn in (coordinator.data or {}).get("hymns", []) for season in self._asset_seasons(hymn)})
            return BrowseMediaSource(
                domain=DOMAIN,
                identifier=identifier,
                media_class=MediaClass.DIRECTORY,
                media_content_type="",
                title="By season",
                can_play=False,
                can_expand=True,
                children_media_class=MediaClass.DIRECTORY,
                children=[
                    self._directory(
                        f"hymns/season/{quote(season, safe='')}",
                        self._season_title(season),
                        children_media_class=MediaClass.MUSIC,
                    )
                    for season in seasons
                ],
            )
        elif identifier.startswith("hymns/season/"):
            season = unquote(identifier.removeprefix("hymns/season/"))
            assets = [
                asset
                for asset in (coordinator.data or {}).get("hymns", [])
                if self._asset_seasons(asset) and season in self._asset_seasons(asset)
            ]
        else:
            raise BrowseError(f"Unknown Virtual Carillon media path: {identifier}")

        children = [self._asset_item(asset) for asset in assets if isinstance(asset, dict) and asset.get("id")]
        return BrowseMediaSource(
            domain=DOMAIN,
            identifier=identifier,
            media_class=MediaClass.DIRECTORY,
            media_content_type="",
            title="Hymns" if identifier == "hymns" else "All assets",
            can_play=False,
            can_expand=True,
            children_media_class=MediaClass.MUSIC,
            children=children,
        )

    def _hymn_root(self, hymns: list[dict]) -> BrowseMediaSource:
        children = [self._directory("hymns/all", "All hymns")]
        children.append(self._directory("hymns/season", "By season", children_media_class=MediaClass.DIRECTORY))
        return BrowseMediaSource(
            domain=DOMAIN,
            identifier="hymns",
            media_class=MediaClass.DIRECTORY,
            media_content_type="",
            title="Hymns",
            can_play=False,
            can_expand=True,
            children_media_class=MediaClass.DIRECTORY,
            children=children,
        )

    @staticmethod
    def _asset_seasons(asset: dict) -> set[str]:
        tags = asset.get("liturgicalTags") or {}
        seasons = tags.get("seasons") or asset.get("liturgicalSeasons") or []
        return {str(season).strip().lower().replace(" ", "-") for season in seasons if str(season).strip()}

    @staticmethod
    def _season_title(season: str) -> str:
        return season.replace("-", " ").title()

    async def async_resolve_media(self, item: MediaSourceItem) -> PlayMedia:
        coordinator = _coordinator(self.hass)
        identifier = item.identifier or ""
        if coordinator is None or not identifier.startswith("asset/"):
            raise Unresolvable("Unknown Virtual Carillon media item")

        asset_id = unquote(identifier.removeprefix("asset/"))
        assets = [
            *(coordinator.data or {}).get("assets", []),
            *(coordinator.data or {}).get("hymns", []),
        ]
        if not any(isinstance(asset, dict) and asset.get("id") == asset_id for asset in assets):
            raise Unresolvable(f"Unknown Virtual Carillon asset: {asset_id}")

        return PlayMedia(AUDIO_URL.format(asset=quote(asset_id, safe="")), "audio/wav")

    @staticmethod
    def _directory(
        identifier: str,
        title: str,
        *,
        children_media_class: MediaClass = MediaClass.MUSIC,
    ) -> BrowseMediaSource:
        return BrowseMediaSource(
            domain=DOMAIN,
            identifier=identifier,
            media_class=MediaClass.DIRECTORY,
            media_content_type="",
            title=title,
            can_play=False,
            can_expand=True,
            children_media_class=MediaClass.MUSIC,
        )

    @staticmethod
    def _asset_item(asset: dict) -> BrowseMediaSource:
        asset_id = str(asset["id"])
        return BrowseMediaSource(
            domain=DOMAIN,
            identifier=f"asset/{quote(asset_id, safe='')}",
            media_class=MediaClass.MUSIC,
            media_content_type="audio/wav",
            title=str(asset.get("name") or asset_id),
            can_play=True,
            can_expand=False,
        )


async def async_get_media_source(hass: HomeAssistant) -> VirtualCarillonMediaSource:
    return VirtualCarillonMediaSource(hass)
