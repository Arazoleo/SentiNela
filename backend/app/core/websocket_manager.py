import json
from typing import Dict, Set
from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        # session_id -> set of websockets
        self.active: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, session_id: str):
        await websocket.accept()
        if session_id not in self.active:
            self.active[session_id] = set()
        self.active[session_id].add(websocket)

    def disconnect(self, websocket: WebSocket, session_id: str):
        if session_id in self.active:
            self.active[session_id].discard(websocket)
            if not self.active[session_id]:
                del self.active[session_id]

    async def send(self, session_id: str, data: dict):
        if session_id not in self.active:
            return
        dead = set()
        for ws in self.active[session_id]:
            try:
                await ws.send_text(json.dumps(data, ensure_ascii=False))
            except Exception:
                dead.add(ws)
        for ws in dead:
            self.active[session_id].discard(ws)

    async def broadcast(self, data: dict):
        for session_id in list(self.active.keys()):
            await self.send(session_id, data)


manager = ConnectionManager()

# Manager separado para clínicas (alertas epidemiológicos)
# Chave: clinic_id (str UUID)
clinic_manager = ConnectionManager()
