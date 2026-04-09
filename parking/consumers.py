import json
from channels.generic.websocket import AsyncWebsocketConsumer
from .models import parking_lot
from .serializers import parking_lot_serializer

class parking_map_consumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope['user']

        # Join the map group
        await self.channel_layer.group_add(
            'parking_map',
            self.channel_name
        )

        if self.user.is_authenticated:
            await self.channel_layer.group_add(
                f'notifications_{self.user.userID}',
                self.channel_name
            )

        await self.accept()

        from asgiref.sync import sync_to_async
        lots = await sync_to_async(list)(parking_lot.objects.all())
        serializer = parking_lot_serializer(lots, many=True)
        await self.send(text_data=json.dumps({
            'type': 'lot_update',
            'lots': serializer.data
        }))

    async def disconnect(self, close_code):
        # Leave the map group
        await self.channel_layer.group_discard(
            'parking_map',
            self.channel_name
        )

        if self.user.is_authenticated:
            await self.channel_layer.group_add(
                f'notifications_{self.user.userID}',
                self.channel_name
            )

    async def receive(self, text_data):
        # Handle messages from the frontend if needed
        pass

    async def parking_update(self, event):
        # Send update to the frontend
        await self.send(text_data=json.dumps(event['data']))
    
    async def availability_notification(self, event):
        await self.send(text_data=json.dumps(event['data']))
    

