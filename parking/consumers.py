import json
from channels.generic.websocket import AsyncWebsocketConsumer
from .models import ParkingLot
from .serializers import ParkingLotSerializer

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

    async def send_lot_data(self, event):
        # send parking lot data to client
        from asgiref.sync import sync_to_async
        lots = await sync_to_async(list)(ParkingLot.objects.all())
        serializer = ParkingLotSerializer(lots, many=True)
        await self.send(text_data=json.dumps({
            'type': 'lot_update',
            'lots': serializer.data
        }))

    async def parking_update(self, event):
        # Send update to the frontend
        await self.send(text_data=json.dumps(event['data']))
    