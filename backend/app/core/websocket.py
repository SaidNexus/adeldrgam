from typing import Dict, List
from fastapi import WebSocket
import json

class ConnectionManager:
    def __init__(self):
        # Maps user_id to a list of active WebSocket connections
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)

    def disconnect(self, user_id: str, websocket: WebSocket):
        if user_id in self.active_connections:
            self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def send_personal_message(self, message: dict, user_id: str):
        if user_id in self.active_connections:
            # Create a copy of the list to avoid issues with disconnection during iteration
            for connection in self.active_connections[user_id][:]:
                try:
                    await connection.send_json(message)
                except Exception:
                    # Stale connection, manager will clean up eventually but we handle it here
                    self.disconnect(user_id, connection)

    async def broadcast(self, message: dict):
        for user_id in self.active_connections:
            await self.send_personal_message(message, user_id)

manager = ConnectionManager()
