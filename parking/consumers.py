import json
from channels.generic.websocket import AsyncWebsocketConsumer

class ParkingMapConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # Join the map group
        await self.channel_layer.group_add(
            'parking_map',
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        # Leave the map group
        await self.channel_layer.group_discard(
            'parking_map',
            self.channel_name
        )

    async def receive(self, text_data):
        # Handle messages from the frontend if needed
        pass

    async def parking_update(self, event):
        # Send update to the frontend
        await self.send(text_data=json.dumps(event['data']))