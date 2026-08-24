from __future__ import annotations

import asyncio
import logging
from datetime import datetime

from homeassistant.core import HomeAssistant
from homeassistant.helpers.event import async_track_time_change

from .coordinator import CarillonCoordinator

_LOGGER = logging.getLogger(__name__)


class ScheduleRunner:
    """Claim server-owned schedule events and route them to HA players."""

    def __init__(self, hass: HomeAssistant, coordinator: CarillonCoordinator):
        self.hass = hass
        self.coordinator = coordinator
        self._unsubscribe = None
        self._task: asyncio.Task | None = None

    async def async_setup(self) -> None:
        self._unsubscribe = async_track_time_change(self.hass, self._async_tick, second=5)

    async def async_unload(self) -> None:
        if self._unsubscribe:
            self._unsubscribe()
            self._unsubscribe = None
        if self._task and not self._task.done():
            self._task.cancel()
            await asyncio.gather(self._task, return_exceptions=True)
        self._task = None

    async def _async_tick(self, now: datetime) -> None:
        if self._task and not self._task.done():
            return
        self._task = self.hass.async_create_task(self._run(now))

    async def _run(self, now: datetime) -> None:
        try:
            claim = await self.coordinator.async_claim_schedule(now)
            if not claim.get("claimed"):
                return
            slot_key = claim["slotKey"]
            queued_players: set[str] = set()
            for action in claim.get("actions", []):
                wait_before = float(action.get("waitBeforeSeconds", 0))
                if wait_before > 0:
                    await asyncio.sleep(wait_before)
                media_players = [str(player) for player in action.get("mediaPlayers", [])]
                new_players = [player for player in media_players if player not in queued_players]
                existing_players = [player for player in media_players if player in queued_players]
                if new_players:
                    await self.coordinator.async_play(action["asset"], new_players, refresh=False)
                if existing_players:
                    await self.coordinator.async_play(
                        action["asset"],
                        existing_players,
                        refresh=False,
                        enqueue="add",
                    )
                queued_players.update(media_players)
                wait_after = float(action.get("waitAfterSeconds", 0))
                if wait_after > 0:
                    await asyncio.sleep(wait_after)
            await self.coordinator.async_complete_schedule(slot_key, "completed")
        except asyncio.CancelledError:
            raise
        except Exception as err:
            _LOGGER.error("Virtual Carillon schedule playback failed: %s", err)
            if "slot_key" in locals():
                try:
                    await self.coordinator.async_complete_schedule(slot_key, "failed", str(err))
                except Exception as complete_err:  # pragma: no cover - defensive network failure path
                    _LOGGER.debug("Unable to mark schedule event failed: %s", complete_err)
