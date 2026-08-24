from __future__ import annotations

import asyncio
import logging
from datetime import datetime

from homeassistant.core import HomeAssistant
from homeassistant.helpers.event import async_track_time_change

from .coordinator import CarillonCoordinator

_LOGGER = logging.getLogger(__name__)
ACTION_GAP_SECONDS = 1.0


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
            actions = claim.get("actions", [])
            for action_index, action in enumerate(actions):
                wait_before = float(action.get("waitBeforeSeconds", 0))
                if wait_before > 0:
                    await asyncio.sleep(wait_before)
                media_players = [str(player) for player in action.get("mediaPlayers", [])]
                new_players = [player for player in media_players if player not in queued_players]
                existing_players = [player for player in media_players if player in queued_players]
                if existing_players:
                    await self._wait_for_players(existing_players, actions[action_index - 1])
                if not action.get("selectionAudit"):
                    _LOGGER.info("Now playing: %s", action.get("asset"))
                if new_players:
                    await self.coordinator.async_play(
                        action["asset"], new_players, refresh=False, volume=action.get("volume")
                    )
                if existing_players:
                    await self.coordinator.async_play(
                        action["asset"],
                        existing_players,
                        refresh=False,
                        volume=action.get("volume"),
                    )
                queued_players.update(media_players)
                wait_after = float(action.get("waitAfterSeconds", 0))
                if wait_after > 0:
                    await asyncio.sleep(wait_after)
                elif action_index < len(actions) - 1:
                    await asyncio.sleep(ACTION_GAP_SECONDS)
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

    async def _wait_for_players(self, players: list[str], action: dict) -> None:
        """Wait for non-queueing players before issuing the next play command.

        Sending another play_media call to VLC (and similar simple players)
        can replace the current item even when Home Assistant accepts an
        enqueue argument. Use the player's reported duration when available;
        the schedule payload supplies a duration for generated assets as a
        fallback.
        """
        fallback = float(action.get("durationSeconds") or 0)
        deadline = asyncio.get_running_loop().time() + fallback + 5.0 if fallback else None
        started = asyncio.get_running_loop().time()
        observed_playback = False
        while deadline is None or asyncio.get_running_loop().time() < deadline:
            active = False
            for player in players:
                state = self.hass.states.get(player)
                if state is None:
                    continue
                if state.state in ("playing", "paused"):
                    duration = state.attributes.get("media_duration")
                    position = state.attributes.get("media_position")
                    if duration is None or position is None or float(duration) - float(position) > 0.2:
                        active = True
            if active:
                observed_playback = True
            if not active and observed_playback:
                return
            # Some players update their state only after they have opened the
            # URL. Give that initial request time to start before sending the
            # next play_media command.
            if not active and asyncio.get_running_loop().time() - started > 3.0 and not fallback:
                return
            await asyncio.sleep(0.25)
        if fallback and deadline is not None:
            await asyncio.sleep(max(0.0, fallback - (asyncio.get_running_loop().time() - started)))
