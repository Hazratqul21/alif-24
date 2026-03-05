from typing import Dict, List
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        # Maps olympiad_id to a list of active websocket connections
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, ws: WebSocket, olympiad_id: str):
        await ws.accept()
        if olympiad_id not in self.active_connections:
            self.active_connections[olympiad_id] = []
        self.active_connections[olympiad_id].append(ws)

    def disconnect(self, ws: WebSocket, olympiad_id: str):
        if olympiad_id in self.active_connections:
            if ws in self.active_connections[olympiad_id]:
                self.active_connections[olympiad_id].remove(ws)
            if not self.active_connections[olympiad_id]:
                del self.active_connections[olympiad_id]

    async def broadcast(self, olympiad_id: str, message: dict):
        if olympiad_id in self.active_connections:
            # Create a copy of the list to iterate over, in case connections drop mid-broadcast
            connections = list(self.active_connections[olympiad_id])
            for connection in connections:
                try:
                    await connection.send_json(message)
                except Exception:
                    # If sending fails, assume it's disconnected and remove it
                    self.disconnect(connection, olympiad_id)

manager = ConnectionManager()
