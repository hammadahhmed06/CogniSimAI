# services/events/event_bus.py
"""
In-process async event bus.

Uses asyncio to dispatch events to registered handlers in the background.
Designed for FYP-scale workloads; can be swapped for Redis/RabbitMQ later.
"""

import asyncio
import logging
from collections import defaultdict
from typing import Any, Callable, Coroutine, Dict, List, Optional

from .event_types import EventType

logger = logging.getLogger("cognisim_ai")

HandlerFunc = Callable[..., Coroutine[Any, Any, None]]


class EventBus:
    """
    Simple publish/subscribe event bus.

    Handlers are registered for specific event types and are invoked
    asynchronously when an event is emitted.  Errors in one handler
    do not prevent others from running.
    """

    def __init__(self):
        self._handlers: Dict[EventType, List[HandlerFunc]] = defaultdict(list)
        self._global_handlers: List[HandlerFunc] = []
        logger.info("EventBus initialised")

    # ── Registration ─────────────────────────────────────────────

    def on(self, event_type: EventType):
        """Decorator to register a handler for a specific event type."""
        def decorator(func: HandlerFunc) -> HandlerFunc:
            self._handlers[event_type].append(func)
            logger.info(f"Handler registered for {event_type.value}: {func.__name__}")
            return func
        return decorator

    def register(self, event_type: EventType, handler: HandlerFunc):
        """Programmatically register a handler."""
        self._handlers[event_type].append(handler)
        logger.info(f"Handler registered for {event_type.value}: {handler.__name__}")

    def on_all(self, handler: HandlerFunc):
        """Register a handler that fires for every event (e.g. audit logging)."""
        self._global_handlers.append(handler)
        logger.info(f"Global handler registered: {handler.__name__}")

    # ── Emission ─────────────────────────────────────────────────

    def emit(self, event_type: EventType, payload: Any = None):
        """
        Fire-and-forget: schedule all handlers for *event_type* as
        background coroutines.  If no running event loop exists
        (e.g. during testing), falls back synchronously.
        """
        handlers = list(self._handlers.get(event_type, []))
        handlers.extend(self._global_handlers)

        if not handlers:
            logger.debug(f"No handlers for event {event_type.value}")
            return

        logger.info(
            f"Emitting {event_type.value} → {len(handlers)} handler(s)"
        )

        try:
            loop = asyncio.get_running_loop()
            # Schedule each handler in the background
            for handler in handlers:
                loop.create_task(self._safe_call(handler, event_type, payload))
        except RuntimeError:
            # No running loop — run synchronously (tests, scripts)
            for handler in handlers:
                try:
                    asyncio.run(handler(event_type, payload))
                except Exception as e:
                    logger.error(
                        f"Handler {handler.__name__} failed for {event_type.value}: {e}"
                    )

    async def emit_async(self, event_type: EventType, payload: Any = None):
        """
        Await all handlers sequentially (useful when the caller wants
        to wait for completion, e.g. in tests).
        """
        handlers = list(self._handlers.get(event_type, []))
        handlers.extend(self._global_handlers)

        for handler in handlers:
            await self._safe_call(handler, event_type, payload)

    # ── Internal ─────────────────────────────────────────────────

    async def _safe_call(
        self,
        handler: HandlerFunc,
        event_type: EventType,
        payload: Any,
    ):
        """Call a handler with error isolation."""
        try:
            await handler(event_type, payload)
        except Exception as e:
            logger.error(
                f"Handler {handler.__name__} failed for {event_type.value}: {e}",
                exc_info=True,
            )

    # ── Introspection ────────────────────────────────────────────

    def handler_count(self, event_type: Optional[EventType] = None) -> int:
        """Return the number of registered handlers."""
        if event_type:
            return len(self._handlers.get(event_type, []))
        return sum(len(h) for h in self._handlers.values()) + len(self._global_handlers)


# Singleton instance – imported by the rest of the application
event_bus = EventBus()
