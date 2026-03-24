from django.urls import path
from . import consumers

websocket_urlpatterns = [
    path('ws/map/', consumers.ParkingMapConsumer.as_asgi()),
]