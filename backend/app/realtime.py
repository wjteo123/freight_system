from typing import List
import asyncio

from fastapi.encoders import jsonable_encoder


class SSEManager:
    """Lightweight manager to fan out shipment events over SSE."""

    def __init__(self):
        self.connections: List[asyncio.Queue] = []

    async def connect(self) -> asyncio.Queue:
        queue: asyncio.Queue = asyncio.Queue()
        self.connections.append(queue)
        return queue

    def disconnect(self, queue: asyncio.Queue):
        if queue in self.connections:
            self.connections.remove(queue)

    async def broadcast(self, message):
        stale: List[asyncio.Queue] = []
        for queue in self.connections:
            try:
                await queue.put(message)
            except Exception:
                stale.append(queue)
        for queue in stale:
            self.disconnect(queue)


shipments_manager = SSEManager()


def serialize_shipment(shipment):
    return jsonable_encoder(shipment)
